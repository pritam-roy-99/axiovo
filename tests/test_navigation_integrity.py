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
    def test_back_navigation_is_scoped_to_axiovo(self):
        src=(DOCS/"navigation.js").read_text(encoding="utf8")
        self.assertIn("previous.pathname.startsWith(appBase.pathname)",src)
        self.assertIn('a.title=purpose',src)

if __name__=="__main__":
    unittest.main()
