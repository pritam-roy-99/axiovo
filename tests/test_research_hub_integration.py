"""Research Hub integration checks: accessible, honest and source-linked."""
import re
import unittest
from pathlib import Path

DOCS = Path(__file__).resolve().parents[1] / "docs"


class ResearchHubIntegrationTests(unittest.TestCase):
    def test_hub_has_existing_workflows(self):
        page = (DOCS / "research-hub.html").read_text(encoding="utf8")
        for path in (
            "lab.html#reader", "lab.html#alerts", "workspace.html#research-questions",
            "copilot.html", "lab.html#citations", "desk.html",
        ):
            self.assertIn(path, page)
        self.assertIn('id="rh-graph"', page)
        self.assertIn('id="rh-version-form"', page)

    def test_graph_is_source_based_not_fabricated_citations(self):
        js = (DOCS / "research-hub.js").read_text(encoding="utf8")
        self.assertIn("savedRecords(source)", js)
        self.assertIn("p.url", js)
        self.assertIn("lexical topic links (not citations)", js)
        self.assertNotIn("innerHTML", js)

    def test_robot_integrates_workflows(self):
        robot = (DOCS / "axiovo-robot-help.js").read_text(encoding="utf8")
        for feature in ("research-hub.html#relationships", "research-hub.html#versions",
                        "lab.html#reader", "lab.html#alerts",
                        "workspace.html#research-questions"):
            self.assertIn(feature, robot)
        self.assertIn("searchPapers(", robot)
        self.assertIn("routeToCopilot(", robot)

    def test_homepage_links_hub_and_assets_exist(self):
        home = (DOCS / "index.html").read_text(encoding="utf8")
        self.assertIn('href="./research-hub.html"', home)
        for name in ("research-hub.html", "research-hub.js", "research-hub.css"):
            self.assertTrue((DOCS / name).is_file(), name)


if __name__ == "__main__":
    unittest.main()
