"""Regression tests for small cross-archive freshness reports."""
import json
import tempfile
import unittest
from pathlib import Path
from scripts.build_source_freshness import generate

class FreshnessManifestTests(unittest.TestCase):
    def test_announcement_date_and_completeness_are_reported_separately(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/"announcements.json").write_text(json.dumps({
                "checked_at":"2026-11-08T10:00:00Z",
                "announcement_date":"2026-11-06",
                "complete":True,"count":2,
                "papers":[{"id":"2611.00001"},{"id":"2611.00002"}]}))
            manifest=generate(root)
            state=manifest["sources"]["arxiv"]
            self.assertEqual(state["announcement_date"],"2026-11-06")
            self.assertTrue(state["announcement_complete"])
            self.assertEqual(state["indexed_records"],2)
            self.assertIn("biorxiv",manifest["sources"])
            self.assertLess((root/"source-freshness.json").stat().st_size,8000)

    def test_a_recent_check_does_not_mean_a_complete_batch(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/"announcements.json").write_text(json.dumps({
                "checked_at":"2026-11-08T10:00:00Z",
                "announcement_date":"2026-11-06","complete":False,"count":3,
                "papers":[{"id":"2611.00001"}]}))
            state=generate(root)["sources"]["arxiv"]
            self.assertTrue(state["available"])
            self.assertFalse(state["announcement_complete"])
            self.assertEqual(state["indexed_records"],1)

if __name__=="__main__":
    unittest.main()
