#!/usr/bin/env python3
"""Build transparent, source-verified monthly metadata shards for Axiovo.

This converts ALREADY COLLECTED official metadata. It is not a full arXiv
backfill and never treats unharvested months as empty or complete. Existing
Library keys, pages and input feeds remain unchanged.
"""
from __future__ import annotations
from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import tempfile
import os

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data"
OUTPUT = DATA / "index" / "v1"
INPUTS = (
    ("arxiv", "feed.json"),
    ("arxiv", "oai-recent.json"),
    ("arxiv", "announcements.json"),
    ("biorxiv", "biorxiv.json"),
    ("chemrxiv", "chemrxiv.json"),
)
ARXIV_ID = re.compile(r"^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Za-z]{2})?/\d{7})(?:v\d+)?$", re.I)
DOI = re.compile(r"^10\.\d{4,9}/[-a-z0-9._;()/:+]+$", re.I)
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
WHITESPACE = re.compile(r"\s+")
SOURCES = {"arxiv": "arXiv", "biorxiv": "bioRxiv", "chemrxiv": "ChemRxiv"}


def clean(value):
    return WHITESPACE.sub(" ", str(value or "")).strip()


def iso_day(value):
    raw = str(value or "")[:10]
    if not DATE.fullmatch(raw):
        return None
    try:
        datetime.fromisoformat(raw)
    except ValueError:
        return None
    return raw


def authors(value):
    if isinstance(value, list):
        return [clean(v.get("name") or "") if isinstance(v, dict) else clean(v) for v in value][:150]
    return [clean(s) for s in str(value or "").split(";")][:150]


def categories(value):
    if isinstance(value, list):
        return [clean(x) for x in value if clean(x)]
    if isinstance(value, str) and value.strip():
        return [clean(value)]
    return []


def normalize(source, raw, checked_at, origin):
    if not isinstance(raw, dict):
        return None
    title = clean(raw.get("title"))
    if not title:
        return None
    doi = clean(raw.get("doi") or raw.get("DOI")).lower() or None
    if doi and not DOI.fullmatch(doi):
        doi = None
    version = raw.get("version")
    try:
        version = int(version) if version is not None else None
    except (TypeError, ValueError):
        version = None
    if version is not None and not 1 <= version <= 9999:
        version = None
    submitted = iso_day(raw.get("submitted_date") or raw.get("published") or
                        raw.get("created") or raw.get("date"))
    announced = iso_day(raw.get("announcement_date") or raw.get("announced_date"))
    if source == "arxiv":
        arxiv_id = clean(raw.get("id") or raw.get("arxiv_id") or raw.get("recordId"))
        arxiv_id = re.sub(r"^https?://arxiv\.org/(?:abs|pdf)/", "", arxiv_id)
        if not ARXIV_ID.fullmatch(arxiv_id):
            return None
        suffix = re.search(r"v(\d+)$", arxiv_id)
        if suffix:
            version = int(suffix.group(1))
        base = re.sub(r"v\d+$", "", arxiv_id)
        canonical = base + ("v" + str(version) if version is not None else "")
        landing = "https://arxiv.org/abs/" + canonical
        pdf = "https://arxiv.org/pdf/" + canonical
        identifier = "arxiv:" + base
        # DOI is optional; do not infer a registered DOI from the arXiv ID.
    else:
        if not doi:
            return None
        if source == "biorxiv" and not re.match(r"^10\.(?:1101|64898)/", doi):
            return None
        if source == "chemrxiv" and not (doi.startswith("10.26434/") or
                          raw.get("source") == "ChemRxiv"):
            return None
        identifier = source + ":" + doi
        landing = ("https://www.biorxiv.org/content/" + doi +
                   ("v" + str(version) if version else "")) if source == "biorxiv" else "https://doi.org/" + doi
        pdf = landing + ".full.pdf" if source == "biorxiv" else None
    terms = categories(raw.get("categories"))
    primary = clean(raw.get("primary_category") or raw.get("category"))
    if primary and primary not in terms:
        terms.insert(0, primary)
    # Do not claim AI-derived tags when no confidence-scored classifier ran.
    return {
        "id": identifier, "source": SOURCES[source], "title": title,
        "abstract": clean(raw.get("abstract") or raw.get("summary")),
        "authors": [a for a in authors(raw.get("authors")) if a],
        "categories": terms, "submitted_date": submitted,
        "announced_date": announced, "version": version, "doi": doi,
        "pdf_url": pdf, "landing_url": landing,
        "journal_ref": clean(raw.get("journal_ref") or raw.get("journal-ref")) or None,
        "license": clean(raw.get("license")) or None,
        "last_source_sync": checked_at, "source_dataset": origin,
        "tagging": {"method": "official-category-only", "confidence": None,
                    "subtopics": [], "review_required": True},
    }


