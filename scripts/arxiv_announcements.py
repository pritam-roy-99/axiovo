#!/usr/bin/env python3
"""Harvest the most recent arXiv announcement using arXiv's official RSS feeds.

RSS channel pubDate is the ANNOUNCEMENT date. The arXiv Atom 'published' field
is the FIRST-SUBMISSION date. Never substitute one for the other.
RSS is refreshed at midnight Eastern, several hours after announcements.
All archive-level feeds are fetched independently to stay below the official
2000-record cap on multi-category feed requests.
"""
from __future__ import annotations
import datetime as dt
import email.utils
import html
import json
import os
from pathlib import Path
import re
import tempfile
import time
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "docs" / "data" / "announcements.json"
ARCHIVES = ("astro-ph", "cond-mat", "cs", "econ", "eess", "gr-qc", "hep-ex",
            "hep-lat", "hep-ph", "hep-th", "math", "math-ph", "nlin",
            "nucl-ex", "nucl-th", "physics", "q-bio", "q-fin", "quant-ph", "stat")
ID = re.compile(r"(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Za-z]{2})?/\d{7})(?:v\d+)?", re.I)
TAG = re.compile(r"<[^>]*>")
SPACE = re.compile(r"\s+")


def clean(value):
    return SPACE.sub(" ", html.unescape(TAG.sub(" ", value or ""))).strip()


def parse_feed(raw: bytes, archive: str):
    root = ET.fromstring(raw)
    channel = root.find("channel")
    if root.tag != "rss" or channel is None:
        raise ValueError("Missing official arXiv RSS channel for " + archive)
    announced = channel.findtext("pubDate")
    if not announced:
        raise ValueError("Announcement pubDate absent for " + archive)
    stamp = email.utils.parsedate_to_datetime(announced)
    if stamp.tzinfo is None:
        raise ValueError("Timezone absent for " + archive)
    day = stamp.astimezone(ZoneInfo("America/New_York")).date().isoformat()
    records = []
    for item in channel.findall("item"):
        link = (item.findtext("link") or "").strip()
        match = ID.search(link)
        if not match:
            continue
        # RSS abstract links omit revisions; GUID/description carry the exact version.
        base_id = re.sub(r"v\d+$", "", match.group(0))
        declared = ID.search(item.findtext("guid") or "")
        if not declared:
            declared = ID.search(clean(item.findtext("description") or ""))
        if declared and re.sub(r"v\d+$", "", declared.group(0)) != base_id:
            raise ValueError("RSS identifier mismatch")
        versioned = declared.group(0) if declared else match.group(0)
        base = re.sub(r"v\d+$", "", versioned)
        version = re.search(r"v(\d+)$", versioned)
        description = clean(item.findtext("description") or "")
        typ = re.search(r"Announce Type:\s*([\w-]+)", description, re.I)
        announce_type = typ.group(1).lower() if typ else "unspecified"
        abstract = re.sub(r"^.*?\bAbstract:\s*", "", description, flags=re.I)
        if abstract == description:
            abstract = description
        title = clean(item.findtext("title") or "")
        if not title:
            continue
        creators = []
        categories = [archive]
        for element in item:
            local_name = element.tag.rsplit("}", 1)[-1]
            if local_name == "creator" and clean(element.text):
                creators.extend(x.strip() for x in clean(element.text).split(",") if x.strip())
            if local_name == "category" and clean(element.text):
                categories.append(clean(element.text))
            if local_name == "announce_type" and clean(element.text):
                announce_type = clean(element.text).lower()
        records.append({
            "id": base, "version": int(version.group(1)) if version else 1,
            "title": title, "abstract": abstract[:9000], "authors": creators,
            "categories": sorted(set(categories)), "primary_category": archive,
            "link": "https://arxiv.org/abs/" + versioned,
            "announcement_date": day, "announce_type": announce_type,
            "metadata_source": "official arXiv RSS"
        })
    return day, records


def get(archive):
    """Bound each RSS request so one slow category cannot exhaust the whole job.

    Rate-limited categories are left incomplete for the next scheduled run.
    Never treat a failed fetch as an empty, successfully checked category.
    """
    request = urllib.request.Request(
        "https://rss.arxiv.org/rss/" + archive,
        headers={"User-Agent": os.getenv("ARXIV_USER_AGENT",
            "Axiovo/0.8 (https://github.com/pritam-roy-99/axiovo; daily announcement feed)")})
    with urllib.request.urlopen(request, timeout=10) as response:
        return parse_feed(response.read(), archive)


def main():
    by_day = {}
    failed = []
    retrieved = 0
    feed_days = []
    capped = []
    for i, archive in enumerate(ARCHIVES):
        try:
            day, papers = get(archive)
            feed_days.append(day)
            if len(papers) >= 2000:
                capped.append(archive)
            if papers:
                retrieved += 1
                bucket = by_day.setdefault(day, {})
                for p in papers:
                    old = bucket.get(p["id"])
                    if old:
                        p["categories"] = sorted(set(old["categories"] + p["categories"]))
                        if old["version"] > p["version"]:
                            p["version"] = old["version"]
                        if len(old.get("abstract", "")) > len(p.get("abstract", "")):
                            p["abstract"] = old["abstract"]
                        if not p["authors"]:
                            p["authors"] = old["authors"]
                    bucket[p["id"]] = p
        except (OSError, ValueError, ET.ParseError, RuntimeError) as exc:
            failed.append(archive + ": " + str(exc)[:120])
        if i < len(ARCHIVES)-1:
            time.sleep(2.0)
    if not by_day:
        raise RuntimeError("No official RSS announcement records; preserving old snapshot")
    latest = sorted(by_day)[-1]
    papers = sorted(by_day[latest].values(), key=lambda p: p["id"], reverse=True)
    # Never mark complete when a category fails or source feeds disagree.
    complete = not failed and not capped and len(feed_days) == len(ARCHIVES) and set(feed_days) == {latest}
    payload = {
        "source": "https://rss.arxiv.org/rss/", "date_type": "announcement",
        "announcement_date": latest,
        "checked_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "complete": complete,
        "archive_feeds_attempted": len(ARCHIVES),
        "archive_feeds_with_records": retrieved,
        "failed_archives": failed,
        "capped_archives": capped,
        "other_announcement_days": sorted(d for d in by_day if d != latest),
        "count": len(papers), "papers": papers,
        "note": "arXiv RSS is published at midnight US Eastern, later than the initial announcement. Crosslists and replacements are included."
    }
    # An early catch-up batch can already describe tomorrow's official
    # announcement while RSS still describes the preceding release.
    # Never overwrite a newer batch or a complete same-day RSS snapshot.
    if TARGET.is_file():
        try:
            existing = json.loads(TARGET.read_text(encoding="utf-8"))
            prior_day = str(existing.get("announcement_date") or "")
            if prior_day > latest or (prior_day == latest and (
                (existing.get("complete") and not complete)
                or (not complete and len(existing.get("papers") or []) >= len(papers))
            )):
                print("RSS has not caught up; preserving existing", prior_day)
                return
        except (OSError, ValueError):
            pass
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=TARGET.parent, encoding="utf-8", delete=False) as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
        temp = Path(f.name)
    os.replace(temp, TARGET)
    print("Official RSS:", latest, len(papers), "unique papers; complete:", complete, "failures:", failed)


if __name__ == "__main__":
    main()
