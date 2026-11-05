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

def merge(existing, incoming, limit=5000):
    index = {p["id"]: p for p in existing if p.get("id") and p.get("title")}
    for item in incoming:
        old = index.get(item["id"])
        if old is None or (item.get("version", 1), item.get("updated", "")) >= (old.get("version", 1), old.get("updated", "")):
            index[item["id"]] = item
    for item in index.values():
        item["topics"] = assign_topics(item)
    return sorted(index.values(), key=lambda p: (p.get("published") or "", p.get("updated") or ""), reverse=True)[:limit]

def fetch_recent():
    """Ingest separate subject feeds, including adjacent interdisciplinary work.

    Poll at a deliberately modest pace and preserve existing metadata on failures.
    """
    categories = os.environ.get("ARXIV_CATEGORIES", "quant-ph,cs.AI,cs.LG,cs.CR,cs.IT,stat.ML,stat.AP,math.PR,math.AG,astro-ph.CO,astro-ph.HE,cond-mat.stat-mech,cond-mat.str-el,cond-mat.supr-con,cond-mat.mtrl-sci,hep-ph,hep-th,gr-qc,q-bio.MN,q-bio.QM,physics.bio-ph,physics.optics,econ.GN,eess.SP").split(",")
    page_size = min(200, max(1, int(os.environ.get("ARXIV_MAX_RESULTS", "150"))))
    results = []
    failures = []
    # Read both streams. "lastUpdatedDate" alone can crowd newly announced
    # v1 papers out of the limited query window when older papers are revised.
    streams = ("submittedDate", "lastUpdatedDate")
    valid_categories = [c.strip() for c in categories
                        if re.fullmatch(r"[A-Za-z0-9.-]+", c.strip())]
    calls = [(category, stream) for category in valid_categories
             for stream in streams]
    for i, (category, stream) in enumerate(calls):
        args = urllib.parse.urlencode({
            "search_query": "cat:" + category, "start": 0,
            "max_results": page_size,
            "sortBy": stream, "sortOrder": "descending"
        })
        req = urllib.request.Request(
            "https://export.arxiv.org/api/query?" + args,
            headers={"User-Agent": os.environ.get(
                "ARXIV_USER_AGENT",
                "Axiovo/0.5 (https://github.com/pritam-roy-99/axiovo; scholarly metadata discovery)")}
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
                    failures.append(category + " " + stream + ": " + str(exc)[:120])
                else:
                    time.sleep(5)
        # Respect the arXiv API's request spacing across all query types.
        if i < len(calls) - 1:
            time.sleep(3.2)
    if failures:
        print("WARNING: Some arXiv queries failed:", "; ".join(failures))
    if not results:
        raise RuntimeError("All arXiv queries unavailable, preserving previous data")
    return results


def read_pinned_ids():
    """Curated historical IDs are requested directly, regardless of recency."""
    source = ROOT / "data" / "pinned_arxiv_ids.txt"
    if not source.exists():
        return []
    values = []
    for line in source.read_text(encoding="utf-8").splitlines():
        ident = line.split("#", 1)[0].strip()
        if not ident:
            continue
        if not re.fullmatch(r"(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?/\d{7})(?:v\d+)?", ident):
            print("WARNING: invalid pinned ID:", ident)
            continue
        if ident not in values:
            values.append(ident)
    return values

def fetch_by_ids(ids):
    """Look up older records using arXiv ID query; no made-up metadata."""
    if not ids:
        return []
    found = []
    for start in range(0, len(ids), 20):
        group = ids[start:start+20]
        query = urllib.parse.urlencode({"id_list": ",".join(group),
                                        "max_results": len(group)})
        request = urllib.request.Request(
            "https://export.arxiv.org/api/query?" + query,
            headers={"User-Agent": os.getenv(
                "ARXIV_USER_AGENT",
                "ResearchLens-MVP/0.3 (https://github.com/pritam-roy-99/researchlens)")})
        for attempt in range(2):
            try:
                with urllib.request.urlopen(request, timeout=45) as response:
                    parsed = parse_atom(response.read())
                matched = {re.sub(r"v\d+$", "", x): x for x in group}
                found.extend(p for p in parsed if p["id"] in matched)
                break
            except (OSError, ValueError, ET.ParseError) as exc:
                if attempt == 1:
                    print("WARNING: pinned ID query failed:", str(exc)[:160])
                else:
                    time.sleep(5)
        if start + 20 < len(ids):
            time.sleep(3.2)
    return found


def read_verified_daily_records(today=None, lookback=7):
    """Use date-complete harvested first submissions before category samples."""
    today = today or dt.datetime.now(dt.timezone.utc).date()
    folder = ROOT / "docs" / "data" / "arxiv-days"
    try:
        manifest = json.loads((folder / "manifest.json").read_text(encoding="utf8"))
    except (OSError, ValueError):
        return []
    verified = {}
    for age in range(lookback):
        day = (today - dt.timedelta(days=age)).isoformat()
        item = manifest.get("days", {}).get(day, {})
        if not item.get("complete"):
            continue
        try:
            shard = json.loads((folder / (day + ".json")).read_text(encoding="utf8"))
        except (OSError, ValueError):
            continue
        papers = shard.get("papers")
        if not (shard.get("complete") and shard.get("date") == day
                and isinstance(papers, list)
                and len(papers) == shard.get("paper_count") == shard.get("source_total") == item.get("count")):
            continue
        for paper in papers:
            if str(paper.get("published", ""))[:10] != day:
                continue
            prior = verified.get(paper.get("id"))
            if not prior or (paper.get("version", 1), paper.get("updated", "")) > (prior.get("version", 1), prior.get("updated", "")):
                verified[paper["id"]] = paper
    return list(verified.values())


def read_oai_recent():
    """Use all-category OAI-PMH harvest as the primary recent discovery source.

    OAI datestamps refer to metadata updates, not first-submission or
    announcement dates. OAI results improve recent coverage but must never
    be used to certify a complete submission-day archive.
    """
    source = ROOT / "docs" / "data" / "oai-recent.json"
    try:
        snapshot = json.loads(source.read_text(encoding="utf8"))
    except (OSError, ValueError, TypeError):
        return [], False
    results = []
    for item in snapshot.get("papers", []):
        identifier = str(item.get("id", ""))
        if not re.fullmatch(r"(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Za-z]{2})?/\d{7})", identifier, re.I):
            continue
        created = str(item.get("created", ""))
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", created):
            continue
        # OAI 'created' has day resolution. Never invent an exact submission time.
        updated = str(item.get("updated") or created)
        updated = updated[:10] if re.fullmatch(r"\d{4}-\d{2}-\d{2}.*", updated) else created
        categories = item.get("categories") or []
        if not isinstance(categories, list):
            categories = []
        results.append({
            "id": identifier, "version": 1,
            "title": str(item.get("title", "")).strip(),
            "abstract": str(item.get("abstract", "")).strip(),
            "authors": list(item.get("authors") or []),
            "categories": categories,
            "primary_category": categories[0] if categories else "",
            "published": created + "T00:00:00Z",
            "published_date_precision": "day",
            "updated": updated + "T00:00:00Z",
            "link": "https://arxiv.org/abs/" + identifier,
            "topics": [], "doi": str(item.get("doi", "")),
            "metadata_source": "arXiv OAI-PMH",
        })
    return [p for p in results if p["title"]], bool(snapshot.get("complete_window"))


def main():
    try:
        old = json.loads(TARGET.read_text(encoding="utf-8")) if TARGET.exists() else {}
    except (ValueError, OSError):
        old = {}
    dated = read_verified_daily_records()
    oai_records, oai_complete = read_oai_recent()
    if dated:
        print("Verified complete-date records:", len(dated))
    if oai_records:
        print("All-category OAI-PMH records:", len(oai_records), "; latest update window complete:", oai_complete)
    fresh = dated + oai_records
    if not fresh:
        print("No verified date shards or OAI metadata available; falling back to sampled categories")
        fresh = fetch_recent()
    pinned = read_pinned_ids()
    # Do not repeatedly request already-cached historical IDs every hour;
    # this previously amplified arXiv HTTP 429 responses.
    covered_ids = {p["id"] for p in old.get("papers", []) + fresh if p.get("id")}
    pending = [id for id in pinned if re.sub(r"v\d+$", "", id) not in covered_ids]
    historical = fetch_by_ids(pending)
    if pinned:
        print("Pinned ID lookup:", len(historical), "newly resolved of", len(pending), "missing IDs (", len(pinned), "total pins)")
    fresh.extend(historical)
    if not fresh:
        raise RuntimeError("Empty response; retaining existing data")
    papers = merge(old.get("papers", []), fresh)
    # Preserve curated historical records even if the rolling feed reaches its limit.
    pinned_ids = {re.sub(r"v\d+$", "", x) for x in pinned}
    pinned_records = [p for p in (old.get("papers", []) + historical) if p.get("id") in pinned_ids]
    papers = merge(papers, pinned_records, limit=3500)
    payload = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "official arXiv OAI-PMH and verified submission-date Atom batches, with category fallback",
        "index_scope": "all-category recent OAI harvest (partial if incomplete) and independently verified full submission-day shards; older history remains partial",
        "refresh_methods": ["OAI-PMH", "submittedDate date archive", "Atom category fallback"],
        "oai_window_complete": oai_complete,
        "paper_count": len(papers), "pinned_ids": pinned, "topic_catalog": topic_catalog(), "papers": papers
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
