"""Regression coverage for the lightweight, non-destructive Pages release."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import stage_pages


class PagesStagingTests(unittest.TestCase):
    def test_reduced_artifact_keeps_app_and_verified_manifests(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            website = root / "docs"
            def write(path, body):
                target = website / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(body, encoding="utf8")
            day = {"2026-11-09": {"complete": True, "count": 1},
                   "2026-09-01": {"complete": True, "count": 1}}
            write("data/arxiv-days/manifest.json", json.dumps({"days": day}))
            write("data/arxiv-days/2026-11-09.json", '{"papers":[{"id":"new"}]}')
            write("data/arxiv-days/2026-09-01.json", '{"papers":[{"id":"old"}]}')
            for path in ("data/biorxiv.json", "data/chemrxiv.json",
                         "data/feed.json", "data/eprint.json"):
                write(path, '{"papers":[{"source":"verified"}]}')
            for path in ("data/index/v1/manifest.json",
                         "data/records/manifest.json"):
                write(path, '{"shards":{}}')
            for path in ("data/index/v1/arxiv/2026-09.json",
                         "data/records/biorxiv/2026-09.json"):
                write(path, '{"papers":[{"id":"historical"}]}')
            for path in ("arxiv-daily-archive.js", "copilot.html", "prooflab.html"):
                write(path, "safe static asset")

            destination = root / "release"
            with patch.object(stage_pages, "SOURCE", website):
                report = stage_pages.stage(destination, keep_days=21)
            self.assertGreater(report["saved_bytes"], 0)
            self.assertEqual(report["github_raw_daily_shards"], 1)
            self.assertEqual(report["monthly_records_retained_in_git"], 2)
            self.assertTrue((website / "data/eprint.json").exists())
            self.assertFalse((destination / "data/eprint.json").exists())
            self.assertTrue((website / "data/arxiv-days/2026-09-01.json").exists())
            self.assertFalse((destination / "data/arxiv-days/2026-09-01.json").exists())
            self.assertTrue((destination / "data/arxiv-days/2026-11-09.json").exists())
            self.assertTrue((destination / "data/records/manifest.json").exists())
            self.assertTrue((destination / "data/index/v1/manifest.json").exists())
            self.assertTrue((destination / "copilot.html").exists())
            self.assertTrue((destination / "prooflab.html").exists())


if __name__ == "__main__":
    unittest.main()
