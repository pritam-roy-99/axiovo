"""Offline source-count reconciliation and repair queue tests."""
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from scripts.audit_literature_coverage import audit_arxiv, audit_bio, audit_chem

class LiteratureHealthTests(unittest.TestCase):
    def test_arxiv_verified_then_missing_day_enqueued(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            (folder/"manifest.json").write_text(json.dumps({"days":{
                "2026-11-04":{"complete":True,"count":2}}}))
            (folder/"2026-11-04.json").write_text(json.dumps({
                "date":"2026-11-04","complete":True,"paper_count":2,"source_total":2,
                "papers":[{"id":"2611.00001","published":"2026-11-04T00:00:00Z"},
                          {"id":"2611.00002","published":"2026-11-04T00:01:00Z"}]}))
            result=audit_arxiv(folder,dt.date(2026,11,6),recent_days=2)
            self.assertEqual(result["verified_days"],1)
            self.assertIn("2026-11-05",result["repair_queue"])
            self.assertNotIn("2026-11-04",result["repair_queue"])
    def test_weekend_is_not_a_missing_arxiv_release(self):
        with tempfile.TemporaryDirectory() as temp:
            result=audit_arxiv(Path(temp),dt.date(2026,11,8),recent_days=3)
            self.assertNotIn("2026-11-07",result["repair_queue"])
            self.assertIn("2026-11-06",result["repair_queue"])

    def test_duplicate_papers_fail_source_count_check(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            (folder/"manifest.json").write_text(json.dumps({"days":{"2026-11-05":{"complete":True,"count":2}}}))
            (folder/"2026-11-05.json").write_text(json.dumps({
                "date":"2026-11-05","complete":True,"paper_count":2,"source_total":2,
                "papers":[{"id":"2611.00001","published":"2026-11-05"},{"id":"2611.00001","published":"2026-11-05"}]}))
            result=audit_arxiv(folder,dt.date(2026,11,6),recent_days=1)
            self.assertEqual(result["verified_days"],0)
            self.assertEqual(result["invalid_shards"][0]["issue"],"source_count_or_record_mismatch")
    def test_repair_queue_prioritized_before_historical_backfill(self):
        from unittest.mock import patch
        from scripts import arxiv_daily_archive as archive
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            (root/"docs/data").mkdir(parents=True)
            (root/"docs/data/literature-health.json").write_text(json.dumps({
                "arxiv":{"repair_queue":["2026-10-16","bad-date","2027-01-01"]}}))
            with patch.object(archive,"ROOT",root):
                selected=archive.select_days(dt.date(2026,11,6),{"days":{}},count=5)
            self.assertEqual(selected[0],dt.date(2026,11,5))
            self.assertIn(dt.date(2026,10,16),selected)
            self.assertNotIn(dt.date(2027,1,1),selected)

    def test_source_window_status_is_not_historical_completeness(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            bio=folder/"bio.json"
            bio.write_text(json.dumps({"source_total":100,"records_paginated":30,"complete_window":False,"papers":[1]}))
            self.assertEqual(audit_bio(bio)["status"],"window_incomplete")
            bio.write_text(json.dumps({"source_total":30,"records_paginated":30,"complete_window":True,"papers":[1]}))
            self.assertEqual(audit_bio(bio)["status"],"window_verified")
            self.assertTrue(audit_bio(bio)["not_a_full_archive"])
            chem=folder/"chem.json"
            chem.write_text(json.dumps({"prefix_exhausted":False,"papers":[]}))
            self.assertEqual(audit_chem(chem)["status"],"prefix_incomplete")

if __name__=="__main__": unittest.main()
