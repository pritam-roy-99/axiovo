"""Regression checks for source-first, consistent Axiovo public routes.

These tests inspect source and do NOT replace browser end-to-end tests.
"""
import unittest
from pathlib import Path
from html.parser import HTMLParser

DOCS=Path(__file__).resolve().parents[1]/"docs"

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts=[]
        self.links=[]
        self.ids=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if d.get("id"):self.ids.append(d["id"])
        if tag=="script" and d.get("src"):self.scripts.append(d["src"])
        if tag=="a" and d.get("href"):self.links.append(d["href"])

class RouteAuditTests(unittest.TestCase):
    def read(self,path):
        return (DOCS/path).read_text(encoding="utf8")
    def page(self,path):
        p=Page();p.feed(self.read(path));return p

    def test_canonical_search_redirect_retains_input(self):
        html=self.read("search.html")
        self.assertIn("previous.forEach",html)
        self.assertIn("next.searchParams",html)
        self.assertIn("location.replace(next.href)",html)
        self.assertNotIn("https://api.openalex.org/works?",html)

    def test_all_public_routes_have_valid_script_order(self):
        pages=("index.html","workspace.html","copilot.html","lab.html","paper.html",
               "profiles.html","community.html","methodology.html","search.html","fields.html","ai.html")
        for name in pages:
            with self.subTest(page=name):
                p=self.page(name)
                self.assertEqual(len(p.ids),len(set(p.ids)),name+" has duplicate HTML IDs")
        for name in ("copilot.html","lab.html","profiles.html","paper.html"):
            with self.subTest(version_path=name):
                p=self.page(name)
                self.assertIn("./arxiv-versions.js",p.scripts)
                version=p.scripts.index("./arxiv-versions.js")
                script={"copilot.html":"./copilot.js","lab.html":"./lab.js",
                        "profiles.html":"./profiles.js","paper.html":"./paper.js"}[name]
                self.assertLess(version,p.scripts.index(script))

    def test_discussion_version_uses_base_id(self):
        js=self.read("paper.js")
        self.assertIn('curatedIssue[baseId]',js)
        self.assertNotIn('curatedIssue[id]',js)
        self.assertIn("Find related arXiv literature",js)

    def test_source_links_survive_history_status(self):
        js=self.read("history.js")
        self.assertIn('function historyInfo(message,query="")',js)
        self.assertIn('link.id="history-official-link"',js)
        self.assertNotIn('$("history-info").textContent=',js)

    def test_arxiv_only_in_remote_research(self):
        lab=self.read("lab.js")
        cop=self.read("copilot.js")
        self.assertIn('filter:"locations.source.id:S4306400194"',lab)
        self.assertIn("window.AxiovoArxiv.pdf(value.requested)",lab)
        self.assertIn("window.AxiovoArxiv?.candidates(w).length",cop)
        self.assertIn('Archive.live("arxiv",{q})',cop)

    def test_bookmarks_remain_visible_outside_local_feed(self):
        profiles=self.read("profiles.js")
        scholarly=self.read("scholarly.js")
        self.assertIn("for(const raw of bookmarks)",profiles)
        self.assertIn('A.abs(p.requested)',profiles)
        self.assertIn('function mirrorArxivBookmark',scholarly)
        self.assertIn('mirrorArxivBookmark(w,!wasSaved)',scholarly)
        self.assertIn('function link(parent,label,url)',scholarly)
        self.assertIn('new URL(url,location.href)',scholarly)

    def test_methodology_current_and_audit_documented(self):
        page=self.read("methodology.html")
        self.assertIn("OpenAlex embedding-based semantic search",page)
        self.assertIn("arXiv",page)
        audit=(DOCS.parent/"SITE_AUDIT.md").read_text(encoding="utf8")
        self.assertIn("not",audit.lower())
        self.assertIn("page-by-page",audit.lower())

if __name__=="__main__":unittest.main()
