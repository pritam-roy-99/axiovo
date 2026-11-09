"""Idempotent SQLite import for completed arXiv OAI page shards.

Keep the database and page shards on persistent storage. This does not expose
the database to the public website; a separate search API/export is required.
"""
import argparse
import json
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS papers (
    oai_identifier TEXT PRIMARY KEY,
    arxiv_id TEXT,
    title TEXT,
    abstract TEXT,
    created TEXT,
    updated TEXT,
    categories TEXT,
    oai_datestamp TEXT,
    deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS papers_arxiv_id ON papers(arxiv_id);
CREATE INDEX IF NOT EXISTS papers_created ON papers(created);
CREATE TABLE IF NOT EXISTS imported_pages (
    page_name TEXT PRIMARY KEY,
    record_count INTEGER NOT NULL
);
"""

def import_pages(source, database):
    source = Path(source)
    database = Path(database)
    database.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with sqlite3.connect(database) as conn:
        conn.executescript(SCHEMA)
        for page in sorted(source.glob("page-*.jsonl")):
            if conn.execute("SELECT 1 FROM imported_pages WHERE page_name=?", (page.name,)).fetchone():
                continue
            records = [json.loads(line) for line in page.read_text(encoding="utf-8").splitlines()]
            # One transaction per page: interrupted imports can be retried safely.
            with conn:
                for r in records:
                    conn.execute(
                        """INSERT INTO papers
                        (oai_identifier, arxiv_id, title, abstract, created, updated,
                         categories, oai_datestamp, deleted)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(oai_identifier) DO UPDATE SET
                         arxiv_id=excluded.arxiv_id, title=excluded.title,
                         abstract=excluded.abstract, created=excluded.created,
                         updated=excluded.updated, categories=excluded.categories,
                         oai_datestamp=excluded.oai_datestamp, deleted=excluded.deleted""",
                        (r["oai_identifier"], r.get("id"), r.get("title"),
                         r.get("abstract"), r.get("created"), r.get("updated"),
                         json.dumps(r.get("categories", [])), r.get("oai_datestamp"),
                         int(r.get("deleted", False)))
                    )
                conn.execute("INSERT INTO imported_pages VALUES (?, ?)", (page.name, len(records)))
            count += len(records)
    return count

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--database", required=True)
    args = parser.parse_args()
    print("Imported records:", import_pages(args.source, args.database))
