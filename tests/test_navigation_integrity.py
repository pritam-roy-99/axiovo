"""Check the destinations and meaning of Axiovo's actual navigation links."""
import unittest
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

DOCS = Path(__file__).resolve().parents[1] / "docs"

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.anchors=[]
        self.ids=set()
    def handle_starttag(self, tag, attributes):
        attrs=dict(attributes)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag=="a" and attrs.get("href"):
            self.anchors.append(attrs["href"])

class NavigationTests(unittest.TestCase):
    def test_each_local_html_link_and_anchor_has_real_destination(self):
        pages={}
        for path in DOCS.glob("*.html"):
            page=Page()
            page.feed(path.read_text(encoding="utf8"))
            pages[path.resolve()]=page
        checked=0
        for origin,page in pages.items():
            for href in page.anchors:
                uri=urlsplit(href)
                if uri.scheme or uri.netloc or href.startswith("//"):
                    continue
                if uri.path.startswith("/"):
                    continue
                target=(origin.parent / (unquote(uri.path) or origin.name)).resolve()
                if target.is_dir():
                    target=target / "index.html"
                if target.suffix.lower() not in (".html", ""):
                    continue  # Generated media are checked by the built-asset audit.
                self.assertTrue(target.is_file(),f"{origin.name}: missing {href}")
                if uri.fragment and target.suffix==".html":
                    self.assertIn(unquote(uri.fragment),pages[target].ids,
                                  f"{origin.name}: {href} points to missing section")
                checked+=1
        self.assertGreater(checked,50)
    def test_community_destinations_are_direct(self):
        html=(DOCS/"community.html").read_text(encoding="utf8")
        self.assertIn('href="./arxiv.html">Find a paper',html)
        self.assertIn('href="./workspace.html">Open Library',html)
        self.assertNotIn("discover.html#",html)
    def test_mobile_search_and_navigation_controls_have_accessible_spacing(self):
        css=(DOCS/"axiovo-blueprint-ui.css").read_text(encoding="utf8")
        desk=(DOCS/"desk.html").read_text(encoding="utf8")
        nav=(DOCS/"navigation.js").read_text(encoding="utf8")
        self.assertIn("Mobile usability 2026-11-11",css)
        self.assertIn("header.rl-global-header>a.ax-header-search",css)
        self.assertIn('border:3px solid #07546b!important',css)
        self.assertIn("grid-template-columns:repeat(5,minmax(0,1fr))!important",css)
        self.assertIn(".rd-searchbar>.axiovo-voice-wrap",css)
        self.assertIn("padding:12px 60px 12px 14px!important",css)
        self.assertIn("width:44px!important;height:44px!important",css)
        self.assertIn("calc(165px + env(safe-area-inset-bottom,0px))",css)
        self.assertIn("axiovo-blueprint-ui.css?v=20261111-mobile-controls-v6",nav)
        self.assertIn("voice-search.js?v=20261111-mobile-input-v4",desk)
        self.assertIn('id="rd-query"',desk)

    def test_back_navigation_is_scoped_to_axiovo(self):
        src=(DOCS/"navigation.js").read_text(encoding="utf8")
        self.assertIn("url.origin===base.origin&&url.pathname.startsWith(base.pathname)",src)
        self.assertIn("location.replace(homeURL())",src)
        self.assertIn('a.title=purpose',src)

if __name__=="__main__":
    unittest.main()
