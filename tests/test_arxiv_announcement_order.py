"""Regression: late RSS must never roll back the early official catch-up."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts import arxiv_announcements as rss


class AnnouncementOrderTests(unittest.TestCase):
    def test_stale_rss_does_not_replace_newer_catchup(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "announcements.json"
            initial = {"announcement_date": "2026-11-09", "count": 1,
                       "complete": False, "early_release": True,
                       "papers": [{"id": "2611.00001"}]}
            target.write_text(json.dumps(initial), encoding="utf-8")
            stale = {"id": "2611.00002", "version": 1, "title": "Older paper",
                     "categories": ["quant-ph"], "abstract": "", "authors": []}
            with patch.object(rss, "TARGET", target), \
                 patch.object(rss, "ARCHIVES", ("quant-ph",)), \
                 patch.object(rss, "get", return_value=("2026-11-06", [stale])):
                rss.main()
            self.assertEqual(json.loads(target.read_text()), initial)

    def test_complete_rss_replaces_provisional_same_day(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "announcements.json"
            target.write_text(json.dumps({"announcement_date": "2026-11-09",
                "complete": False, "early_release": True, "papers": [{"id": "2611.00001"}]}))
            final = {"id": "2611.00001", "version": 1, "title": "Verified paper",
                     "categories": ["quant-ph"], "abstract": "", "authors": []}
            with patch.object(rss, "TARGET", target), \
                 patch.object(rss, "ARCHIVES", ("quant-ph",)), \
                 patch.object(rss, "get", return_value=("2026-11-09", [final])):
                rss.main()
            updated = json.loads(target.read_text())
            self.assertTrue(updated["complete"])
            self.assertEqual(updated["announcement_date"], "2026-11-09")


if __name__ == "__main__":
    unittest.main()
