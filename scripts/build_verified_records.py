#!/usr/bin/env python3
"""Build source-verified, additive monthly research metadata shards for Axiovo.

Reads only source-derived snapshots already harvested by the independent jobs.
Never marks incomplete snapshots as complete, and never fabricates metadata.
Existing app JSON files and all browser Library keys remain untouched.
"""
from __future__ import annotations

import collections
import datetime as dt
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data"
OUTPUT = DATA / "records"
ARXIV = re.compile(r"^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?/\d{7})(?:v(\d+))?$", re.I)
DOI = re.compile(r"^10\.\d{4,9}/[-a-z0-9._;()/:+]+$", re.I)
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}")
FIELDS = ("id", "source", "title", "abstract", "authors", "categories",
          "submitted_date", "announced_date", "version", "doi", "pdf_url",
          "landing_url", "journal_ref", "license", "source_checked_at",
          "metadata_source", "subtopics", "tag_status")


def read(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, UnicodeError):
        return None


def date(value):
    text = str(value or "")
    if not DATE.match(text):
        return None
    try:
        return dt.date.fromisoformat(text[:10]).isoformat()
    except ValueError:
        return None


def text(value):
    return " ".join(str(value or "").split())


def authors(value):
    if isinstance(value, list):
        return [text(x.get("name", "") if isinstance(x, dict) else x)
                for x in value if text(x.get("name", "") if isinstance(x, dict) else x)]
    return [text(value)] if text(value) else []


def normalize(source, raw, checked_at=None):
    """No source URL or verifiable identifier = no public paper."""
    if not isinstance(raw, dict) or not text(raw.get("title")):
        return None
    ident = text(raw.get("id") or raw.get("arxiv_id") or raw.get("recordId"))
    doi = text(raw.get("doi") or raw.get("DOI")).lower()
    version = raw.get("version")
    try:
        version = int(version) if version is not None else None
    except (TypeError, ValueError):
        version = None
    if source == "arxiv":
        ident = ident.replace("https://arxiv.org/abs/", "").replace("https://arxiv.org/pdf/", "").removesuffix(".pdf")
        match = ARXIV.fullmatch(ident)
        if not match:
            return None
        version = int(match.group(1)) if match.group(1) else version
        base = re.sub(r"v\d+$", "", ident)
        exact = base + ("v" + str(version) if version and version > 0 else "")
        ident = exact
        landing = "https://arxiv.org/abs/" + exact
        pdf = "https://arxiv.org/pdf/" + exact
        # Atom 'published' is the first-submission timestamp; OAI datestamp
        # is NOT. RSS announcements have a separate date.
        submitted = date(raw.get("published") or raw.get("submitted_date"))
        announced = date(raw.get("announcement_date") or raw.get("announced_date"))
    else:
        if not doi and DOI.fullmatch(ident):
            doi = ident.lower()
        if not DOI.fullmatch(doi):
            return None
        if source == "biorxiv" and not re.match(r"^10\.(1101|64898)/", doi):
            return None
        if source == "chemrxiv" and not doi.startswith("10.26434/"):
            return None
        ident = doi
        landing = ("https://www.biorxiv.org/content/" + doi if source == "biorxiv"
                   else "https://doi.org/" + quote(doi, safe="/"))
        pdf = landing + ".full.pdf" if source == "biorxiv" else None
        submitted = date(raw.get("published") or raw.get("date") or raw.get("submitted_date"))
        announced = date(raw.get("announcement_date") or raw.get("announced_date"))
    category = raw.get("categories") or []
    if not isinstance(category, list):
        category = [category] if category else []
    primary = raw.get("primary_category") or raw.get("category")
    categories = [text(v) for v in ([primary] if primary else []) + category if text(v)]
    categories = list(dict.fromkeys(categories))
    return {
        "id": ident, "source": source, "title": text(raw["title"]),
        "abstract": text(raw.get("abstract") or raw.get("summary")),
        "authors": authors(raw.get("authors")), "categories": categories,
        "submitted_date": submitted, "announced_date": announced,
        "version": version, "doi": doi or None, "pdf_url": pdf,
        "landing_url": landing, "journal_ref": text(raw.get("journal_ref") or raw.get("journal_refence")) or None,
        "license": text(raw.get("license")) or None,
        "source_checked_at": checked_at,
        "metadata_source": text(raw.get("metadata_source") or raw.get("provenance")) or source,
        # Never imply a machine-generated topic label is verified.
        "subtopics": [], "tag_status": "needs_review"
    }


