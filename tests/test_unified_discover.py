"""Regression tests for a single multi-source ResearchLens Discover page."""
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
    def test_both_sources_render_on_homepage(self):
        html=(ROOT/"index.html").read_text(encoding="utf8")
        p=Elements()
        p.feed(html)
        for key in (
            "discover","rl-source-arxiv","rl-source-scholarly",
            "arxiv-discovery","scholarly-discovery",
            "papers","history-cards","category",
            "scholar-field","scholar-topic-list","scholar-search-form",
            "scholar-query","scholar-from","scholar-to",
            "scholar-results","scholar-saved-list",
            "scholar-export-bib","scholar-export-json"
        ):
            self.assertIn(key,p.ids,key)
            self.assertEqual(len(p.ids[key]),1,key)
        self.assertIn("hidden",p.ids["scholarly-discovery"][0][1])
        self.assertIn('id="category-trigger"',html)
        self.assertIn("src=\"./scholarly.js\"",html)
        self.assertIn("src=\"./discover.js\"",html)
        self.assertIn("stylesheet\" href=\"./discover.css\"",html)

    def test_legacy_field_explorer_preserves_links(self):
        html=(ROOT/"fields.html").read_text(encoding="utf8")
        self.assertIn("location.replace(url.href)",html)
        self.assertIn('url.searchParams.set("q",q.slice(0,300))',html)
        self.assertIn("const before=new URLSearchParams(location.search)",html)

    def test_in_page_search_is_scoped_and_lazily_initialized(self):
        js=(ROOT/"scholarly.js").read_text(encoding="utf8")
        self.assertIn('document.getElementById("scholar-"+id)',js)
        self.assertIn('window.addEventListener("researchlens:scholarly-open",init,{once:true})',js)
        self.assertIn("researchlens-field-saved-v1",js)
        switch=(ROOT/"discover.js").read_text(encoding="utf8")
        self.assertIn('panel.hidden=(isWide?name!=="scholarly":name!==activeArchive)',switch)
        self.assertIn('const panels=',switch)
        self.assertIn('new Event("researchlens:scholarly-open")',switch)

    def test_navigation_uses_one_discover_link(self):
        nav=(ROOT/"navigation.js").read_text(encoding="utf8")
        self.assertIn('["./","Discover archives"]',nav)
        self.assertNotIn('["./fields.html","Explore fields"]',nav)
        self.assertNotIn('["./","arXiv feed"]',nav)

if __name__=="__main__":
    unittest.main()
