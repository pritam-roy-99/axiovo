import json
import tempfile
import unittest
from pathlib import Path
from scripts.build_archive_reliability import arxiv_report, build

class ArchiveReliabilityTests(unittest.TestCase):
    def test_crosslists_do_not_inflate_unique(self):
        batch={"complete":True,"count":2,"announcement_date":"2026-11-11","papers":[
            {"id":"2611.00001","version":1,"announce_type":"new","primary_category":"quant-ph","categories":["quant-ph","cs.IT"]},
            {"id":"2611.00002","version":2,"announce_type":"replace","primary_category":"quant-ph","categories":["quant-ph"]}]}
        report=arxiv_report(batch)
        self.assertTrue(report["complete"])
        self.assertEqual(report["indexed_unique"],2)
        self.assertEqual(report["categories"]["quant-ph"]["v1"],1)
        self.assertEqual(report["categories"]["quant-ph"]["replacements"],1)
        self.assertEqual(report["categories"]["cs.IT"]["unique"],1)

    def test_version_suffix_and_old_style_identifiers(self):
        batch={"complete":True,"count":2,"papers":[
            {"id":"2611.00001v2","version":2,"announce_type":"replace","categories":["quant-ph"]},
            {"id":"hep-th/9901001","version":1,"announce_type":"new","categories":["hep-th"]}]}
        result=arxiv_report(batch)
        self.assertTrue(result["complete"])
        self.assertEqual(result["indexed_unique"],2)
        self.assertEqual(result["categories"]["hep-th"]["v1"],1)

    def test_duplicates_cannot_be_certified(self):
        batch={"complete":True,"count":2,"papers":[{"id":"a"},{"id":"a"}]}
        self.assertFalse(arxiv_report(batch)["complete"])

    def test_partial_and_missing_sources_are_honest(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/"announcements.json").write_text(json.dumps({"complete":False,"count":0,"papers":[]}))
            (root/"chemrxiv.json").write_text(json.dumps({"prefix_exhausted":True,"papers":[{"id":"a"}]}))
            report=build(root)
            self.assertEqual(report["sources"]["arxiv"]["status"],"partial")
            self.assertFalse(report["sources"]["chemrxiv"]["complete"])
            self.assertEqual(report["sources"]["biorxiv"]["status"],"unavailable")

if __name__=="__main__":
    unittest.main()
