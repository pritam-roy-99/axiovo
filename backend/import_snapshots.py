#!/usr/bin/env python3
"""Axiovo local SQLite index importer.

Offline-only, standard library, no API tokens and no paid infrastructure.
Imports source-verified current JSON snapshots without claiming global coverage.
Reruns are idempotent. Never infer citation edges or merge papers by title.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sqlite3
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "backend" / "migrations" / "001_initial.sql"
SOURCE_FILES = {
    "arxiv": ROOT / "docs/data/feed.json",
    "biorxiv": ROOT / "docs/data/biorxiv.json",
    "chemrxiv": ROOT / "docs/data/chemrxiv.json",
}
ARXIV_ID = re.compile(r"^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z-]+)?/\d{7})$", re.I)
DOI = re.compile(r"^10\.\d{4,9}/\S+$", re.I)


def normalize_name(name: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", name).casefold().split())


def clean_text(value: object) -> str:
    return " ".join(str(value or "").split())


def canonical_identifier(source: str, item: dict) -> tuple[str, str] | None:
    if source == "arxiv":
        raw = str(item.get("id") or "").strip()
        raw = re.sub(r"^(?:arxiv:|https?://arxiv.org/abs/)", "", raw, flags=re.I)
        raw = re.sub(r"v\d+$", "", raw)
        if not ARXIV_ID.fullmatch(raw):
            return None
        return raw, f"arxiv:{raw.lower()}"
    doi = str(item.get("doi") or "").strip().lower()
    doi = re.sub(r"^https?://(?:dx\.)?doi.org/", "", doi)
    if not DOI.fullmatch(doi):
        return None
    # bioRxiv operates multiple valid registered DOI families.
    if source == "biorxiv" and not re.match(r"^10\.(?:1101|64898)/", doi):
        return None
    # ChemRxiv is source-verified at ingestion; DOI alone is not sufficient.
    if source == "chemrxiv" and not (
        doi.startswith("10.26434/") or "chemrxiv" in str(item.get("source") or "").lower()
    ):
        return None
    return doi, f"{source}:{doi}"


def normalize_paper(source: str, item: dict) -> dict | None:
    if not isinstance(item, dict) or source not in SOURCE_FILES:
        return None
    parsed = canonical_identifier(source, item)
    title = clean_text(item.get("title"))
    if not parsed or not title:
        return None
    identifier, key = parsed
    authors_raw = item.get("authors") or []
    if not isinstance(authors_raw, list):
        authors_raw = [authors_raw]
    authors = []
    for value in authors_raw[:250]:
        name = clean_text(value if isinstance(value, str) else value.get("name", ""))
        if name and name not in authors:
            authors.append(name)
    categories = item.get("categories") if source == "arxiv" else [item.get("category")]
    if not isinstance(categories, list):
        categories = []
    categories = list(dict.fromkeys(clean_text(x) for x in categories if clean_text(x)))
    primary = clean_text(item.get("primary_category") or (categories[0] if categories else ""))
    if primary and primary not in categories:
        categories.insert(0, primary)
    if source == "arxiv":
        source_url = "https://arxiv.org/abs/" + identifier
        pdf_url = "https://arxiv.org/pdf/" + identifier
    elif source == "biorxiv":
        source_url = "https://www.biorxiv.org/content/" + identifier
        pdf_url = "https://www.biorxiv.org/content/" + identifier + ".full.pdf"
    else:
        source_url = "https://doi.org/" + identifier
        pdf_url = None
    version = str(item.get("version") or "").strip()
    version = version.removeprefix("v")
    if version and not re.fullmatch(r"\d{1,5}", version):
        version = ""
    return {
        "source": source, "source_id": identifier, "canonical_key": key, "title": title,
        "abstract": clean_text(item.get("abstract")), "doi": clean_text(item.get("doi")).lower() or None,
        "first_submitted_at": str(item.get("published") or item.get("date") or "")[:35] or None,
        "metadata_updated_at": str(item.get("updated") or item.get("date") or "")[:35] or None,
        "source_url": source_url, "pdf_url": pdf_url, "version": version,
        "authors": authors, "categories": categories, "primary": primary,
    }


def open_database(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA foreign_keys=ON")
    connection.row_factory = sqlite3.Row
    connection.executescript(SCHEMA.read_text(encoding="utf-8"))
    return connection


def import_papers(con: sqlite3.Connection, source: str, items: list,
                  *, snapshot_timestamp: str | None = None) -> dict:
    """Transactional, repeatable import. Unverified records are rejected."""
    if source not in SOURCE_FILES:
        raise ValueError("Unsupported source")
    if not isinstance(items, list):
        raise ValueError("Expected list of papers")
    start = datetime.now(timezone.utc).isoformat()
    accepted = rejected = 0
    with con:
        run = con.execute(
            "INSERT INTO ingestion_runs(source,started_at,status,fetched_count) VALUES(?,?,'running',?)",
            (source, start, len(items)),
        ).lastrowid
        for item in items:
            p = normalize_paper(source, item)
            if not p:
                rejected += 1
                continue
            accepted += 1
            con.execute(
                """INSERT INTO papers(source,source_id,canonical_key,title,abstract,doi,
                      first_submitted_at,metadata_updated_at,source_url,pdf_url)
                   VALUES(?,?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(source,source_id) DO UPDATE SET
                     title=excluded.title,
                     abstract=CASE WHEN length(excluded.abstract)>0 THEN excluded.abstract ELSE papers.abstract END,
                     doi=COALESCE(excluded.doi,papers.doi),
                     first_submitted_at=COALESCE(papers.first_submitted_at,excluded.first_submitted_at),
                     metadata_updated_at=COALESCE(excluded.metadata_updated_at,papers.metadata_updated_at),
                     source_url=excluded.source_url,pdf_url=excluded.pdf_url
                """,
                tuple(p[k] for k in ("source","source_id","canonical_key","title","abstract",
                                       "doi","first_submitted_at","metadata_updated_at","source_url","pdf_url")),
            )
            paper_id = con.execute(
                "SELECT id FROM papers WHERE source=? AND source_id=?",
                (source, p["source_id"]),
            ).fetchone()["id"]
            con.execute(
                "INSERT OR IGNORE INTO paper_identifiers(paper_id,namespace,value) VALUES(?,?,?)",
                (paper_id, source, p["source_id"]),
            )
            if p["doi"]:
                con.execute(
                    "INSERT OR IGNORE INTO paper_identifiers(paper_id,namespace,value) VALUES(?, 'doi', ?)",
                    (paper_id, p["doi"]),
                )
            if p["version"]:
                con.execute(
                    "INSERT INTO paper_versions(paper_id,version,submitted_at,source_url) VALUES(?,?,?,?) "
                    "ON CONFLICT(paper_id,version) DO UPDATE SET "
                    "submitted_at=COALESCE(paper_versions.submitted_at,excluded.submitted_at)",
                    (paper_id, p["version"], p["metadata_updated_at"],
                     p["source_url"] + ("v" + p["version"] if source == "arxiv" else "")),
                )
            # Names alone cannot establish researcher identity. Retain the
            # previous author row for the same paper/position and matching
            # normalized name, but do not conflate two papers' authors.
            previous_authors = {
                row["position"]: (row["author_id"], row["normalized_name"])
                for row in con.execute(
                    "SELECT pa.position,pa.author_id,a.normalized_name "
                    "FROM paper_authors pa JOIN authors a ON a.id=pa.author_id "
                    "WHERE pa.paper_id=?", (paper_id,)
                )
            }
            con.execute("DELETE FROM paper_authors WHERE paper_id=?", (paper_id,))
            for pos, name in enumerate(p["authors"]):
                normalized = normalize_name(name)
                old = previous_authors.get(pos)
                if old and old[1] == normalized:
                    author_id = old[0]
                else:
                    author_id = con.execute(
                        "INSERT INTO authors(name,normalized_name) VALUES(?,?)", (name, normalized)
                    ).lastrowid
                con.execute(
                    "INSERT INTO paper_authors(paper_id,author_id,position) VALUES(?,?,?)",
                    (paper_id, author_id, pos),
                )
            # Remove stale orphan person rows created by changed author lists.
            con.execute("DELETE FROM authors WHERE id NOT IN (SELECT author_id FROM paper_authors)")
            con.execute("DELETE FROM paper_categories WHERE paper_id=?", (paper_id,))
            for category in p["categories"]:
                con.execute(
                    "INSERT OR IGNORE INTO categories(source,source_code,display_name) VALUES(?,?,?)",
                    (source, category, category),
                )
                category_id = con.execute(
                    "SELECT id FROM categories WHERE source=? AND source_code=?",
                    (source, category),
                ).fetchone()["id"]
                con.execute(
                    "INSERT OR IGNORE INTO paper_categories(paper_id,category_id,is_primary) VALUES(?,?,?)",
                    (paper_id, category_id, int(category == p["primary"])),
                )
        con.execute(
            "UPDATE ingestion_runs SET finished_at=?,status=?,accepted_count=?,rejected_count=? WHERE run_id=?",
            (datetime.now(timezone.utc).isoformat(),
             "partial" if rejected else "success", accepted, rejected, run),
        )
        total = con.execute("SELECT COUNT(*) AS n FROM papers WHERE source=?", (source,)).fetchone()["n"]
        con.execute(
            """INSERT INTO coverage(source,scope,observed_count,last_success_at,status,explanation)
                 VALUES(?,'recent-index',?,?,'partial',?)
                 ON CONFLICT(source,scope) DO UPDATE SET
                 observed_count=excluded.observed_count,last_success_at=excluded.last_success_at,
                 status='partial',explanation=excluded.explanation""",
            (source, total, snapshot_timestamp or start,
             "Indexed available verified source metadata only; historical completeness not established."),
        )
    return {"source": source, "fetched": len(items), "accepted": accepted,
            "rejected": rejected, "indexed_total": total}


def import_snapshot(con: sqlite3.Connection, source: str, path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        records, timestamp = payload, None
    elif isinstance(payload, dict):
        records, timestamp = payload.get("papers", []), payload.get("generated_at")
    else:
        raise ValueError("Invalid source snapshot")
    return import_papers(con, source, records, snapshot_timestamp=timestamp)


def main():
    parser = argparse.ArgumentParser(description="Create/update an offline Axiovo research database")
    parser.add_argument("--database", type=Path, required=True, help="Output SQLite file (not served by GitHub Pages)")
    parser.add_argument("--source", choices=[*SOURCE_FILES, "all"], default="all")
    parser.add_argument("--input", type=Path, help="Explicit JSON fixture/snapshot (only with one source)")
    args = parser.parse_args()
    if args.input and args.source == "all":
        parser.error("--input requires a specific --source")
    with open_database(args.database) as con:
        sources = SOURCE_FILES.keys() if args.source == "all" else [args.source]
        for source in sources:
            path = args.input or SOURCE_FILES[source]
            if not path.exists():
                print(f"SKIP {source}: no verified snapshot at {path}")
                continue
            try:
                print(json.dumps(import_snapshot(con, source, path), sort_keys=True))
            except (ValueError, OSError, json.JSONDecodeError) as exc:
                print(f"ERROR {source}: {exc}")
                raise


if __name__ == "__main__":
    main()
