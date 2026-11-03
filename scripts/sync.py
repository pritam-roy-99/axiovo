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
try:
    from .quantum_topics import assign_topics, topic_catalog
except ImportError:
    from quantum_topics import assign_topics, topic_catalog

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
            "link": "https://arxiv.org/abs/" + identifier,
            "topics": [],
            "doi": normalize(e.findtext(ARXIV + "doi", default=""))
        })
    return papers

def merge(existing, incoming, limit=3000):
    index = {p["id"]: p for p in existing if p.get("id") and p.get("title")}
    for item in incoming:
        old = index.get(item["id"])
        if old is None or (item.get("version", 1), item.get("updated", "")) >= (old.get("version", 1), old.get("updated", "")):
            index[item["id"]] = item
    for item in index.values():
        item["topics"] = assign_topics(item)
    return sorted(index.values(), key=lambda p: p.get("updated") or p.get("published") or "", reverse=True)[:limit]

def fetch_recent():
    """Ingest separate subject feeds, including adjacent interdisciplinary work.

    Poll at a deliberately modest pace and preserve existing metadata on failures.
    """
    categories = os.environ.get("ARXIV_CATEGORIES", "quant-ph,cs.IT,hep-th,physics.optics,cond-mat.mes-hall").split(",")
    page_size = min(200, max(1, int(os.environ.get("ARXIV_MAX_RESULTS", "150"))))
    results = []
    failures = []
    for i, category in enumerate(categories):
        category = category.strip()
        if not re.fullmatch(r"[A-Za-z0-9.\-]+", category):
            continue
        args = urllib.parse.urlencode({
            "search_query": "cat:" + category, "start": 0,
            "max_results": page_size,
            "sortBy": "lastUpdatedDate", "sortOrder": "descending"
        })
        req = urllib.request.Request(
            "https://export.arxiv.org/api/query?" + args,
            headers={"User-Agent": os.environ.get("ARXIV_USER_AGENT", "ResearchLens-MVP/0.2 (https://github.com/pritam-roy-99/researchlens; research metadata discovery)")}
        )
        for attempt in range(2):
            try:
                with urllib.request.urlopen(req, timeout=45) as response:
                    papers = parse_atom(response.read())
                    if papers:
                        results.extend(papers)
                    break
            except (OSError, ET.ParseError, ValueError) as exc:
                if attempt == 1:
                    failures.append(category + ": " + str(exc)[:120])
                else:
                    time.sleep(5)
        if i < len(categories)-1:
            time.sleep(3.2)
    if failures:
        print("WARNING: Some arXiv categories failed:", "; ".join(failures))
    if not results:
        raise RuntimeError("All arXiv feeds unavailable, preserving previous data")
    return results

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
        "paper_count": len(papers), "topic_catalog": topic_catalog(), "papers": papers
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
