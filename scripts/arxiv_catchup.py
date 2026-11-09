#!/usr/bin/env python3
"""Read arXiv's official early catch-up listings before RSS is refreshed.

The public /catchup/<archive>/<YYYY-MM-DD> pages may be visible after the
20:00 US Eastern release, several hours before midnight-Eastern RSS/Atom.
This is an *early/provisional* snapshot, NEVER a claim of RSS completeness.
No article is invented: ID, title and source page must appear in official HTML.
"""
from __future__ import annotations
import datetime as dt
import html
import json
import os
from pathlib import Path
import re
import tempfile
import time
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo

from .arxiv_announcements import ARCHIVES, ID

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "docs/data/announcements.json"
ET = ZoneInfo("America/New_York")
ABS = re.compile(r"""(?i)href\s*=\s*["'](?:https?://(?:www\.)?arxiv\.org)?/abs/([^"'?#\s<>]+)""")
PAIR = re.compile(r"(?is)<dt\b[^>]*>(.*?)</dt>\s*<dd\b[^>]*>(.*?)</dd>")
HEADER = re.compile(r"(?is)<h[234]\b[^>]*>(.*?)</h[234]>")
PIECE = re.compile(r"(?is)(<h[234]\b[^>]*>.*?</h[234]>|<dt\b[^>]*>.*?</dt>\s*<dd\b[^>]*>.*?</dd>)")
BLOCK = re.compile(r"(?is)<(?:div|p)\b[^>]*class\s*=\s*['\"][^'\"]*\b%s\b[^'\"]*['\"][^>]*>(.*?)</(?:div|p)>")
TAGS = re.compile(r"(?s)<[^>]*>")
SPACE = re.compile(r"\s+")
ANNOUNCE_TYPES = {"new", "cross", "replace", "replace-cross"}


def text(value):
    return SPACE.sub(" ", html.unescape(TAGS.sub(" ", value or ""))).strip()


def block(raw, name):
    match = re.search(BLOCK.pattern % re.escape(name), raw, re.I | re.S)
    return text(match.group(1)) if match else ""


def target_announcement_date(now=None):
    """The current or latest published arXiv release, named by catch-up date."""
    here = (now or dt.datetime.now(dt.timezone.utc)).astimezone(ET)
    day = here.date()
    if here.weekday() in (6, 0, 1, 2, 3) and here.hour >= 20:
        return (day + dt.timedelta(days=1)).isoformat()
    # During the day Monday-Friday, the release named by the current date
    # is already available from the previous Eastern evening.
    if here.weekday() in (0, 1, 2, 3, 4):
        return day.isoformat()
    # Weekend with no new release.
    if here.weekday() == 5:
        return (day - dt.timedelta(days=1)).isoformat()
    return (day - dt.timedelta(days=2)).isoformat()


def parse_listing(raw, archive, date):
    """Parse official list dt/dd records, strictly requiring verified IDs/titles.

    The source itself decides whether an article is new, cross-listed or a
    replacement. Missing sections remain 'unspecified', not guessed.
    """
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", "replace")
    if not re.search(r"(?i)<(?:html|main|dl)\b", raw):
        raise ValueError("Not an arXiv listing document")
    records = {}
    section = "unspecified"
    listed = 0
    for item in PIECE.finditer(raw):
        snippet = item.group(0)
        if HEADER.fullmatch(snippet):
            heading = text(snippet).lower()
            if "new submission" in heading:
                section = "new"
            elif "cross-list" in heading or "cross list" in heading:
                section = "cross"
            elif "replacement" in heading or "updated" in heading:
                section = "replace"
            continue
        match = PAIR.fullmatch(snippet)
        if not match:
            continue
        listed += 1
        dtpart, ddpart = match.groups()
        link = ABS.search(dtpart)
        if not link:
            continue
        identifier = ID.fullmatch(link.group(1).strip())
        if not identifier:
            continue
        revision = identifier.group(0)
        base = re.sub(r"v\d+$", "", revision)
        version = re.search(r"v(\d+)$", revision)
        title = re.sub(r"(?i)^title:\s*", "", block(ddpart, "list-title")).strip()
        if not title or len(title) > 1500:
            continue
        author_text = re.sub(r"(?i)^authors?:\s*", "", block(ddpart, "list-authors"))
        authors = [name.strip() for name in author_text.split(",") if name.strip()]
        abstract = block(ddpart, "mathjax") or block(ddpart, "list-abstract")
        result = {
            "id": base, "version": int(version.group(1)) if version else 1,
            "title": title, "authors": authors, "abstract": abstract[:9000],
            "categories": [archive], "primary_category": archive,
            "link": "https://arxiv.org/abs/" + revision,
            "announcement_date": date, "announce_type": section,
            "metadata_source": "official arXiv catch-up listing"
        }
        prior = records.get(base)
        if not prior or result["version"] >= prior["version"]:
            records[base] = result
    if listed == 0 or not records or len(records) < listed * 0.75:
        raise ValueError(f"Unusable {archive} catch-up HTML: {len(records)}/{listed} parsed")
    return list(records.values()), listed


