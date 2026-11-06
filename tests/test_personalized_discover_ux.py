"""Guard the coherent user interface and field-aware research preferences."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]/"docs"

class ResearchUXTests(unittest.TestCase):
    def test_navigation_order(self):
        nav=(ROOT/"navigation.js").read_text(encoding="utf8")
        self.assertLess(nav.index('"Explore"'),nav.index('"My Feed"'))
        self.assertLess(nav.index('"My Feed"'),nav.index('"Library"'))

    def test_unified_ai_link_and_bookmark_buttons(self):
        feed=(ROOT/"feed.js").read_text(encoding="utf8")
        desk=(ROOT/"research-desk.js").read_text(encoding="utf8")
        self.assertIn("./copilot.html?id=",feed)
        self.assertIn("archive.save(p)",feed)
        self.assertIn("archive.unsave(p)",feed)
        self.assertIn('save.setAttribute("aria-pressed"',feed)
        self.assertIn("data.save(p)",desk)

    def test_field_aware_discovery_preferences(self):
        prefs=(ROOT/"feed-preferences.js").read_text(encoding="utf8")
        for page in ("index","feed","workspace"):
            self.assertIn("./feed-preferences.js",(ROOT/(page+".html")).read_text())
        self.assertIn("saved?.followed",prefs)
        self.assertNotIn("axiovo-field-explorer-v1",prefs)

if __name__=="__main__":
    unittest.main()
