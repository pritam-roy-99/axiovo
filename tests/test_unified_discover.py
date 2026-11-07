"""Regression tests for the archive-first Axiovo workflow."""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]/"docs"

class Elements(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids={}
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if attrs.get("id"):
            self.ids.setdefault(attrs["id"],[]).append((tag,attrs))

class UnifiedDiscoverTests(unittest.TestCase):
    def test_homepage_has_three_archive_choices(self):
        html=(ROOT/"index.html").read_text(encoding="utf8")
        page=Elements();page.feed(html)
        self.assertEqual(len(page.ids["axiovo-archive-title"]),1)
        for source in ("arxiv","biorxiv","chemrxiv"):
            self.assertIn(f'data-archive="{source}" href="./{source}.html"',html)
        self.assertIn('href="./desk.html"',html)

    def test_legacy_field_explorer_preserves_links(self):
        html=(ROOT/"fields.html").read_text(encoding="utf8")
        self.assertIn("location.replace(next.href)",html)
        self.assertIn('new URL("./arxiv.html",location.href)',html)
        self.assertIn("old.forEach",html)

    def test_in_page_search_is_scoped_to_its_archive(self):
        for source in ("arxiv","biorxiv","chemrxiv"):
            page=(ROOT/(source+".html")).read_text()
            self.assertIn(f'data-explore-source="{source}"',page)
            self.assertIn('./topic-explorer.js',page)
        js=(ROOT/"topic-explorer.js").read_text(encoding="utf8")
        self.assertIn("document.body.dataset.exploreSource",js)
        self.assertIn("data.snapshot(source)",js)
        self.assertIn("data.live(source,c,signal,next)",js)

    def test_navigation_uses_one_discover_link(self):
        nav=(ROOT/"navigation.js").read_text(encoding="utf8")
        self.assertIn('[file==="index.html"?"#axiovo-archive-title":HOME,"Explore",',nav)
        self.assertNotIn('["./fields.html","Explore fields"]',nav)
        self.assertNotIn('["./","arXiv feed"]',nav)

if __name__=="__main__":
    unittest.main()
