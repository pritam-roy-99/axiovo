import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from scripts.arxiv_oai_sqlite import import_pages

class ImportTests(unittest.TestCase):
    def test_idempotent_import_and_tombstone(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "pages"
            source.mkdir()
            db = Path(tmp) / "data.sqlite"
            (source / "page-00000000.jsonl").write_text(json.dumps({
                "oai_identifier": "oai:arXiv.org:1234.5678",
                "id": "1234.5678", "title": "Example", "categories": ["quant-ph"]
            }) + "\n")
            self.assertEqual(import_pages(source, db), 1)
            self.assertEqual(import_pages(source, db), 0)
            (source / "page-00000001.jsonl").write_text(json.dumps({
                "oai_identifier": "oai:arXiv.org:1234.5678", "deleted": True
            }) + "\n")
            self.assertEqual(import_pages(source, db), 1)
            with sqlite3.connect(db) as conn:
                self.assertEqual(conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0], 1)
                self.assertEqual(conn.execute("SELECT deleted FROM papers").fetchone()[0], 1)

if __name__ == "__main__":
    unittest.main()
