"""Early arXiv catch-up ingestion must not wait for RSS midnight Eastern."""
import datetime as dt
import unittest
from scripts.arxiv_catchup import parse_listing, harvest, target_announcement_date

HTML = """<!doctype html><html><body>
<h3>New submissions</h3>
<dl>
<dt><span class="list-identifier"><a href="/abs/2611.01234v1">arXiv:2611.01234</a></span></dt>
<dd><div class="meta"><div class="list-title mathjax">Title: Quantum steering witnesses</div>
<div class="list-authors">Authors: Alice Example, Bob Example</div>
<p class="mathjax">An experimental witness of quantum steering.</p></div></dd>
</dl>
<h3>Cross-lists</h3>
<dl>
<dt><span class="list-identifier"><a href="/abs/2611.01235v1">arXiv:2611.01235</a></span></dt>
<dd><div class="meta"><div class="list-title mathjax">Title: Quantum information across fields</div>
<div class="list-authors">Authors: Alice Example</div></div></dd>
</dl></body></html>
"""

class EarlyArxivCatchupTests(unittest.TestCase):
    def test_public_announcement_date_before_rss_refresh(self):
        # 02:06 UTC Mon 9 November is 21:06 EST Sun 8 November.
        early = dt.datetime(2026, 11, 9, 2, 6, tzinfo=dt.timezone.utc)
        self.assertEqual(target_announcement_date(early), "2026-11-09")
        later = dt.datetime(2026, 11, 9, 6, 0, tzinfo=dt.timezone.utc)
        self.assertEqual(target_announcement_date(later), "2026-11-09")

    def test_source_identifiers_and_types(self):
        rows, listed = parse_listing(HTML, "quant-ph", "2026-11-09")
        self.assertEqual((len(rows), listed), (2, 2))
        self.assertEqual(rows[0]["title"], "Quantum steering witnesses")
        self.assertEqual(rows[0]["authors"], ["Alice Example", "Bob Example"])
        self.assertEqual(rows[0]["announcement_date"], "2026-11-09")
        self.assertEqual(rows[0]["announce_type"], "new")
        self.assertEqual(rows[1]["announce_type"], "cross")
        self.assertEqual(rows[1]["categories"], ["quant-ph"])

    def test_never_invent_empty_source_papers(self):
        with self.assertRaises(ValueError):
            parse_listing("<html><body><p>No papers</p></body></html>", "quant-ph", "2026-11-09")

    def test_cross_category_deduplication_never_implies_rss_completeness(self):
        now = dt.datetime(2026, 11, 9, 2, 6, tzinfo=dt.timezone.utc)
        def fake(archive, day):
            self.assertEqual(day, "2026-11-09")
            return parse_listing(HTML, archive, day)
        result = harvest(now=now, fetch=fake, archives=("quant-ph", "cs"))
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["papers"][0]["categories"], ["cs", "quant-ph"])
        self.assertFalse(result["complete"])
        self.assertTrue(result["early_release"])

if __name__ == "__main__":
    unittest.main()
