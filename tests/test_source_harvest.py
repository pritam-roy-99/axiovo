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
