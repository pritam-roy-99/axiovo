"""Axiovo cohesive mobile-first navigation, question-centric library and transparent credits."""
import unittest
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/"docs"

class Tags(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=set()
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if d.get("id"):self.ids.add(d["id"])

class FinalUXTests(unittest.TestCase):
    def test_four_main_destinations_and_settings(self):
        js=(ROOT/"navigation.js").read_text()
        for text in ('["./#discover","Discover"]','["./#workspace","Library"]',
                     '["./copilot.html","Research AI"]','["./community.html","Community"]'):
            self.assertIn(text,js)
        self.assertIn('link("./profiles.html","Settings & local profile"',js)
        self.assertNotIn('["./profiles.html","Profile"]',js)

    def test_footer_credit_clear_and_independent(self):
        js=(ROOT/"navigation.js").read_text()
        self.assertIn("Developed with ChatGPT by OpenAI ❤️",js)
        self.assertIn("Independent open-source project",js)
        self.assertIn('footer.className="axiovo-credit"',js)

    def test_onboarding_and_local_saved_data(self):
        home=(ROOT/"index.html").read_text()
        parse=Tags();parse.feed(home)
        self.assertIn("axiovo-onboarding",parse.ids)
        self.assertIn('src="./axiovo-onboarding.js"',home)
        self.assertIn('id="workspace-panel"',home)
        self.assertIn('id="discover-shell"',home)
        self.assertIn('id="research-questions"',(ROOT/"workspace.html").read_text())
        source=(ROOT/"workspace.js").read_text()
        self.assertIn('const OLD_KEY="researchlens-reading-list"',source)
        self.assertIn('const PROJECT_KEY="researchlens-research-projects-v1"',source)
        self.assertIn('window.dispatchEvent(new Event("axiovo:projects-updated"))',source)

    def test_question_first_library_without_duplicate_recent_feed(self):
        ws=(ROOT/"workspace.html").read_text()
        self.assertLess(ws.index('id="research-questions"'),ws.index('id="research-recs"'))
        self.assertLess(ws.index('id="research-recs"'),ws.index('id="library-list"'))
        self.assertNotIn('id="recent-list"',ws)
        script=(ROOT/"workspace.js").read_text()
        self.assertIn('if(!root)return;root.replaceChildren()',script)

    def test_url_sync_preserves_discover_query(self):
        src=(ROOT/"unified-workspace.js").read_text()
        self.assertIn('history.pushState',src)
        self.assertIn('window.addEventListener("popstate",render)',src)
        self.assertIn('window.addEventListener("researchlens:discover-navigation",render)',src)
        discover=(ROOT/"discover.js").read_text()
        self.assertIn('new Event("researchlens:discover-navigation")',discover)

    def test_mobile_navigation_and_community(self):
        css=(ROOT/"axiovo-ux.css").read_text()
        self.assertIn('.axiovo-mobile-nav{position:fixed',css)
        self.assertIn('grid-template-columns:repeat(4,minmax(0,1fr))',css)
        html=(ROOT/"community.html").read_text()
        self.assertIn("GitHub Issues",html)
        self.assertIn("Native cross-user commenting",html)
        profile=(ROOT/"profiles.html").read_text()
        self.assertIn("Settings &amp; local researcher profile",profile)

    def test_offline_shell_includes_new_assets(self):
        shell=(ROOT/"sw.js").read_text()
        for key in ('axiovo-shell-v6','community.html','axiovo-ux.css','axiovo-onboarding.js'):
            self.assertIn(key,shell)

if __name__=="__main__":
    unittest.main()
