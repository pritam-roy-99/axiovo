#!/usr/bin/env python3
"""Feature 1 scale and correctness smoke test using 10,000 synthetic records.

Runs entirely offline. Synthesized records are never published or offered as
real arXiv papers. The test creates only a temporary local SQLite database.
"""
from __future__ import annotations
from pathlib import Path
import tempfile
import time
from backend.import_snapshots import import_papers, open_database

def main():
    fixtures = []
    for i in range(10000):
        fixtures.append({
            "id": f"2501.{i:05d}",
            "version": "1",
            "title": f"Quantum network method {i}",
            "abstract": f"Entanglement networking benchmark {i}",
            "authors": [f"Researcher {i % 200}"],
            "categories": ["quant-ph", "cs.IT"] if i % 10 == 0 else ["quant-ph"],
            "primary_category": "quant-ph",
            "published": "2025-01-15T12:00:00Z",
            "updated": "2025-01-15T12:00:00Z"
        })
    with tempfile.TemporaryDirectory() as tmp:
        con = open_database(Path(tmp) / "stress.sqlite")
        try:
            start=time.monotonic()
            first=import_papers(con,"arxiv",fixtures)
            elapsed=time.monotonic()-start
            assert first["accepted"]==10000 and first["indexed_total"]==10000, first
            row=con.execute("SELECT COUNT(*) FROM papers_fts WHERE papers_fts MATCH 'quantum AND network'").fetchone()
            assert row[0]==10000, row
            joined=con.execute(
                "SELECT count(*) FROM papers p JOIN paper_authors pa ON pa.paper_id=p.id "
                "JOIN authors a ON a.id=pa.author_id WHERE a.normalized_name='researcher 17'"
            ).fetchone()[0]
            assert joined==50, joined
            dated=con.execute(
                "SELECT count(*) FROM papers WHERE first_submitted_at >= ? AND first_submitted_at < ?",
                ("2025-01-01", "2025-02-01")
            ).fetchone()[0]
            assert dated==10000, dated
            categories=con.execute("SELECT count(*) FROM paper_categories").fetchone()[0]
            assert categories==11000, categories
            again=import_papers(con,"arxiv",fixtures)
            assert again["indexed_total"]==10000 and again["accepted"]==10000, again
            assert con.execute("SELECT count(*) FROM authors").fetchone()[0]==10000
            assert con.execute("SELECT count(*) FROM paper_versions").fetchone()[0]==10000
            print(f"PASS: 10,000 synthetic records; authors/date/category/FTS queries; repeat import; {elapsed:.2f}s first import")
        finally:
            con.close()

if __name__=="__main__":
    main()
