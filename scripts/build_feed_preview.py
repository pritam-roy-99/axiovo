#!/usr/bin/env python3
"""Small source-linked preview for fast My Feed first paint.

The preview is explicitly partial: all full source snapshots are still loaded
afterward, so this does not silently remove papers from the final feed.
"""
from __future__ import annotations
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data"
INPUTS = (
    ("arxiv", "feed.json"), ("arxiv", "oai-recent.json"),
    ("arxiv", "announcements.json"), ("biorxiv", "biorxiv.json"),
    ("chemrxiv", "chemrxiv.json"),
)
MAX_PER_SOURCE = 220

def as_date(row):
    for key in ("announcement_date", "announcementDate", "published", "date", "created", "updated"):
        value = row.get(key)
        if isinstance(value, str) and len(value) >= 10 and value[:4].isdigit():
            return value[:10]
    return ""

def identity(source, row):
    if source == "arxiv":
        return str(row.get("recordId") or row.get("id") or row.get("arxiv_id") or "").lower()
    return str(row.get("doi") or row.get("DOI") or row.get("id") or "").lower()

def build(data=DATA):
    data = Path(data)
    buckets = {key: {} for key in ("arxiv", "biorxiv", "chemrxiv")}
    examined = {}
    for source, name in INPUTS:
        path = data / name
        if not path.is_file():
            continue
        try:
            document = json.loads(path.read_text("utf8"))
        except (OSError, ValueError):
            continue
        rows = document.get("papers") if isinstance(document, dict) else None
        if not isinstance(rows, list):
            continue
        examined[name] = len(rows)
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get("title"), str):
                continue
            identifier = identity(source, row)
            if not identifier:
                continue
            before = buckets[source].get(identifier)
            if before is None or (as_date(row), len(str(row.get("abstract") or ""))) > (
                as_date(before), len(str(before.get("abstract") or ""))):
                # Keep full title and abstract so the same matching algorithm is used.
                # Omit fields never consumed by My Feed, not research content.
                buckets[source][identifier] = {
                    key: row[key] for key in
                    ("id", "recordId", "arxiv_id", "doi", "DOI", "title",
                     "abstract", "summary", "authors", "published", "date",
                     "created", "version", "categories", "primary_category",
                     "category", "announcement_date", "announcementDate")
                    if key in row
                }
    papers = []
    counts = {}
    for source, byid in buckets.items():
        newest = sorted(byid.values(), key=lambda p: (as_date(p), identity(source, p)), reverse=True)
        subset = newest[:MAX_PER_SOURCE]
        counts[source] = len(subset)
        papers.extend({"source": source, **row} for row in subset)
    if not papers:
        raise ValueError("No usable source records for Feed preview")
    output = {
        "schema_version": 1,
        "coverage": "recent-preview-only-full-source-snapshots-load-afterward",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_counts": counts,
        "papers": papers,
    }
    raw = (json.dumps(output, ensure_ascii=False, separators=(",", ":"))+"\n").encode()
    target = data / "feed-preview.json"
    with tempfile.NamedTemporaryFile("wb", dir=data, delete=False) as fp:
        fp.write(raw)
        tmp = Path(fp.name)
    os.replace(tmp, target)
    print(f"Feed preview: {len(papers)} recent records, {len(raw)/1048576:.2f} MiB; full coverage unchanged")
    return output

if __name__ == "__main__":
    build()
