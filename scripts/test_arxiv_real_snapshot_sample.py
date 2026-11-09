#!/usr/bin/env python3
"""Test the SQLite importer against a small, real public arXiv metadata mirror sample.

The Hugging Face mirror is not the authoritative Cornell snapshot. This is a
schema-compatibility smoke test only, never a production data ingestion path.
"""
import json
import sqlite3
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path
from scripts.arxiv_kaggle_snapshot_import import ingest

DATASET = "librarian-bots/arxiv-metadata-snapshot"
URL = "https://datasets-server.huggingface.co/rows?" + urllib.parse.urlencode({
    "dataset": DATASET, "config": "default", "split": "train", "offset": 0, "length": 10
})

def main():
    request = urllib.request.Request(URL, headers={"User-Agent": "Axiovo metadata compatibility test/1.0"})
    with urllib.request.urlopen(request, timeout=35) as response:
        payload = json.load(response)
    rows = [item["row"] for item in payload["rows"]]
    if len(rows) != 10:
        raise RuntimeError(f"Expected 10 real metadata records, got {len(rows)}")
    with tempfile.TemporaryDirectory() as directory:
        snapshot = Path(directory) / "real-sample.jsonl"
        db = Path(directory) / "sample.db"
        with snapshot.open("w", encoding="utf8") as stream:
            for record in rows:
                if not isinstance(record.get("id"), str) or not isinstance(record.get("title"), str):
                    raise RuntimeError("Missing real metadata fields")
                stream.write(json.dumps(record, ensure_ascii=False) + "\n")
        first = ingest(snapshot, db, 4)
        second = ingest(snapshot, db, 6)
        third = ingest(snapshot, db, 10)
        with sqlite3.connect(db) as conn:
            count = conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
            ids = conn.execute("SELECT arxiv_id FROM papers ORDER BY arxiv_id LIMIT 3").fetchall()
        report = {"source": DATASET, "source_type": "third-party mirror of Cornell metadata",
                  "first_batch": first["batch"], "second_batch": second["batch"],
                  "third_batch": third["batch"], "rows": count,
                  "verified_complete": second["verified_complete"], "sample_ids": [x[0] for x in ids]}
        print(json.dumps(report))
        if count != 10 or not second["verified_complete"] or third["batch"] != 0:
            raise RuntimeError("Importer failed real-sample verification")

if __name__ == "__main__":
    main()
