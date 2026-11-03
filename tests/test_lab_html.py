import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "docs"
REQUIRED_IDS = {
  "lab-search-form", "lab-search-results", "lab-local-pdf", "lab-pdf-canvas",
  "lab-compare-form", "lab-compare-results", "lab-citation-form", "lab-graph",
  "lab-check-updates", "lab-alert-results", "lab-cloud-login", "lab-cloud-push"
}

class IDs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=set()
    def handle_starttag(self,tag,attrs):
        value=dict(attrs).get("id")
        if value:
            self.ids.add(value)

class LabHTMLTests(unittest.TestCase):
    def test_controls_exist(self):
        parser=IDs()
        parser.feed((ROOT/"lab.html").read_text(encoding="utf8"))
        self.assertFalse(REQUIRED_IDS-parser.ids)
        self.assertIn("lab.js",(ROOT/"lab.html").read_text(encoding="utf8"))
        self.assertIn("cloud-sync.js",(ROOT/"lab.html").read_text(encoding="utf8"))

if __name__=="__main__":
    unittest.main()
