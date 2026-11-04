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
    def test_single_homepage_has_discover_and_workspace(self):
        html = (DOCS / "index.html").read_text()
        parser = Nodes()
        parser.feed(html)
        for required in ("discover-shell", "workspace-panel", "workflow-discover",
                         "workflow-workspace", "scholar-results", "rl-focus-bar"):
            self.assertEqual(len(parser.ids.get(required, [])), 1, required)
        self.assertIn('src="./unified-workspace.js"', html)
        self.assertIn('href="./#workspace"', html)

    def test_legacy_workspace_still_supplies_markup_and_redirects(self):
        legacy = (DOCS / "workspace.html").read_text()
        self.assertIn('location.replace("./#workspace")', legacy)
        for elem in ("library-list", "library-search", "research-project-form",
                     "research-recommendations", "research-project-list"):
            self.assertIn(f'id="{elem}"', legacy)

    def test_shared_data_and_no_duplicated_persistence_schema(self):
        js = (DOCS / "unified-workspace.js").read_text()
        self.assertIn('fetch("./workspace.html"', js)
        self.assertIn('load("./workspace.js")', js)
        self.assertIn('load("./research-intelligence.js")', js)
        original = (DOCS / "workspace.js").read_text()
        self.assertIn("researchlens-library-change", original)
        self.assertIn("researchlens-reading-list", original)
        self.assertIn("researchlens:workspace-activated", original)

    def test_tour_explains_name_and_steps(self):
        script = (ROOT / "scripts" / "build_intro_video.py").read_text()
        for phrase in ("What does Axiovo mean?", "Axiom: foundations",
                       "NOVO", "Step 1: Open Discover",
                       "Step 4: Open My workspace", "Step 6: Record research questions"):
            self.assertIn(phrase, script)

if __name__ == "__main__":
    unittest.main()
