"""Check multidisciplinary default coverage and per-topic Axiovo Atom feed links."""
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch
from scripts import build_feeds, sync

class TopicFeedsTests(unittest.TestCase):
    def test_branding_and_topic_urls(self):
        self.assertEqual(build_feeds.BASE,"https://pritam-roy-99.github.io/axiovo/")
        paper={"id":"2507.18744","title":"Quantum key distribution","published":"2025-07-24T12:00:00Z",
               "updated":"2026-01-31T12:00:00Z","authors":["Researcher One"],"abstract":"Quantum information"}
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(build_feeds,"OUTPUT",Path(directory)):
                build_feeds.make_feed([paper],"Axiovo: QKD","qkd","2026-11-05T00:00:00Z")
            root=ET.parse(Path(directory)/"qkd.xml").getroot()
            ns={"a":"http://www.w3.org/2005/Atom"}
            url=root.find("a:id",ns).text
            self.assertEqual(url,"https://pritam-roy-99.github.io/axiovo/feeds/qkd.xml")
            self.assertEqual(root.find("a:entry/a:id",ns).text,"https://arxiv.org/abs/2507.18744")
    def test_wider_discipline_coverage(self):
        import inspect
        source=inspect.getsource(sync.fetch_recent)
        for category in ("cond-mat.supr-con","cs.CR","math.AG","astro-ph.HE","q-bio.QM","gr-qc","physics.optics"):
            with self.subTest(category=category):
                self.assertIn(category,source)
        self.assertIn("time.sleep(3.2)",source)

if __name__=="__main__":
    unittest.main()
