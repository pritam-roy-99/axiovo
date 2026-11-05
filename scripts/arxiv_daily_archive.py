#!/usr/bin/env python3
"""Maintain complete, date-addressable arXiv submissions for covered UTC days.

The rolling feed is not a complete archive. For covered days this harvester
queries all arXiv categories using submittedDate, exhausts Atom pagination,
validates totalResults, and writes one durable JSON shard per first-submission
day. No shard is marked complete if any request, page, or count fails.

GitHub Pages is static: historical dates not harvested yet must be labelled
unavailable, rather than presenting a 150-item category snapshot as complete.
"""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path
import re
import tempfile
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

try:
    from .sync import parse_atom
except ImportError:
    from sync import parse_atom

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "docs" / "data" / "arxiv-days"
MANIFEST = ARCHIVE / "manifest.json"
BASE = "https://export.arxiv.org/api/query"
ATOM = "{http://www.w3.org/2005/Atom}"
OPENSEARCH = "{http://a9.com/-/spec/opensearch/1.1/}"
RECORDS_PER_PAGE = 1000
REQUEST_DELAY = 3.2
MAX_PAGES_PER_DAY = 20
BACKFILL_DAYS = 180


def validate_date(value: str) -> dt.date:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Expected YYYY-MM-DD")
    return dt.date.fromisoformat(value)


def query_url(day: dt.date, start: int, size: int = RECORDS_PER_PAGE) -> str:
    stamp = day.strftime("%Y%m%d")
    return BASE + "?" + urllib.parse.urlencode({
        "search_query": "submittedDate:[" + stamp + "0000 TO " + stamp + "2359]",
        "start": start, "max_results": size,
        "sortBy": "submittedDate", "sortOrder": "ascending",
    })


def parse_page(raw: bytes) -> tuple[list[dict], int]:
    root = ET.fromstring(raw)
    if root.tag != ATOM + "feed":
        raise ValueError("Not an arXiv Atom feed")
    count_text = root.findtext(OPENSEARCH + "totalResults")
    if count_text is None or not count_text.isdecimal():
        raise ValueError("No authoritative arXiv totalResults; refusing completeness claim")
    return parse_atom(raw), int(count_text)


def atomic_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=path.parent, encoding="utf-8", delete=False) as output:
        json.dump(payload, output, ensure_ascii=False, separators=(",", ":"))
        output.write("\n")
        temporary = output.name
    os.replace(temporary, path)


def fetch_day(day: dt.date, opener=None, sleep=time.sleep) -> dict:
    if opener is None:
        opener = urllib.request.urlopen
    by_id = {}
    total = None
    start = 0
    for page in range(MAX_PAGES_PER_DAY):
        req = urllib.request.Request(query_url(day, start), headers={
            "User-Agent": os.getenv("ARXIV_USER_AGENT",
                "Axiovo/0.7 (https://github.com/pritam-roy-99/axiovo; daily submittedDate metadata)"),
            "Accept": "application/atom+xml",
        })
        with opener(req, timeout=90) as response:
            chunk, advertised_total = parse_page(response.read())
        if total is None:
            total = advertised_total
            if total > MAX_PAGES_PER_DAY * RECORDS_PER_PAGE:
                raise RuntimeError("Day exceeds configured pagination safety limit")
        elif total != advertised_total:
            raise RuntimeError("arXiv result total changed during paging; retry later")
        for paper in chunk:
            # The primary date is arXiv's first-submitted date, never its OAI datestamp.
            if str(paper.get("published", ""))[:10] != day.isoformat():
                continue
            prior = by_id.get(paper["id"])
            if not prior or paper.get("version", 1) >= prior.get("version", 1):
                by_id[paper["id"]] = paper
        start += len(chunk)
        if start >= total:
            break
        if not chunk:
            raise RuntimeError("Empty page before arXiv totalResults reached")
        if page + 1 >= MAX_PAGES_PER_DAY:
            raise RuntimeError("Maximum pages reached before completing selected day")
        sleep(REQUEST_DELAY)
    if total is None or start != total or len(by_id) != total:
        raise RuntimeError(
            f"Unverified day: fetched {start}/{total} records, {len(by_id)} unique matching IDs"
        )
    return {
        "date": day.isoformat(), "complete": True, "source": "arXiv Atom submittedDate query",
        "source_total": total, "paper_count": len(by_id),
        "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "papers": sorted(by_id.values(), key=lambda x: (x["published"], x["id"])),
    }


