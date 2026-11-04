#!/usr/bin/env python3
"""Refresh public bioRxiv metadata without external dependencies or API keys.

bioRxiv's public API returns up to 30 records per page. Keep the last
successful snapshot on transient network failures, never fabricate papers.
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
import json
import sys
from pathlib import Path
import re
import urllib.request

TARGET = Path(__file__).resolve().parents[1] / "docs" / "data" / "biorxiv.json"
ENDPOINT = "https://api.biorxiv.org/details/biorxiv/100/0/json"

def normalize(item: dict) -> dict | None:
    doi = str(item.get("doi") or "").strip()
    if not re.fullmatch(r"10\.\d{4,9}/[A-Za-z0-9._;()/:+-]+", doi):
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
        "source": "bioRxiv public API", "interval": "100 most recent records; cached records retained",
        "papers": papers,
        "note": "Recent cached metadata only. Search the official bioRxiv site for comprehensive historical coverage.",
    }

def candidate_endpoints() -> list[str]:
    """Use the documented official recent-post and interval APIs, then legacy mirror."""
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=14)
    return [
        "https://api.biorxiv.org/details/biorxiv/7d/0/json",
        "https://api.biorxiv.org/details/biorxiv/14d/0/json",
        "https://api.biorxiv.org/details/biorxiv/100/0/json",
        f"https://api.biorxiv.org/details/biorxiv/{start}/{today}/0/json",
        "https://connect.biorxiv.org/api/detail/100/0/json",
    ]


def main() -> None:
    previous = {}
    try:
        previous = json.loads(TARGET.read_text(encoding="utf8"))
    except (OSError, ValueError):
        pass
    errors = []
    for url in candidate_endpoints():
        request = urllib.request.Request(url, headers={
            "User-Agent": "Axiovo/0.7 (+https://github.com/pritam-roy-99/axiovo; public scholarly metadata)",
            "Accept": "application/json",
        })
        try:
            with urllib.request.urlopen(request, timeout=18) as response:
                payload = json.load(response)
            entries = payload.get("collection") if isinstance(payload, dict) else None
            if isinstance(entries, list) and entries:
                sample = entries[0]
                if isinstance(sample, dict):
                    doi = str(sample.get("doi") or "")
                    print("bioRxiv endpoint sample:", len(entries), "records; DOI prefix", doi.split("/")[0])
            result = build(payload, previous)
            result["interval"] = "Latest official bioRxiv records, limited to 30 per response; prior records retained"
            result["endpoint"] = url
            TARGET.parent.mkdir(parents=True, exist_ok=True)
            TARGET.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
            print(f"bioRxiv: synchronized {len(result['papers'])} valid papers via {url}")
            return
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as error:
            errors.append(f"{url}: {str(error)[:160]}")
            print("WARNING: bioRxiv source unavailable:", errors[-1])

    if (previous.get("papers") or []):
        print("WARNING: all official bioRxiv endpoints failed; retaining",len(previous["papers"]),"cached records")
        return
    print("ERROR: all bioRxiv endpoints failed, and cached bioRxiv data is empty", file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    main()
