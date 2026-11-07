"""Regression contract for the merged Discover/Workspace experience."""
from pathlib import Path
from html.parser import HTMLParser
import unittest

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

class Nodes(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = {}
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.setdefault(attrs["id"], []).append(tag)

class UnifiedWorkspaceTests(unittest.TestCase):
    def test_archives_and_workspace_are_separate_destinations(self):
        home=(DOCS/"index.html").read_text()
        for source in ("arxiv","biorxiv","chemrxiv","crypto"):
            self.assertIn(f'href="./{source}.html"',home)
        self.assertIn('href="./workspace.html"',home)
        redirect=(DOCS/"discover.html").read_text()
        self.assertIn('isLibrary?"workspace.html"',redirect)
        self.assertNotIn('id="library-list"',home)

    def test_workspace_supplies_reading_and_research_controls(self):
        parser=Nodes();parser.feed((DOCS/"workspace.html").read_text())
        for elem in ("library-list","library-search","research-project-form",
                     "research-recommendations","research-project-list"):
            self.assertEqual(parser.ids.get(elem) and len(parser.ids[elem]),1,elem)

    def test_shared_data_and_no_duplicated_persistence_schema(self):
        page=(DOCS/"workspace.html").read_text()
        self.assertLess(page.index('src="./archive-data.js"'),page.index('src="./workspace.js"'))
        workspace=(DOCS/"workspace.js").read_text()
        archive=(DOCS/"archive-data.js").read_text()
        self.assertIn("archive?.savedRecords",workspace)
        self.assertIn("axiovo-reading-list",archive)
        self.assertIn("axiovo-library-change",workspace)
        self.assertIn("axiovo-library-change",archive)

    def test_tour_explains_name_and_steps(self):
        script=(ROOT/"scripts"/"build_tutorial_video.py").read_text()
        for phrase in ("Axiovo = Axiom + Novo","Four research archives",
                       "Cross-archive Research Desk","workspace.html","copilot.html"):
            self.assertIn(phrase,script)

if __name__ == "__main__":
    unittest.main()