def read_manifest() -> dict:
    try:
        data = json.loads(MANIFEST.read_text(encoding="utf8"))
        if isinstance(data.get("days"), dict):
            return data
    except (OSError, ValueError, AttributeError):
        pass
    return {"schema": 1, "days": {}}


def select_days(today: dt.date, existing: dict, count: int = 5) -> list[dt.date]:
    # Today may not be fully announced; previous day is refreshed as a revision
    # can be updated between successive checks. A day is only complete for the
    # API snapshot at fetched_at, not a promise that arXiv will never change it.
    selected = [today - dt.timedelta(days=i) for i in (0, 1, 2)]
    for age in range(3, BACKFILL_DAYS + 1):
        day = today - dt.timedelta(days=age)
        if day.isoformat() not in existing.get("days", {}):
            selected.append(day)
            if len(selected) >= count:
                break
    return selected



def manual_days(start: str, end: str, limit: int = 31) -> list[dt.date]:
    first, last = validate_date(start), validate_date(end)
    if first > last:
        raise ValueError("Backfill start must not exceed end")
    number = (last - first).days + 1
    if number > limit:
        raise ValueError(f"Select at most {limit} UTC days per manual backfill")
    if last > dt.datetime.now(dt.timezone.utc).date():
        raise ValueError("Future arXiv submission dates cannot be backfilled")
    return [first + dt.timedelta(days=n) for n in range(number)]


def run(today: dt.date | None = None, count: int = 5, fetcher=fetch_day, days=None) -> dict:
    today = today or dt.datetime.now(dt.timezone.utc).date()
    manifest = read_manifest()
    completed = 0
    errors = []
    for day in (days if days is not None else select_days(today, manifest, count)):
        try:
            payload = fetcher(day)
            if payload.get("date") != day.isoformat() or payload.get("complete") is not True:
                raise RuntimeError("Unverified fetcher output")
            if payload.get("paper_count") != payload.get("source_total"):
                raise RuntimeError("Paper count differs from arXiv totalResults")
            atomic_json(ARCHIVE / (day.isoformat() + ".json"), payload)
            manifest["days"][day.isoformat()] = {
                "count": payload["paper_count"],
                "fetched_at": payload["fetched_at"], "complete": True,
            }
            completed += 1
            print(f"arXiv daily archive: {day} {payload['paper_count']} complete records")
        except (OSError, ValueError, RuntimeError, ET.ParseError) as exc:
            errors.append(f"{day}: {str(exc)[:160]}")
            print("WARNING: arXiv daily archive incomplete:", errors[-1])
        # No premature claim that failed dates have been indexed.
        time.sleep(REQUEST_DELAY)
    manifest["schema"] = 1
    manifest["updated_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    manifest["scope"] = "Only explicitly listed UTC submission dates are complete"
    manifest["earliest_backfill_days"] = BACKFILL_DAYS
    atomic_json(MANIFEST, manifest)
    print(f"Daily archive: {completed} complete days; {len(errors)} failed attempts")
    return {"complete_days": completed, "failed": errors, "manifest": manifest}


if __name__ == "__main__":
    amount = max(3, min(8, int(os.environ.get("AXIOVO_DAILY_BACKFILL_COUNT", "5"))))
    start = os.getenv("AXIOVO_ARCHIVE_FROM", "").strip()
    end = os.getenv("AXIOVO_ARCHIVE_TO", "").strip()
    if bool(start) != bool(end):
        raise SystemExit("Both AXIOVO_ARCHIVE_FROM and AXIOVO_ARCHIVE_TO are required for manual backfill")
    days = manual_days(start, end) if start else None
    result = run(count=amount, days=days)
    # A failing arXiv source does not invalidate previously indexed days or
    # stop the rest of the website from deploying.
    if result["failed"]:
        print("WARNING: some daily batches are unavailable; completeness remains explicit")