def output_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=path.parent, encoding="utf-8", delete=False) as fp:
        json.dump(payload, fp, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        fp.write("\n")
        temp = Path(fp.name)
    os.replace(temp, path)


def prefer(a, b):
    """Do not transfer an abstract from one revision to another."""
    va, vb = a.get("version") or 0, b.get("version") or 0
    if va != vb:
        return a if va > vb else b
    def quality(p):
        return (bool(p["submitted_date"]), bool(p["abstract"]), len(p["abstract"]),
                len(p["categories"]), len(p["authors"]))
    newer, older = (a, b) if quality(a) >= quality(b) else (b, a)
    result = dict(newer)
    # Only same version can exchange metadata, never mix version-specific claims.
    for key in ("submitted_date", "announced_date", "journal_ref", "license"):
        result[key] = newer.get(key) or older.get(key)
    if not result["categories"]:
        result["categories"] = older["categories"]
    return result


def build(data_dir=DATA, out_dir=OUTPUT):
    unique = {}
    original_counts = {}
    source_stamps = {}
    missing = []
    discarded = Counter()
    for source, filename in INPUTS:
        file = data_dir / filename
        if not file.exists():
            missing.append(filename)
            continue
        try:
            payload = json.loads(file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            missing.append(filename)
            continue
        records = payload.get("papers") if isinstance(payload, dict) else None
        if not isinstance(records, list):
            missing.append(filename)
            continue
        original_counts[filename] = len(records)
        stamp = payload.get("checked_at") or payload.get("generated_at")
        source_stamps[filename] = stamp
        for item in records:
            paper = normalize(source, item, stamp, filename)
            if paper is None:
                discarded[filename] += 1
                continue
            key = paper["id"]
            unique[key] = prefer(unique[key], paper) if key in unique else paper
    groups = defaultdict(list)
    source_counts = Counter()
    source_date_counts = defaultdict(Counter)
    for item in unique.values():
        source = item["source"].lower()
        month = (item["submitted_date"] or item["announced_date"] or "")[:7]
        if not re.fullmatch(r"\d{4}-\d{2}", month):
            month = "undated"
        groups[(source, month)].append(item)
        source_counts[source] += 1
        if item["submitted_date"]:
            source_date_counts[source][item["submitted_date"]] += 1
    manifest_shards = []
    for (source, month), records in sorted(groups.items()):
        records.sort(key=lambda p:(p["submitted_date"] or p["announced_date"] or "",p["id"]),reverse=True)
        relative = f"{source}/{month}.json"
        output_json(out_dir / relative, {"schema_version": 1, "source": SOURCES[source],
                    "month": month, "coverage": "partial-source-snapshot",
                    "count": len(records), "papers": records})
        manifest_shards.append({"path": relative, "source": SOURCES[source],
                                "month": month, "count": len(records)})
    coverage = {
        "schema_version": 1, "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "coverage_status": "partial-snapshots-not-full-archives",
        "note": "Counts reflect only verified locally harvested records, not all papers in each archive.",
        "unique_papers": sum(source_counts.values()),
        "by_source": dict(sorted(source_counts.items())),
        "input_counts": original_counts, "input_sync_dates": source_stamps,
        "missing_inputs": missing, "rejected_records": dict(discarded),
        "daily_counts_by_first_submission_date": {s:dict(sorted(c.items())) for s,c in sorted(source_date_counts.items())},
        "shards": manifest_shards, "pending_subtopic_review": sum(source_counts.values()),
        "tag_confidence_distribution": {"unscored": sum(source_counts.values())},
    }
    output_json(out_dir / "manifest.json", coverage)
    # No speculative taxonomy assignments. This queue is honest and testable.
    output_json(out_dir / "needs_review.json", {"schema_version": 1,
                "reason": "No evaluated similarity classifier installed",
                "ids": sorted(unique)})
    return coverage


if __name__ == "__main__":
    report = build()
    print("Verified snapshot index:", report["unique_papers"], "records across",
          len(report["shards"]), "monthly shards. Coverage remains partial.")
