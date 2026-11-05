"""OAI-PMH is the all-category recent source; daily complete-date claims stay separate."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts import sync

class OAIIntegrationTests(unittest.TestCase):
    def test_all_categories_without_sampling_and_date_precision(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            path=root/"docs"/"data"/"oai-recent.json"
            path.parent.mkdir(parents=True)
            path.write_text(json.dumps({
                "complete_window":True,
                "papers":[
                    {"id":"2611.00001","title":"Mathematics result","created":"2026-11-04",
                     "updated":"2026-11-05","categories":["math.AG"],
                     "authors":["Researcher One"],"abstract":"Algebra"},
                    {"id":"2611.00002","title":"Physics result","created":"2026-11-04",
                     "updated":"2026-11-05","categories":["hep-th","quant-ph"],
                     "authors":["Researcher Two"],"abstract":"High-energy physics"},
                    {"id":"javascript:alert(1)","title":"Bad identifier","created":"2026-11-04"},
                    {"id":"2611.00003","title":"No created date","categories":["cs.CR"]}
                ]
            }),encoding="utf8")
            with patch.object(sync,"ROOT",root):
                records,complete=sync.read_oai_recent()
            self.assertTrue(complete)
            self.assertEqual({item["id"] for item in records},{"2611.00001","2611.00002"})
            self.assertEqual(records[0]["published_date_precision"],"day")
            self.assertEqual(records[0]["published"],"2026-11-04T00:00:00Z")
            self.assertEqual(records[1]["categories"],["hep-th","quant-ph"])
    def test_sync_avoids_category_only_sampling_when_oai_exists(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            source=root/"docs"/"data"/"oai-recent.json"
            source.parent.mkdir(parents=True)
            source.write_text(json.dumps({
                "complete_window":True,"papers":[
                    {"id":"2611.12345","title":"All-category paper","created":"2026-11-04",
                     "updated":"2026-11-05","categories":["cs.CR"],"authors":["A. Researcher"]}]}))
            target=root/"docs"/"data"/"feed.json"
            with patch.object(sync,"ROOT",root),patch.object(sync,"TARGET",target),\
                 patch.object(sync,"read_verified_daily_records",return_value=[]),\
                 patch.object(sync,"read_pinned_ids",return_value=[]),\
                 patch.object(sync,"fetch_by_ids",return_value=[]),\
                 patch.object(sync,"fetch_recent",side_effect=AssertionError("Category sampling should not be used")):
                sync.main()
            saved=json.loads(target.read_text())
            self.assertEqual(saved["paper_count"],1)
            self.assertTrue(saved["oai_window_complete"])
            self.assertIn("OAI-PMH",saved["source"])
            self.assertEqual(saved["papers"][0]["id"],"2611.12345")
    def test_missing_oai_keeps_a_fallback(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(sync,"ROOT",Path(folder)):
                self.assertEqual(sync.read_oai_recent(),([],False))

if __name__=="__main__":
    unittest.main()
