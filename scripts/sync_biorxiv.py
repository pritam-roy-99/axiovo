#!/usr/bin/env python3
"""Bounded, paginated official bioRxiv metadata refresh.

Harvest a rolling 14-day date window, follow cursor pages, preserve historical
verified records, and report whether the requested source window was exhausted.
No empty/failed request may masquerade as a successful synchronization.
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from pathlib import Path
import json
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request

TARGET = Path(__file__).resolve().parents[1] / "docs/data/biorxiv.json"
BASE = "https://api.biorxiv.org/details/biorxiv"
PAGE_SIZE = 100  # API may return fewer; advance by observed collection size
MAX_PAGES = 150
MAX_STORED = 5000
RETRY = (5, 15, 35)

def normalize(item):
    doi = str(item.get("doi") or "").strip()
    if not re.fullmatch(r"10\.(?:1101|64898)/[A-Za-z0-9._;()/:+-]+", doi, re.I):
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

def get(url, opener=None, sleep=time.sleep):
    opener = opener or urllib.request.urlopen
    request = urllib.request.Request(url, headers={
        "User-Agent": os.getenv("ARXIV_USER_AGENT",
            "Axiovo/1.1 (https://github.com/pritam-roy-99/axiovo; bioRxiv metadata index)"),
        "Accept": "application/json",
    })
    for attempt in range(len(RETRY) + 1):
        try:
            with opener(request, timeout=45) as response:
                return json.load(response)
        except (OSError, ValueError, json.JSONDecodeError) as error:
            if attempt == len(RETRY):
                raise
            if isinstance(error, urllib.error.HTTPError) and error.code not in (429, 500, 502, 503, 504):
                raise
            sleep(RETRY[attempt])
    raise RuntimeError("bioRxiv source unavailable")

def fetch_window(start, end, fetcher=get, sleep=time.sleep, max_pages=MAX_PAGES):
    index = {}
    cursor = 0
    expected = None
    pages = 0
    while pages < max_pages:
        url = f"{BASE}/{start}/{end}/{cursor}/json"
        payload = fetcher(url)
        if not isinstance(payload, dict) or not isinstance(payload.get("collection"), list):
            raise ValueError("bioRxiv collection missing")
        rows = payload["collection"]
        messages = payload.get("messages") or []
        if expected is None and messages and isinstance(messages[0], dict):
            try:
                expected = int(messages[0]["total"])
            except (ValueError, KeyError, TypeError):
                pass
        if not rows:
            if cursor == 0:
                raise ValueError("bioRxiv returned an empty first page; no freshness claim")
            break
        for raw in rows:
            if not isinstance(raw, dict):
                continue
            item = normalize(raw)
            if item:
                key = item["doi"].lower()
                prior = index.get(key)
                if prior is None or (int(item["version"]) if str(item["version"]).isdigit() else 0, item["date"]) >= (int(prior["version"]) if str(prior["version"]).isdigit() else 0, prior["date"]):
                    index[key] = item
        cursor += len(rows)
        pages += 1
        if expected is not None and cursor >= expected:
            break
        sleep(1.2)
    complete = expected is not None and cursor >= expected
    if not index:
        raise ValueError("bioRxiv did not return valid DOI records")
    return list(index.values()), {"complete_window": complete, "source_total": expected,
        "records_paginated": cursor, "pages": pages, "requested_from": str(start), "requested_through": str(end)}

def atomic_write(payload):
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=TARGET.parent, encoding="utf8", delete=False) as out:
        json.dump(payload, out, ensure_ascii=False, separators=(",", ":"))
        out.write("\n")
        tmp = Path(out.name)
    tmp.replace(TARGET)

def main():
    today = datetime.now(timezone.utc).date()
    days = max(2, min(30, int(os.getenv("AXIOVO_BIORXIV_LOOKBACK_DAYS", "14"))))
    prior = {}
    try:
        prior = json.loads(TARGET.read_text(encoding="utf8"))
    except (OSError, ValueError):
        pass
    try:
        current, status = fetch_window(today - timedelta(days=days), today)
    except (OSError, ValueError) as error:
        print("ERROR: bioRxiv refresh failed; previously published snapshot unchanged:", error, file=sys.stderr)
        raise SystemExit(1)
    index = {p["doi"].lower(): p for p in prior.get("papers", []) if isinstance(p, dict) and p.get("doi")}
    for paper in current:
        old = index.get(paper["doi"].lower())
        if old is None or str(paper["version"]).isdigit() and int(paper["version"]) >= int(old.get("version", 0) or 0):
            index[paper["doi"].lower()] = paper
    papers = sorted(index.values(), key=lambda p: (p.get("date", ""),p["doi"]), reverse=True)[:MAX_STORED]
    payload = {"generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Official bioRxiv API", "endpoint": BASE,
        "coverage": "Paginated rolling date window; cached older source records retained, not a full historical archive",
        "count": len(papers), "papers": papers, **status}
    atomic_write(payload)
    print("bioRxiv indexed",len(papers),"window records",status["records_paginated"],
          "official total",status["source_total"],"complete",status["complete_window"])

if __name__ == "__main__":
    main()
