#!/usr/bin/env python3
"""Stream Cornell/Kaggle arXiv JSONL snapshot into bounded, resumable SQLite.

Input is the local arxiv-metadata-oai-snapshot.json file downloaded separately.
No network access, no GitHub Pages publication, and no bulk in-memory loading.
"""
import argparse
import hashlib
import json
import os
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS papers (
  arxiv_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  authors TEXT NOT NULL,
  categories TEXT NOT NULL,
  update_date TEXT,
  versions_json TEXT NOT NULL,
  raw_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ingest_state (
  source_key TEXT PRIMARY KEY,
  offset INTEGER NOT NULL,
  lines INTEGER NOT NULL,
  imported INTEGER NOT NULL,
  rejected INTEGER NOT NULL
);
"""

def source_key(path):
    path = Path(path).resolve()
    stat = path.stat()
    # Prevent accidentally resuming against a replaced file of the same name.
    with path.open("rb") as fh:
        sample = fh.read(65536)
    digest = hashlib.sha256(sample).hexdigest()
    return f"{path}:{stat.st_size}:{digest}"

def ingest(snapshot, database, max_lines=1000):
    if max_lines < 1 or max_lines > 100000:
        raise ValueError("max_lines must be between 1 and 100000")
    key = source_key(snapshot)
    db = sqlite3.connect(database)
    try:
        db.executescript(SCHEMA)
        row = db.execute("SELECT offset, lines, imported, rejected FROM ingest_state WHERE source_key=?", (key,)).fetchone()
        offset, lines, imported, rejected = row or (0, 0, 0, 0)
        batch = []
        with open(snapshot, "rb") as fh:
            fh.seek(offset)
            for _ in range(max_lines):
                raw = fh.readline()
                if not raw:
                    break
                lines += 1
                try:
                    paper = json.loads(raw)
                    raw_id = paper["id"]
                    if not isinstance(raw_id, str):
                        raise ValueError("arXiv ID must be a string")
                    arxiv_id = raw_id.strip()
                    if not arxiv_id or not isinstance(paper.get("title"), str):
                        raise ValueError("invalid arXiv record")
                    batch.append((arxiv_id, paper["title"], str(paper.get("abstract") or ""),
                                  str(paper.get("authors") or ""), str(paper.get("categories") or ""),
                                  paper.get("update_date"), json.dumps(paper.get("versions") or []),
                                  json.dumps(paper, ensure_ascii=False)))
                    imported += 1
                except (ValueError, KeyError, TypeError, UnicodeDecodeError):
                    rejected += 1
            new_offset = fh.tell()
            complete = not bool(fh.peek(1)) if hasattr(fh, "peek") else new_offset == os.fstat(fh.fileno()).st_size
        with db:
            db.executemany("""INSERT INTO papers
                (arxiv_id,title,abstract,authors,categories,update_date,versions_json,raw_json)
                VALUES (?,?,?,?,?,?,?,?)
                ON CONFLICT(arxiv_id) DO UPDATE SET
                title=excluded.title,abstract=excluded.abstract,authors=excluded.authors,
                categories=excluded.categories,update_date=excluded.update_date,
                versions_json=excluded.versions_json,raw_json=excluded.raw_json""", batch)
            db.execute("""INSERT INTO ingest_state(source_key,offset,lines,imported,rejected)
                VALUES (?,?,?,?,?) ON CONFLICT(source_key) DO UPDATE SET
                offset=excluded.offset,lines=excluded.lines,
                imported=excluded.imported,rejected=excluded.rejected""",
                (key, new_offset, lines, imported, rejected))
        return {"lines": lines, "imported": imported, "rejected": rejected,
                "offset": new_offset, "complete": complete, "verified_complete": complete and rejected == 0,
                "batch": len(batch)}
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", required=True)
    parser.add_argument("--database", required=True)
    parser.add_argument("--max-lines", type=int, default=1000)
    args = parser.parse_args()
    print(json.dumps(ingest(args.snapshot, args.database, args.max_lines)))
