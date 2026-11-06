"""Verify the homepage category picker uses compact in-page controls."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
class Picker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.nodes={}
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get("id"):self.nodes[a["id"]]=(tag,a)
class CategoryPickerTests(unittest.TestCase):
    def test_archive_category_picker_has_labels_and_neutral_default(self):
        for source in ("arxiv","biorxiv","chemrxiv"):
            html=(ROOT/"docs"/(source+".html")).read_text(encoding="utf8")
            parser=Picker();parser.feed(html)
            self.assertEqual(parser.nodes["archive-field"][0],"select")
            self.assertIn('for="archive-field"',html)
            self.assertIn('for="archive-topic"',html)
            self.assertIn('for="archive-subfield"',html)
            self.assertRegex(html,r'<option value="">[^<]*[Aa]ll')

if __name__=="__main__":
    unittest.main()
