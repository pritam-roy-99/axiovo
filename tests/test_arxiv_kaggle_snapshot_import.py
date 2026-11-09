import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from scripts.arxiv_kaggle_snapshot_import import ingest

class SnapshotImportTests(unittest.TestCase):
    def test_resume_and_idempotence(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "snapshot.json"
            db = Path(tmp) / "papers.db"
            records = [
                {"id": "hep-th/9901001", "title": "First", "abstract": "A", "authors": "A", "categories": "hep-th", "versions": [{"version": "v1"}]},
                {"id": "2401.12345", "title": "Second", "abstract": "B", "authors": "B", "categories": "quant-ph", "versions": []},
            ]
            src.write_text("".join(json.dumps(x)+"\n" for x in records))
            one = ingest(src, db, 1)
            self.assertFalse(one["complete"])
            self.assertEqual(one["imported"], 1)
            two = ingest(src, db, 1)
            self.assertTrue(two["complete"])
            self.assertEqual(two["imported"], 2)
            three = ingest(src, db, 1)
            self.assertEqual(three["batch"], 0)
            with sqlite3.connect(db) as conn:
                self.assertEqual(conn.execute("SELECT count(*) FROM papers").fetchone()[0], 2)

    def test_invalid_record_counted_without_aborting(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "snapshot.json"
            db = Path(tmp) / "papers.db"
            src.write_text('not json\n{"id":"1234.5678","title":"Valid"}\n')
            result = ingest(src, db, 10)
            self.assertEqual(result["rejected"], 1)
            self.assertEqual(result["imported"], 1)
            self.assertTrue(result["complete"])

    def test_batch_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "snapshot.json"
            src.write_text("")
            with self.assertRaises(ValueError):
                ingest(src, Path(tmp)/"x.db", 0)

if __name__ == "__main__":
    unittest.main()
