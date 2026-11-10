"""Offline regression checks for source-complete metadata pagination."""
import unittest
from scripts import sync_biorxiv as bio
from scripts import sync_chemrxiv as chem

class SourceHarvestTests(unittest.TestCase):
    def test_biorxiv_cursor_uses_actual_page_length_and_reports_total(self):
        urls=[]
        def fetch(url):
            urls.append(url)
            if "/0/json" in url:
                return {"messages":[{"total":"3"}],"collection":[
                    {"doi":"10.1101/2026.11.01.000001","title":"One","version":"1"},
                    {"doi":"10.64898/2026.11.01.000002","title":"Two","version":"1"}]}
            if "/2/json" in url:
                return {"messages":[{"total":"3"}],"collection":[
                    {"doi":"10.1101/2026.11.01.000003","title":"Three","version":"1"}]}
            raise AssertionError("Unexpected cursor "+url)
        records,status=bio.fetch_window("2026-11-01","2026-11-06",fetcher=fetch,sleep=lambda *_:None)
        self.assertEqual(len(records),3)
        self.assertEqual(len(urls),2)
        self.assertTrue(status["complete_window"])
        self.assertEqual(status["records_paginated"],3)

    def test_biorxiv_failed_refresh_preserves_published_snapshot(self):
        import json
        import tempfile
        from pathlib import Path
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "biorxiv.json"
            original = {"generated_at": "2026-11-09T00:00:00Z",
                        "count": 1, "papers": [{"doi": "10.1101/2026.11.01.000001",
                        "title": "Previously verified paper"}]}
            target.write_text(json.dumps(original), encoding="utf8")
            with patch.object(bio, "TARGET", target), patch.object(
                bio, "fetch_window", side_effect=TimeoutError("upstream stalled")
            ), patch.dict("os.environ", {"AXIOVO_BIORXIV_LOOKBACK_DAYS": "4"}):
                with self.assertRaises(SystemExit) as caught:
                    bio.main()
                self.assertEqual(caught.exception.code, 1)
            self.assertEqual(json.loads(target.read_text(encoding="utf8")), original)

    def test_biorxiv_recent_window_merges_old_records_without_data_loss(self):
        import json
        import tempfile
        from pathlib import Path
        from datetime import datetime, timezone, timedelta
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "biorxiv.json"
            old = {"doi": "10.1101/2025.01.01.000001", "title": "Older verified paper",
                   "date": "2025-01-01", "version": "1"}
            target.write_text(json.dumps({"papers": [old]}), encoding="utf8")
            new = {"doi": "10.1101/2026.11.10.000001", "title": "New verified paper",
                   "date": "2026-11-10", "version": "1"}
            status = {"complete_window": True, "source_total": 1,
                      "records_paginated": 1, "pages": 1}
            with patch.object(bio, "TARGET", target), patch.object(
                bio, "fetch_window", return_value=([new], status)
            ) as fetch, patch.dict("os.environ",
                                  {"AXIOVO_BIORXIV_LOOKBACK_DAYS": "4"}):
                bio.main()
                requested_start, requested_end = fetch.call_args.args[:2]
                self.assertEqual(requested_end - requested_start, timedelta(days=4))
            published = json.loads(target.read_text(encoding="utf8"))
            self.assertEqual(published["count"], 2)
            self.assertEqual({p["doi"] for p in published["papers"]},
                             {old["doi"], new["doi"]})
            self.assertTrue(published["complete_window"])

    def test_biorxiv_never_certifies_truncated_window(self):
        def fetch(url):
            return {"messages":[{"total":"1000"}],"collection":[
                {"doi":"10.1101/2026.11.01.000001","title":"One","version":"1"}]}
        _,status=bio.fetch_window("2026-11-01","2026-11-06",fetcher=fetch,sleep=lambda *_:None,max_pages=1)
        self.assertFalse(status["complete_window"])

    def test_biorxiv_rejects_empty_source_window(self):
        with self.assertRaises(ValueError):
            bio.fetch_window("2026-11-01","2026-11-06",
                             fetcher=lambda url:{"collection":[]},sleep=lambda *_:None)

    def test_chemrxiv_prefix_pagination_and_provenance(self):
        requests=[]
        def fetch(url):
            requests.append(url)
            if "prefixes/" in url:
                return {"message":{"items":[
                    {"DOI":"10.26434/chemrxiv.999/v1","title":["Source-linked test"],"publisher":"ChemRxiv"}]}}
            return {"message":{"items":[]}}
        rows,status=chem.fetch(fetcher=fetch,sleep=lambda *_:None)
        self.assertEqual(len(rows),1)
        self.assertTrue(status["prefix_exhausted"])
        self.assertEqual(chem.normalize(rows[0])["doi"],"10.26434/chemrxiv.999/v1")
        self.assertEqual(len(requests),2)
        self.assertIsNone(chem.normalize({"DOI":"10.1234/unknown","title":["Other paper"]}))

    def test_chemrxiv_checkpoint_advances_across_runs(self):
        import urllib.parse
        def fetch(url):
            if "query.bibliographic=" in url:
                return {"message":{"items":[]}}
            q=urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
            cursor=q.get("cursor",["*"])[0]
            if cursor=="*":
                return {"message":{"items":[
                    {"DOI":f"10.26434/chemrxiv.checkpoint{i}/v1",
                     "title":[f"Verified synthetic test {i}"],"publisher":"ChemRxiv"}
                    for i in range(250)],"next-cursor":"PAGE-2"}}
            self.assertEqual(cursor,"PAGE-2")
            return {"message":{"items":[
                {"DOI":"10.26434/chemrxiv.checkpoint250/v1",
                 "title":["Last synthetic record"],"publisher":"ChemRxiv"}]}}
        first,status=chem.fetch(fetcher=fetch,sleep=lambda *_:None,max_pages=1)
        self.assertEqual(status["prefix_next_cursor"],"PAGE-2")
        self.assertFalse(status["prefix_exhausted"])
        second,finished=chem.fetch(fetcher=fetch,sleep=lambda *_:None,max_pages=1,
                                    cursor_start=status["prefix_next_cursor"])
        self.assertEqual(len(second),1)
        self.assertTrue(finished["prefix_exhausted"])
        self.assertEqual(finished["prefix_next_cursor"],"*")

    def test_chemrxiv_persists_checkpoint_without_matching_new_papers(self):
        import tempfile
        import json
        from pathlib import Path
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as temp:
            target=Path(temp)/"chemrxiv.json"
            previous={"papers":[{"doi":"10.26434/chemrxiv.cached","title":"Cached verified work",
                "date":"2026-10-01"}],"prefix_next_cursor":"PAGE-2",
                "prefix_exhausted":False}
            target.write_text(json.dumps(previous))
            def empty_page(fetcher=chem.get_json,sleep=None,max_pages=8,cursor_start="*"):
                self.assertEqual(cursor_start,"PAGE-2")
                return [],{"prefix_pages_checked":1,"prefix_exhausted":False,
                   "prefix_scan_error":False,"prefix_cursor_start":"PAGE-2",
                   "prefix_next_cursor":"PAGE-3","checks":[{"page":1,"returned":250}]}
            with patch.object(chem,"TARGET",target),patch.object(chem,"fetch",empty_page):
                chem.main()
            result=json.loads(target.read_text())
            self.assertEqual(result["prefix_next_cursor"],"PAGE-3")
            self.assertEqual(result["count"],1)
            self.assertEqual(result["papers"][0]["doi"],"10.26434/chemrxiv.cached")

if __name__=="__main__":
    unittest.main()
