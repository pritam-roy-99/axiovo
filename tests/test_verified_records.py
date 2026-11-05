"""Phase 1 trust tests: canonical sources, dates, versions and review status."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("verified", ROOT/"scripts"/"build_verified_records.py")
verified = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verified)


class VerifiedRecordTests(unittest.TestCase):
    def test_arxiv_original_version_and_date(self):
        p = verified.normalize("arxiv", {
            "id": "2611.00123v2", "title": "Example source title",
            "published": "2026-11-05T00:00:00Z", "categories": ["quant-ph", "math-ph"]
        }, "2026-11-06T05:00:00Z")
        self.assertEqual(p["landing_url"], "https://arxiv.org/abs/2611.00123v2")
        self.assertEqual(p["submitted_date"], "2026-11-05")
        self.assertEqual(p["version"], 2)
        self.assertEqual(p["tag_status"], "needs_review")
        self.assertEqual(p["subtopics"], [])

    def test_announcement_date_does_not_create_submission_date(self):
        p = verified.normalize("arxiv", {
            "id": "2611.00123", "title": "Example announcement",
            "announcement_date": "2026-11-06"
        })
        self.assertIsNone(p["submitted_date"])
        self.assertEqual(p["announced_date"], "2026-11-06")

    def test_unverified_record_is_rejected(self):
        self.assertIsNone(verified.normalize("arxiv", {"title": "Invented"}))
        self.assertIsNone(verified.normalize("arxiv", {"id": "invalid", "title": "Invented"}))
        self.assertIsNone(verified.normalize("biorxiv", {"doi": "10.26434/abcd", "title": "Wrong archive"}))
        self.assertIsNone(verified.normalize("chemrxiv", {"doi": "10.1101/12345", "title": "Wrong archive"}))

    def test_two_biorxiv_prefixes(self):
        for doi in ("10.1101/2020.01.01.123456", "10.64898/2026.10.21.760754"):
            p = verified.normalize("biorxiv", {"doi": doi, "title": "Verified title"})
            self.assertEqual(p["landing_url"], "https://www.biorxiv.org/content/"+doi)
            self.assertTrue(p["pdf_url"].endswith(".full.pdf"))

    def test_canonical_field_set_is_complete(self):
        p = verified.normalize("arxiv", {"id": "2611.00125", "title": "Record"})
        self.assertEqual(set(p), set(verified.FIELDS))


if __name__ == "__main__":
    unittest.main()
