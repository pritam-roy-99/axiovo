#!/usr/bin/env python3
"""Archive Reliability 2.0: conservative, source-scoped coverage accounting.

No global completeness claim is inferred from a successful sync or cached data.
"""
from __future__ import annotations
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "docs" / "data"
SOURCES = {"arxiv": "announcements.json", "biorxiv": "biorxiv.json",
           "chemrxiv": "chemrxiv.json", "eprint": "eprint.json"}

def load(path):
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else None
    except (OSError, ValueError):
        return None

def arxiv_report(data):
    papers = data.get("papers") or []
    if not isinstance(papers, list):
        papers = []
    unique = {}
    by_category = {}
    for paper in papers:
        if not isinstance(paper, dict) or not paper.get("id"):
            continue
        identifier = str(paper["id"]).split("v")[0]
        unique.setdefault(identifier, paper)
        cats = set(str(c) for c in (paper.get("categories") or []) if c)
        primary = paper.get("primary_category")
        if primary:
            cats.add(str(primary))
        for cat in cats:
            bucket = by_category.setdefault(cat, {"unique": set(), "v1": set(),
                "crosslisted": set(), "replacements": set(), "unspecified": set()})
            bucket["unique"].add(identifier)
            typ = str(paper.get("announce_type") or "").lower()
            version = paper.get("version")
            if typ in ("cross", "crosslist", "cross-list"):
                bucket["crosslisted"].add(identifier)
            elif typ in ("replace", "replacement") or (isinstance(version, int) and version > 1):
                bucket["replacements"].add(identifier)
            elif typ == "new" and version == 1:
                bucket["v1"].add(identifier)
            else:
                bucket["unspecified"].add(identifier)
    categories = {key: {field: len(ids) for field, ids in sorted(value.items())}
                  for key, value in sorted(by_category.items())}
    valid = bool(data.get("complete") is True
                 and isinstance(data.get("count"), int)
                 and data["count"] == len(papers)
                 and len(unique) == len(papers)
                 and not data.get("failed_archives")
                 and not data.get("capped_archives"))
    return {"scope": "arxiv-announcement-batch", "announcement_date": data.get("announcement_date"),
            "complete": valid, "source_reported_count": data.get("count"),
            "indexed_unique": len(unique), "categories": categories,
            "failed_archives": data.get("failed_archives") or [],
            "capped_archives": data.get("capped_archives") or [],
            "note": "Category counts can overlap due to cross-listing. v1 is certified only when announce_type=new and version=1."}

def build(root=ROOT):
    root = Path(root)
    result = {"schema_version": 2, "generated_at": datetime.now(timezone.utc).isoformat(),
              "meaning": "Verified source-scoped coverage; not full archive completeness",
              "sources": {}}
    for source, filename in SOURCES.items():
        data = load(root / filename)
        if data is None:
            result["sources"][source] = {"status": "unavailable", "complete": False}
            continue
        if source == "arxiv":
            report = arxiv_report(data)
            result["sources"][source] = {"status": "verified" if report["complete"] else "partial",
                                         **report}
        else:
            papers = data.get("papers")
            count = len(papers) if isinstance(papers, list) else None
            if source == "biorxiv":
                complete = (data.get("complete_window") is True
                            and isinstance(data.get("source_total"), int)
                            and isinstance(data.get("records_paginated"), int)
                            and data["records_paginated"] >= data["source_total"])
                scope = "bounded-date-window"
            elif source == "chemrxiv":
                complete = False  # DOI-prefix exhaustion is not global completeness
                scope = "doi-prefix-discovery"
            else:
                complete = data.get("historical_oai_traversal_complete") is True
                scope = "oai-traversed-history"
            result["sources"][source] = {
                "status": "verified_scope" if complete else "partial",
                "complete": complete, "scope": scope, "indexed_unique": count,
                "checked_at": data.get("checked_at") or data.get("generated_at"),
                "not_global_completeness": True}
    return result

def main():
    report = build()
    target = ROOT / "archive-reliability.json"
    target.write_text(json.dumps(report, ensure_ascii=False, separators=(",", ":"), sort_keys=True)+"\n", encoding="utf-8")
    print("Archive Reliability 2.0:", {k:v["status"] for k,v in report["sources"].items()})

if __name__ == "__main__":
    main()
