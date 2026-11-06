"""Guard the user-facing research workflow and mobile navigation."""
from pathlib import Path
import unittest

DOCS=Path(__file__).resolve().parents[1]/"docs"

class UsabilityTests(unittest.TestCase):
    def test_workspace_prioritizes_saved_papers(self):
        workspace=(DOCS/"workspace.html").read_text()
        self.assertLess(workspace.index('id="library-heading"'),workspace.index('id="research-questions"'))
        self.assertLess(workspace.index('id="research-questions"'),workspace.index('id="research-recs"'))
        self.assertIn('id="library-list"',workspace)
        self.assertIn('id="research-project-form"',workspace)

    def test_profile_is_optional_settings_not_primary_nav(self):
        nav=(DOCS/"navigation.js").read_text()
        self.assertIn('["./#axiovo-archive-title","Explore",',nav)
        self.assertIn('["./workspace.html","Library",',nav)
        self.assertIn('["./copilot.html","Research Assistant",',nav)
        self.assertNotIn('["./community.html","Community"]',nav)
        self.assertNotIn('["./profiles.html","Profile"]',nav)
        self.assertIn('settings.href="./profiles.html"',nav)
    def test_app_footer_credits_are_accurate(self):
        nav=(DOCS/"navigation.js").read_text()
        self.assertIn("Built with ChatGPT by OpenAI ❤️",nav)
        self.assertIn("not an official OpenAI product",nav)
    def test_shared_navigation_and_legacy_library(self):
        nav=(DOCS/"navigation.js").read_text()
        self.assertIn('history.back()',nav)
        self.assertIn('home.href="./"',nav)
        self.assertIn('url.hash==="#workspace"',(DOCS/"research-entry.js").read_text())
        self.assertIn("axiovo-reading-list",(DOCS/"workspace.js").read_text())

    def test_first_run_and_mobile(self):
        html=(DOCS/"index.html").read_text()
        self.assertIn('name="viewport" content="width=device-width,initial-scale=1"',html)
        self.assertIn('id="axiovo-archive-title"',html)
        self.assertEqual(html.count("data-archive="),3)
        self.assertIn("Personalize My Feed",(DOCS/"feed-preview.js").read_text())

if __name__=="__main__":
    unittest.main()
