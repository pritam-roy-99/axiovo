"""Offline checks for generated Atom topic feeds."""
from __future__ import annotations
import tempfile
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
from unittest.mock import patch
from scripts import build_feeds

class BuildSmokeTests(unittest.TestCase):
    def test_feed_builder_creates_valid_atom(self):
        sample=[{"id":"2608.13942","title":"Research on <Zeno>","abstract":"A > B & C",
                 "authors":["A. Researcher"],"published":"2026-08-14T00:00:00Z",
                 "updated":"2026-08-14T00:00:00Z"}]
        with tempfile.TemporaryDirectory() as tempdir:
            with patch.object(build_feeds,"OUTPUT",Path(tempdir)):
                build_feeds.make_feed(sample,"Test feed","test","2026-11-03T00:00:00Z")
            root=ET.parse(Path(tempdir)/"test.xml").getroot()
            self.assertTrue(root.tag.endswith("feed"))
            namespace = {"atom": build_feeds.ATOM}
            entries = root.findall("atom:entry", namespace)
            self.assertEqual(len(entries),1)
            self.assertEqual(entries[0].findtext("atom:title", namespaces=namespace), "Research on <Zeno>")
            self.assertEqual(entries[0].findtext("atom:summary", namespaces=namespace), "A > B & C")
            self.assertEqual(entries[0].find("atom:link", namespace).get("href"), "https://arxiv.org/abs/2608.13942")

if __name__=="__main__":
    unittest.main()
