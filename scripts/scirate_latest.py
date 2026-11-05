#!/usr/bin/env python3
"""SciRate-style latest-paper ingestion for static Axiovo.

Harvests official arXiv Atom first-publication timestamps in paginated
all-category date windows, then writes a bounded recent announcements index.
Unlike raw OAI-PMH 'created' dates, Atom 'published' carries timestamp
precision. New/replacement classification comes from RSS when available.
This does NOT claim complete indexing if any API query fails.
"""
from __future__ import annotations
import datetime as dt
import json
import os
from pathlib import Path
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

try:
    from .sync import parse_atom
except ImportError:
    from sync import parse_atom

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "docs" / "data" / "announcements.json"
ARCHIVE = ROOT / "docs" / "data" / "arxiv-days"
URL = "https://export.arxiv.org/api/query"
EASTERN = ZoneInfo("America/New_York")
UTC = dt.timezone.utc
ATOM = "{http://www.w3.org/2005/Atom}"
SEARCH = "{http://a9.com/-/spec/opensearch/1.1/}"
PAGE = 1000
MAX_PAGES = 12


def paper_announcement_day(published):
    """arXiv v1 Atom publication timestamps, converted into US Eastern date."""
    try:
        t = dt.datetime.fromisoformat(str(published).replace("Z", "+00:00"))
        if t.tzinfo is None:
            return None
        return t.astimezone(EASTERN).date().isoformat()
    except (ValueError, TypeError):
        return None


def fetch_page(fromday, today, start):
    q = {
        "search_query": "submittedDate:[" + fromday.strftime("%Y%m%d") +
             "0000 TO " + today.strftime("%Y%m%d") + "2359]",
        "start": start, "max_results": PAGE,
        "sortBy": "submittedDate", "sortOrder": "descending"
    }
    uri = URL + "?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(uri, headers={
        "User-Agent": os.getenv("ARXIV_USER_AGENT",
           "Axiovo/0.9 (https://github.com/pritam-roy-99/axiovo; latest paper metadata)"),
        "Accept": "application/atom+xml"
    })
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=80) as response:
                xml = response.read()
            root = ET.fromstring(xml)
            total = root.findtext(SEARCH + "totalResults")
            if total is None or not total.isdecimal():
                raise ValueError("Missing arXiv opensearch totalResults")
            return parse_atom(xml), int(total)
        except (OSError, ET.ParseError, ValueError):
            if attempt == 2:
                raise
            time.sleep(10 * (attempt + 1))
    raise RuntimeError("Atom unavailable")


def harvest(now=None):
    now = now or dt.datetime.now(UTC)
    start_day = (now - dt.timedelta(days=3)).date()
    end_day = now.date()
    found = {}
    total = None
    position = 0
    complete = False
    for page in range(MAX_PAGES):
        records, advertised = fetch_page(start_day, end_day, position)
        if total is None:
            total = advertised
        elif total != advertised:
            raise RuntimeError("arXiv results changed during harvest; cannot certify completeness")
        for p in records:
            if not p.get("id") or not p.get("title"):
                continue
            prior = found.get(p["id"])
            if not prior or p.get("version", 1) >= prior.get("version", 1):
                found[p["id"]] = p
        position += len(records)
        if position >= total:
            complete = True
            break
        if not records:
            raise RuntimeError("Empty Atom page before totalResults reached")
        time.sleep(3.5)
    if not found:
        raise RuntimeError("No recent arXiv Atom papers")
    by_date = {}
    for p in found.values():
        day = paper_announcement_day(p.get("published"))
        if not day:
            continue
        by_date.setdefault(day, []).append(p)
    if not by_date:
        raise RuntimeError("No arXiv publication timestamps")
    recent = sorted(by_date)[-1]
    # The announcement occurs at 20:00 US Eastern, normally the next calendar day in India.
    eastern_day = dt.date.fromisoformat(recent)
    eastern_release = dt.datetime.combine(eastern_day, dt.time(20, 0), EASTERN)
    india_day = eastern_release.astimezone(ZoneInfo("Asia/Kolkata")).date().isoformat()
    papers = []
    for p in sorted(by_date[recent], key=lambda x: x.get("published", ""), reverse=True):
        papers.append({
            "id": p["id"], "title": p["title"], "abstract": p.get("abstract", ""),
            "authors": p.get("authors", []),
            "categories": p.get("categories", []),
            "primary_category": p.get("primary_category", ""),
            "published": p.get("published"),
            "updated": p.get("updated"),
            "version": p.get("version", 1),
            "link": "https://arxiv.org/abs/" + p["id"],
            "announcement_date": recent,
            "display_date_ist": india_day,
            "announce_type": "new",
            "metadata_source": "arXiv Atom first publication"
        })
    return {
        "source": URL, "date_type": "announcement",
        "announcement_date": recent,
        "display_date_ist": india_day,
        "checked_at": now.isoformat(),
        "complete": complete,
        "archive_feeds_attempted": 0,
        "archive_feeds_with_records": 0,
        "failed_archives": [],
        "count": len(papers), "papers": papers,
        "source_total_recent_window": total,
        "records_paginated": position,
        "source_window_complete": complete,
        "note": "All-category paginated arXiv Atom search. Announcement day is derived from first-publication timestamp in America/New_York; updates to older papers are not listed as new. If source_window_complete is false, coverage is partial."
    }


def main():
    payload = harvest()
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=TARGET.parent, encoding="utf8", delete=False) as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
        temporary = f.name
    os.replace(temporary, TARGET)
    print("Latest arXiv Atom", payload["announcement_date"], payload["count"],
          "papers, source complete=", payload["complete"])


if __name__ == "__main__":
    main()
