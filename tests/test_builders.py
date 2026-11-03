"""Offline checks for first-paint HTML and topic feeds."""
from __future__ import annotations
import tempfile
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
from unittest.mock import patch
from scripts import build_snapshot, build_feeds

class BuildSmokeTests(unittest.TestCase):
    def test_pre_render_renders_real_metadata_and_escapes_html(self):
        sample={"papers":[{"id":"2608.13942","title":"Research on <Zeno>","abstract":"A > B",
            "authors":["A. Researcher"],"primary_category":"quant-ph",
            "published":"2026-08-14T00:00:00Z","updated":"2026-08-14T00:00:00Z"}]}
        output=build_snapshot.first_paint(sample)
        self.assertIn("2608.13942",output)
        self.assertIn("&lt;Zeno&gt;",output)
        self.assertNotIn("<Zeno>",output)
        self.assertIn("Read on arXiv",output)

    def test_feed_builder_creates_valid_atom(self):
        sample=[{"id":"2608.13942","title":"Research on Zeno","abstract":"Physical abstract",
                 "authors":["A. Researcher"],"published":"2026-08-14T00:00:00Z",
                 "updated":"2026-08-14T00:00:00Z"}]
        with tempfile.TemporaryDirectory() as tempdir:
            with patch.object(build_feeds,"OUTPUT",Path(tempdir)):
                build_feeds.make_feed(sample,"Test feed","test","2026-11-03T00:00:00Z")
            root=ET.parse(Path(tempdir)/"test.xml").getroot()
            self.assertTrue(root.tag.endswith("feed"))
            self.assertEqual(len(list(root.iter("{http://www.w3.org/2005/Atom}entry"))),1)

if __name__=="__main__":
    unittest.main()
