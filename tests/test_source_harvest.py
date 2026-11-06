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

if __name__=="__main__":
    unittest.main()
