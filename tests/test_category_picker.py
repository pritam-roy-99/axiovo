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
    def test_inline_category_menu_and_filter_state(self):
        html=(ROOT/"docs/index.html").read_text(encoding="utf8")
        p=Picker();p.feed(html)
        for key in ("category-picker","category-trigger","category-menu","category"):
            self.assertIn(key,p.nodes)
        self.assertEqual(p.nodes["category-trigger"][0],"button")
        self.assertEqual(p.nodes["category-trigger"][1]["aria-expanded"],"false")
        self.assertIn("hidden",p.nodes["category-menu"][1])
        self.assertEqual(p.nodes["category"][0],"input")
        self.assertEqual(p.nodes["category"][1]["type"],"hidden")
        self.assertNotIn('<select id="category"',html)
        self.assertIn('selected.dispatchEvent(new Event("change",{bubbles:true}))',html)
        self.assertIn('data-category="physics.optics"',html)
        self.assertIn('data-category="cond-mat.mes-hall"',html)
        self.assertIn('.rl-category-menu[hidden]{display:none!important}',html)
if __name__=="__main__":
    unittest.main()