def build():
    sources = {
        "arxiv": ("feed.json", "announcements.json"),
        "biorxiv": ("biorxiv.json",),
        "chemrxiv": ("chemrxiv.json",),
    }
    selected = {}
    stats = {}
    source_stamp = {}
    announcement = None
    for source, files in sources.items():
        counts = collections.Counter()
        failures = 0
        for filename in files:
            snapshot = read(DATA / filename)
            if not isinstance(snapshot, dict):
                failures += 1
                continue
            if filename == "announcements.json" and snapshot.get("date_type") == "announcement":
                day = date(snapshot.get("announcement_date"))
                if day and isinstance(snapshot.get("papers"), list):
                    count = len(snapshot["papers"])
                    announcement = {"date": day, "count": count, "checked_at": snapshot.get("checked_at"),
                                    "complete": snapshot.get("complete") is True and snapshot.get("count") == count}
            checked = snapshot.get("checked_at") or snapshot.get("generated_at")
            if checked:
                source_stamp[source] = max(source_stamp.get(source, ""), str(checked))
            for raw in snapshot.get("papers", []):
                record = normalize(source, raw, checked)
                if record is None:
                    failures += 1
                    continue
                key = (source, record["id"])
                old = selected.get(key)
                if old:
                    # Complement evidence fields only from the SAME pinned version.
                    for field in ("submitted_date", "announced_date", "abstract", "journal_ref", "license"):
                        if not old[field] and record[field]:
                            old[field] = record[field]
                    old["categories"] = list(dict.fromkeys(old["categories"] + record["categories"]))
                else:
                    selected[key] = record
                counts[filename] += 1
        stats[source] = {"input_records": sum(counts.values()), "invalid_or_unavailable": failures,
                         "last_sync": source_stamp.get(source),
                         "coverage": "available source snapshots, not a complete historical archive"}
    buckets = collections.defaultdict(list)
    per_day = collections.defaultdict(lambda: collections.Counter())
    per_category = collections.Counter()
    for record in selected.values():
        day = record["submitted_date"] or record["announced_date"]
        month = day[:7] if day else "undated"
        buckets[(record["source"], month)].append(record)
        if day:
            per_day[(record["source"], day)]["records"] += 1
        for category in record["categories"]:
            per_category[(record["source"], category)] += 1

    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {"schema_version": 1, "source": "Axiovo official-source snapshots",
                "note": "Counts describe indexed records only, not archive-wide totals.",
                "archives": stats, "shards": {}, "record_count": len(selected), "latest_arxiv_announcement": announcement}
    for (source, month), papers in sorted(buckets.items()):
        papers.sort(key=lambda p: (p["submitted_date"] or p["announced_date"] or "", p["id"]), reverse=True)
        rel = f"{source}/{month}.json"
        dest = OUTPUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps({"schema_version": 1, "source": source, "month": month,
                                    "count": len(papers), "papers": papers}, ensure_ascii=False,
                                   separators=(",", ":")) + "\n", encoding="utf-8")
        manifest["shards"][rel] = len(papers)
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    daily = collections.defaultdict(dict)
    for (source, day), count in sorted(per_day.items()):
        daily[source][day] = count["records"]
    coverage = {"schema_version": 1, "description": "Observed indexed counts only; no historical completeness claim.",
                "archives": stats, "daily_indexed_records": daily,
                "category_counts": {source: {c: n for (s, c), n in per_category.items() if s == source}
                                    for source in sources},
                "needs_review": len(selected), "tagged": 0, "total_indexed": len(selected)}
    (DATA / "coverage.json").write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")
    review = {"schema_version": 1,
              "note": "Unreviewed paper metadata. No machine topic labels are claimed as verified.",
              "count": len(selected),
              "items": [{"source": p["source"], "id": p["id"], "reason": "Topic confidence has not been established"}
                        for p in selected.values()]}
    (DATA / "needs_review.json").write_text(
        json.dumps(review, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Validated", len(selected), "source-linked records across", len(buckets), "monthly shards")


if __name__ == "__main__":
    build()
