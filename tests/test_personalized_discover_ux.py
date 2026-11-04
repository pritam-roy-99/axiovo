"""Guard the coherent user interface and field-aware research preferences."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]/"docs"

class ResearchUXTests(unittest.TestCase):
    def test_navigation_order(self):
        nav=(ROOT/"navigation.js").read_text(encoding="utf8")
        self.assertLess(nav.index('["./#discover","Discover"]'),nav.index('["./#workspace","Library"]'))

    def test_unified_ai_link_and_bookmark_buttons(self):
        home=(ROOT/"index.html").read_text(encoding="utf8")
        scholar=(ROOT/"scholarly.js").read_text(encoding="utf8")
        self.assertIn('ai.textContent="✦ Research Assistant"',home)
        self.assertIn('const cop=node("a","✦ Research Assistant")',scholar)
        self.assertNotIn("✦ Analyze / Ask AI",home)
        self.assertIn('saved.includes(p.id)?"Saved":"Save paper"',home)
        self.assertIn('isSaved?"Saved":"Save paper"',scholar)
        self.assertIn('aria-pressed',home)

    def test_field_aware_discovery_preferences(self):
        home=(ROOT/"index.html").read_text(encoding="utf8")
        scholar=(ROOT/"scholarly.js").read_text(encoding="utf8")
        core=(ROOT/"interests.js").read_text(encoding="utf8")
        self.assertIn('src="./interests.js"',home)
        self.assertIn('config.FIELDS[key].name.toLowerCase()',home)
        self.assertIn('rl-source-scholarly',home)
        self.assertIn('interestsAPI.toggle',scholar)
        self.assertIn('interest-follow',scholar)
        self.assertIn('researchlens-interests-by-field-v1',core)
        self.assertIn('function fieldTopics', (ROOT/"research-fields.js").read_text(encoding="utf8"))

if __name__=="__main__":
    unittest.main()
