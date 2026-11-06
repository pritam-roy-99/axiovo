"""Exact UTC submission day harvesting without silent result limits."""
import datetime as dt
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import urllib.parse
import urllib.error

from scripts import arxiv_daily_archive as ar

PREFIX='''<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom"
 xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
<opensearch:totalResults>{total}</opensearch:totalResults>
{items}
</feed>'''

def item(number, day="2026-11-05"):
    return f"""<entry><id>http://arxiv.org/abs/2611.{number:05d}v1</id>
    <title>Title {number}</title><summary>Abstract {number}</summary>
    <published>{day}T02:00:00Z</published><updated>{day}T02:00:00Z</updated>
    <author><name>Author {number}</name></author><category term="quant-ph"/></entry>"""

def page(total, items):
    return PREFIX.format(total=total, items="".join(items)).encode("utf8")

class Response:
    def __init__(self, value): self.value=value
    def __enter__(self): return self
    def __exit__(self,*args): return False
    def read(self): return self.value

def json_dump(obj): return json.dumps(obj)

class DailyArchiveTests(unittest.TestCase):
    def test_query_is_full_day_without_category_constraint(self):
        url=ar.query_url(dt.date(2026,11,5),0)
        p=urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
        self.assertEqual(p["search_query"],["submittedDate:[202611050000 TO 202611052359]"])
        self.assertEqual(p["sortBy"],["submittedDate"])
        self.assertNotIn("cat:",url)
    def test_fully_paginates_and_retains_all_authors(self):
        urls=[]
        def opener(req, timeout):
            args=urllib.parse.parse_qs(urllib.parse.urlsplit(req.full_url).query)
            start=int(args["start"][0]);urls.append(start)
            if start==0:return Response(page(3,[item(1),item(2)]))
            if start==2:return Response(page(3,[item(3)]))
            raise AssertionError("Unexpected page")
        result=ar.fetch_day(dt.date(2026,11,5),opener=opener,sleep=lambda *_:None)
        self.assertEqual(result["paper_count"],3)
        self.assertEqual(urls,[0,2])
        self.assertEqual(len(result["papers"]),3)
        self.assertEqual({x["id"] for x in result["papers"]},{"2611.00001","2611.00002","2611.00003"})
    def test_429_retries_with_retry_after_before_certifying(self):
        attempts=[]; waits=[]
        def throttled(req,timeout):
            attempts.append(req.full_url)
            if len(attempts)==1:
                raise urllib.error.HTTPError(req.full_url,429,"Too Many Requests",{"Retry-After":"4"},None)
            return Response(page(1,[item(1,day="2026-11-04")]))
        result=ar.fetch_day(dt.date(2026,11,4),opener=throttled,sleep=waits.append)
        self.assertEqual(result["paper_count"],1)
        self.assertEqual(len(attempts),2)
        self.assertEqual(waits,[4])
    def test_current_utc_day_is_never_certified(self):
        with tempfile.TemporaryDirectory() as path:
            folder=Path(path)
            with patch.object(ar,"ARCHIVE",folder),patch.object(ar,"MANIFEST",folder/"manifest.json"),patch.object(ar.time,"sleep",lambda *_:None):
                results=ar.run(today=dt.date(2026,11,5),days=[dt.date(2026,11,5)],
                   fetcher=lambda day: {"date":day.isoformat(),"complete":True,"source_total":0,
                                        "paper_count":0,"papers":[],"fetched_at":"2026-11-05T02:00:00Z"})
                self.assertEqual(results["complete_days"],0)
                self.assertFalse(results["manifest"]["days"])
    def test_partial_page_must_not_claim_complete(self):
        def opener(req,timeout):
            return Response(page(3,[item(1)]) if "start=0" in req.full_url else page(3,[]))
        with self.assertRaises(RuntimeError):
            ar.fetch_day(dt.date(2026,11,5),opener=opener,sleep=lambda *_:None)
    def test_empty_arxiv_day_is_not_certified(self):
        def opener(req,timeout):
            return Response(page(0,[]))
        with self.assertRaisesRegex(RuntimeError,"Zero records"):
            ar.fetch_day(dt.date(2026,11,5),opener=opener,sleep=lambda *_:None)

    def test_no_fabricated_completed_dates_after_failure(self):
        with tempfile.TemporaryDirectory() as path:
            folder=Path(path)
            with patch.object(ar,"ARCHIVE",folder),patch.object(ar,"MANIFEST",folder/"manifest.json"),patch.object(ar.time,"sleep",lambda *_:None):
                fake=lambda day: {**{
                    "date":day.isoformat(),"complete":True,"source_total":0,"paper_count":0,
                    "fetched_at":"2026-11-05T12:00:00Z","papers":[]}}
                def sometimes(day):
                    if day==dt.date(2026,11,4):raise OSError("API unavailable")
                    return fake(day)
                r=ar.run(today=dt.date(2026,11,5),count=4,fetcher=sometimes)
                self.assertEqual(r["complete_days"],0)
                self.assertNotIn("2026-11-04",r["manifest"]["days"])
                self.assertNotIn("2026-11-03",r["manifest"]["days"])
                self.assertFalse((folder/"2026-11-03.json").exists())
    def test_feed_sync_uses_all_verified_recent_day_papers(self):
        from scripts import sync
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)/"docs"/"data"/"arxiv-days"
            folder.mkdir(parents=True)
            (folder/"manifest.json").write_text(json_dump({
                "days":{"2026-11-05":{"complete":True,"count":3}}}))
            papers=[{"id":f"2611.{i:05d}","title":f"Paper {i}",
                    "published":"2026-11-05T02:00:00Z","updated":"2026-11-05T02:00:00Z",
                    "version":1,"categories":["quant-ph"]} for i in range(1,4)]
            (folder/"2026-11-05.json").write_text(json_dump({
                "date":"2026-11-05","complete":True,"paper_count":3,"source_total":3,"papers":papers}))
            with patch.object(sync,"ROOT",Path(tmp)):
                result=sync.read_verified_daily_records(today=dt.date(2026,11,5))
            self.assertEqual(len(result),3)
            self.assertEqual({p["id"] for p in result},{"2611.00001","2611.00002","2611.00003"})

    def test_manual_older_date_window_and_bounded_range(self):
        days=ar.manual_days("2024-11-05","2024-11-07")
        self.assertEqual(len(days),3)
        self.assertEqual(days[0],dt.date(2024,11,5))
        self.assertEqual(days[-1],dt.date(2024,11,7))
        with self.assertRaises(ValueError):
            ar.manual_days("2024-01-01","2024-03-01")
        with self.assertRaises(ValueError):
            ar.manual_days("2024-11-07","2024-11-05")
        with self.assertRaises(ValueError):
            ar.manual_days("2027-01-01","2027-01-02")
        with self.assertRaises(ValueError):
            ar.manual_days(dt.datetime.now(dt.timezone.utc).date().isoformat(), dt.datetime.now(dt.timezone.utc).date().isoformat())

    def test_next_missing_days_backfilled(self):
        # Isolate the historical-scanning test from a live published repair
        # queue. Repair priority is tested separately in test_literature_coverage.
        with tempfile.TemporaryDirectory() as tmp, patch.object(ar,"ROOT",Path(tmp)):
            days=ar.select_days(dt.date(2026,11,5),{"days":{"2026-11-02":{"complete":True}}},count=5)
        self.assertEqual(days[:4],[dt.date(2026,11,4),dt.date(2026,11,3),dt.date(2026,11,2),dt.date(2026,11,1)])
        self.assertEqual(len(days),5)

    def test_bad_legacy_zero_day_gets_revalidated(self):
        with tempfile.TemporaryDirectory() as path:
            folder=Path(path)
            (folder/"manifest.json").write_text(json.dumps({"schema":1,"days":{
                "2026-11-03":{"complete":True,"count":0},
                "2026-11-02":{"complete":True,"count":7}}}))
            with patch.object(ar,"ARCHIVE",folder),patch.object(ar,"MANIFEST",folder/"manifest.json"),patch.object(ar.time,"sleep",lambda *_:None):
                result=ar.run(today=dt.date(2026,11,5),days=[],fetcher=lambda day:None)
                self.assertFalse(result["manifest"]["days"]["2026-11-03"]["complete"])
                self.assertTrue(result["manifest"]["days"]["2026-11-02"]["complete"])

if __name__=="__main__": unittest.main()