def fetch_category(archive, date):
    uri = f"https://arxiv.org/catchup/{archive}/{date}?abs=True&show=2000"
    request = urllib.request.Request(uri, headers={
        "User-Agent": os.getenv("ARXIV_USER_AGENT",
            "Axiovo/0.9 (https://github.com/pritam-roy-99/axiovo; pre-RSS catch-up)"),
        "Accept": "text/html"
    })
    for attempt in range(2):
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                page = response.read()
            return parse_listing(page, archive, date)
        except (OSError, ValueError, urllib.error.HTTPError):
            if attempt:
                raise
            time.sleep(4)
    raise RuntimeError("Catch-up page unavailable")


def harvest(now=None, fetch=fetch_category, archives=ARCHIVES):
    day = target_announcement_date(now)
    merged = {}
    errors = []
    totals = {}
    for i, archive in enumerate(archives):
        try:
            papers, listed = fetch(archive, day)
            totals[archive] = listed
            for p in papers:
                id_ = p["id"]
                if id_ not in merged:
                    merged[id_] = p.copy()
                else:
                    previous = merged[id_]
                    previous["categories"] = sorted(set(previous["categories"] + p["categories"]))
                    if p["version"] > previous["version"]:
                        previous.update({k:v for k,v in p.items() if k!="categories"})
        except (OSError, ValueError, RuntimeError) as exc:
            errors.append(archive + ": " + str(exc)[:140])
        if i < len(archives)-1:
            time.sleep(3.2)
    if not merged:
        raise RuntimeError("No official catch-up papers; preserving previous announcement")
    papers = sorted(merged.values(), key=lambda p:p["id"], reverse=True)
    return {
        "source": "https://arxiv.org/catchup/",
        "date_type": "announcement", "announcement_date": day,
        "checked_at": (now or dt.datetime.now(dt.timezone.utc)).isoformat(),
        "complete": False,  # Even 20 listed categories are provisional until RSS.
        "early_release": True,
        "archive_feeds_attempted": len(archives),
        "archive_feeds_with_records": len(totals),
        "failed_archives": errors,
        "catchup_listed_counts": totals,
        "count": len(papers), "papers": papers,
        "note": "Official early catch-up listing before RSS midnight Eastern; provisional, not a complete RSS census."
    }


def main():
    payload = harvest()
    # Do not supersede a fully verified same-day RSS result or a newer day.
    if TARGET.is_file():
        try:
            old = json.loads(TARGET.read_text(encoding="utf-8"))
            prev = str(old.get("announcement_date") or "")
            if prev > payload["announcement_date"] or (prev == payload["announcement_date"] and old.get("complete")):
                print("Retaining newer or complete official RSS batch", prev)
                return
        except (ValueError, OSError):
            pass
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=TARGET.parent, encoding="utf-8", delete=False) as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
        filename = f.name
    os.replace(filename, TARGET)
    print("Early official catch-up", payload["announcement_date"], payload["count"],
          "papers, categories:",payload["archive_feeds_with_records"],
          "of",payload["archive_feeds_attempted"])


if __name__ == "__main__":
    main()
