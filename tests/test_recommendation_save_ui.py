"""Regression contract for mobile recommendation saving.

Run: python -m unittest discover -s tests -p test_recommendation_save_ui.py -v
"""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/"docs"

class RecommendationSaveUITests(unittest.TestCase):
    def test_existing_library_key_and_version_safe_toggle_preserved(self):
        code=(ROOT/"research-intelligence.js").read_text(encoding="utf8")
        self.assertIn('const OLD_SAVED="axiovo-reading-list"',code)
        self.assertIn('R.normalizeId(id)===R.normalizeId(sourceId)',code)
        self.assertIn('R.normalizeId(id)!==R.normalizeId(sourceId)',code)
        self.assertIn('write(OLD_SAVED,next)',code)
        self.assertIn('new CustomEvent("axiovo-library-change")',code)
    def test_accessible_saved_and_unsaved_states(self):
        code=(ROOT/"research-intelligence.js").read_text(encoding="utf8")
        self.assertIn('"paper-save-btn__icon"',code)
        self.assertIn('"paper-save-btn__label"',code)
        self.assertIn('save.setAttribute("aria-pressed",String(savedHere))',code)
        self.assertIn('savedHere?"Saved":"Save paper"',code)
        self.assertIn('save.title=savedHere?"Remove from Library":"Save to Library"',code)
    def test_mobile_and_dark_theme_styles_are_loaded(self):
        css=(ROOT/"paper-card-polish.css").read_text(encoding="utf8")
        html=(ROOT/"workspace.html").read_text(encoding="utf8")
        self.assertIn('#research-recommendations .axiovo-rec-actions > button.paper-save-btn',css)
        self.assertIn('button.paper-save-btn[aria-pressed="true"]',css)
        self.assertIn('@media(max-width:540px)',css)
        self.assertIn('prefers-reduced-motion:reduce',css)
        self.assertIn('paper-card-polish.css?v=20261106-save2',html)

if __name__=="__main__":
    unittest.main()
