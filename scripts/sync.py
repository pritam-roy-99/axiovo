#!/usr/bin/env python3
"""Synchronize recent arXiv metadata into a GitHub Pages JSON feed."""
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

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "docs" / "data" / "feed.json"
ATOM = "{http://www.w3.org/2005/Atom}"
ARXIV = "{http://arxiv.org/schemas/atom}"

def normalize(text):
    return " ".join((text or "").split())

def parse_id(url):
    value = url.rstrip("/").split("/")[-1]
    if not re.fullmatch(r"[A-Za-z0-9.\-]+(?:v\d+)?", value):
        raise ValueError("Invalid arXiv ID")
    v = re.search(r"v(\d+)$", value)
    return re.sub(r"v\d+$", "", value), int(v.group(1)) if v else 1

def parse_atom(data):
    root = ET.fromstring(data)
    if root.tag != ATOM + "feed":
        raise ValueError("Expected Atom feed")
    papers = []
    for e in root.findall(ATOM + "entry"):
        try:
            identifier, version = parse_id(e.findtext(ATOM + "id", default=""))
        except ValueError:
            continue
        categories = [x.get("term", "") for x in e.findall(ATOM + "category")]
        primary = e.find(ARXIV + "primary_category")
        title = normalize(e.findtext(ATOM + "title"))
        if not title:
            continue
        papers.append({
            "id": identifier,
            "version": version,
            "title": title,
            "abstract": normalize(e.findtext(ATOM + "summary")),
            "authors": [normalize(x.text) for x in e.findall(ATOM + "author/" + ATOM + "name")],
            "categories": categories,
            "primary_category": primary.get("term", "") if primary is not None else (categories[0] if categories else ""),
            "published": e.findtext(ATOM + "published", default=""),
            "updated": e.findtext(ATOM + "updated", default=""),
            "link": "https://arxiv.org/abs/" + identifier
        })
    return papers

def merge(existing, incoming, limit=600):
    index = {p["id"]: p for p in existing if p.get("id") and p.get("title")}
    for item in incoming:
        old = index.get(item["id"])
        if old is None or (item.get("version", 1), item.get("updated", "")) >= (old.get("version", 1), old.get("updated", "")):
            index[item["id"]] = item
    return sorted(index.values(), key=lambda p: p.get("updated") or p.get("published") or "", reverse=True)[:limit]

def fetch_recent():
    categories = os.environ.get("ARXIV_CATEGORIES", "quant-ph,hep-th,cs.IT").split(",")
    query = " OR ".join("cat:" + category for category in categories)
    args = urllib.parse.urlencode({
        "search_query": query, "start": 0,
        "max_results": min(200, max(1, int(os.environ.get("ARXIV_MAX_RESULTS", "120")))),
        "sortBy": "lastUpdatedDate", "sortOrder": "descending"
    })
    req = urllib.request.Request(
        "https://export.arxiv.org/api/query?" + args,
        headers={"User-Agent": os.environ.get("ARXIV_USER_AGENT", "ResearchLens-MVP/0.1 (https://github.com/pritam-roy-99/researchlens)")}
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=35) as response:
                return parse_atom(response.read())
        except (OSError, ET.ParseError, ValueError):
            if attempt == 2:
                raise
            time.sleep((attempt + 1) * 5)

def main():
    try:
        old = json.loads(TARGET.read_text(encoding="utf-8")) if TARGET.exists() else {}
    except (ValueError, OSError):
        old = {}
    fresh = fetch_recent()
    if not fresh:
        raise RuntimeError("Empty response; retaining existing data")
    papers = merge(old.get("papers", []), fresh)
    payload = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "arXiv Atom API",
        "paper_count": len(papers), "papers": papers
    }
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=TARGET.parent, delete=False) as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
        temporary = f.name
    os.replace(temporary, TARGET)
    print("Fetched", len(fresh), "arXiv entries; indexed", len(papers), "records")

if __name__ == "__main__":
    main()
