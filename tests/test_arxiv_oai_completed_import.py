import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from scripts.arxiv_oai_completed_import import import_completed_windows

class CompletedImportTests(unittest.TestCase):
    def test_skips_partial_and_imports_distinct_complete_windows(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "windows"
            root.mkdir()
            for name, complete in [("2020-01-01_2020-01-31", True),
                                   ("2020-02-01_2020-02-29", False),
                                   ("2020-03-01_2020-03-31", True)]:
                folder = root / name
                folder.mkdir()
                (folder / "checkpoint.json").write_text(json.dumps({
                    "complete": complete, "pages": 1,
                    "next_token": "" if complete else "token"}))
                (folder / "page-00000000.jsonl").write_text(json.dumps({
                    "oai_identifier": "oai:arXiv.org:" + name,
                    "id": name, "title": name}) + "\n")
            db = Path(tmp) / "index.sqlite"
            result = import_completed_windows(root, db)
            self.assertEqual(len(result["imported"]), 2)
            self.assertEqual(len(result["skipped"]), 1)
            self.assertEqual(sum(result["imported"].values()), 2)
            with sqlite3.connect(db) as conn:
                self.assertEqual(conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0], 2)
            result2 = import_completed_windows(root, db)
            self.assertEqual(sum(result2["imported"].values()), 0)

    def test_missing_shard_blocks_import(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "windows"
            folder = root / "2020-01-01_2020-01-31"
            folder.mkdir(parents=True)
            (folder / "checkpoint.json").write_text(json.dumps({
                "complete": True, "pages": 2, "next_token": ""}))
            (folder / "page-00000000.jsonl").write_text("{}\n")
            result = import_completed_windows(root, Path(tmp) / "index.sqlite")
            self.assertIn(folder.name, result["skipped"])

if __name__ == "__main__":
    unittest.main()
