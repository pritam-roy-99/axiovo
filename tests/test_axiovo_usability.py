"""Guard the user-facing research workflow and mobile navigation."""
from pathlib import Path
import unittest

DOCS=Path(__file__).resolve().parents[1]/"docs"

class UsabilityTests(unittest.TestCase):
    def test_questions_are_first_in_workspace(self):
        workspace=(DOCS/"workspace.html").read_text()
        self.assertLess(workspace.index('id="research-questions"'),workspace.index('id="research-recs"'))
        self.assertLess(workspace.index('id="research-questions"'),workspace.index('id="library-heading"'))
        self.assertNotIn('id="recent-list"',workspace)
        self.assertIn('id="library-list"',workspace)
        self.assertIn('id="research-project-form"',workspace)
    def test_profile_is_optional_settings_not_primary_nav(self):
        nav=(DOCS/"navigation.js").read_text()
        self.assertIn('["./#discover","Discover"]',nav)
        self.assertIn('["./#workspace","Library"]',nav)
        self.assertIn('["./copilot.html","Research AI"]',nav)
        self.assertIn('["https://github.com/pritam-roy-99/researchlens/issues","Community"]',nav)
        self.assertNotIn('["./profiles.html","Profile"]',nav)
        self.assertIn('settings.href="./profiles.html"',nav)
    def test_app_footer_credits_are_accurate(self):
        nav=(DOCS/"navigation.js").read_text()
        self.assertIn("Built with ChatGPT by OpenAI ❤️",nav)
        self.assertIn("not an official OpenAI product",nav)
    def test_shared_navigation_and_legacy_library(self):
        router=(DOCS/"unified-workspace.js").read_text()
        self.assertIn('window.addEventListener("popstate",render)',router)
        self.assertIn('window.addEventListener("axiovo:navigate",render)',router)
        self.assertIn('history.pushState({}, "", current.href)',router)
        self.assertIn('fetch("./workspace.html"',router)
        discover=(DOCS/"discover.js").read_text()
        self.assertIn('new Event("axiovo:navigate")',discover)
        workspace=(DOCS/"workspace.js").read_text()
        self.assertIn('if(!root)return',workspace)
        self.assertIn("researchlens-reading-list",workspace)
    def test_first_run_and_mobile(self):
        html=(DOCS/"index.html").read_text()
        self.assertIn('id="axiovo-onboarding"',html)
        self.assertIn('src="./onboarding.js"',html)
        js=(DOCS/"onboarding.js").read_text()
        self.assertIn('axiovo-onboarding-dismissed-v1',js)
        css=(DOCS/"theme.css").read_text()
        self.assertIn('grid-template-columns:repeat(4,minmax(0,1fr))',css)
        self.assertIn('env(safe-area-inset-bottom',css)
        self.assertIn('max-width:700px',css)
if __name__=="__main__":
    unittest.main()
