#!/usr/bin/env python3
"""Refresh public bioRxiv metadata without external dependencies or API keys.

bioRxiv's public API returns up to 30 records per page. Keep the last
successful snapshot on transient network failures, never fabricate papers.
"""
from __future__ import annotations
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import urllib.request

TARGET = Path(__file__).resolve().parents[1] / "docs" / "data" / "biorxiv.json"
ENDPOINT = "https://api.biorxiv.org/details/biorxiv/14d/0/json"

def normalize(item: dict) -> dict | None:
    doi = str(item.get("doi") or "").strip()
    if not re.fullmatch(r"10\.1101/[A-Za-z0-9._;()/:+-]+", doi):
        return None
    title = " ".join(str(item.get("title") or "").split())
    if not title:
        return None
    authors = [x.strip() for x in str(item.get("authors") or "").split(";") if x.strip()]
    return {
        "doi": doi, "title": title, "authors": authors[:100],
        "abstract": " ".join(str(item.get("abstract") or "").split())[:12000],
        "date": str(item.get("date") or "")[:10],
        "version": str(item.get("version") or "1")[:8],
        "category": " ".join(str(item.get("category") or "").split())[:120],
        "source": "bioRxiv",
        "url": "https://www.biorxiv.org/content/" + doi,
    }

def build(payload: dict, prior: dict | None = None) -> dict:
    if not isinstance(payload, dict) or not isinstance(payload.get("collection"), list):
        raise ValueError("bioRxiv API response lacks collection")
    index = {}
    for item in ((prior or {}).get("papers") or []):
        if isinstance(item, dict) and item.get("doi"):
            index[item["doi"]] = item
    count = 0
    for raw in payload["collection"]:
        if not isinstance(raw, dict):
            continue
        item = normalize(raw)
        if item is not None:
            count += 1
            old = index.get(item["doi"])
            if not old or (item["version"], item["date"]) >= (old.get("version", ""), old.get("date", "")):
                index[item["doi"]] = item
    if count == 0:
        raise ValueError("bioRxiv API returned no usable records; preserve previous data")
    papers = sorted(index.values(), key=lambda x: (x.get("date", ""), x.get("doi", "")), reverse=True)[:600]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "bioRxiv public API", "interval": "last 14 days; cached records retained",
        "papers": papers,
        "note": "Recent cached metadata only. Search the official bioRxiv site for comprehensive historical coverage.",
    }

def main() -> None:
    previous = {}
    try:
        previous = json.loads(TARGET.read_text(encoding="utf8"))
    except (OSError, ValueError):
        pass
    request = urllib.request.Request(ENDPOINT, headers={
        "User-Agent": "Axiovo/0.6 (+https://github.com/pritam-roy-99/researchlens; noncommercial metadata reader)",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            payload = json.load(response)
        result = build(payload, previous)
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
        print(f"bioRxiv: synchronized {len(result['papers'])} valid papers")
    except (OSError, ValueError, TypeError, json.JSONDecodeError) as error:
        print("WARNING: bioRxiv public API unavailable; preserving prior snapshot:", error)

if __name__ == "__main__":
    main()
