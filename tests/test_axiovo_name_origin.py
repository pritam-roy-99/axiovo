"""Prevent loss of the established Axiovo brand meaning in home and tours."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
HOME=(ROOT/"docs/index.html").read_text(encoding="utf8")
TUTORIAL=(ROOT/"scripts/build_tutorial_video.py").read_text(encoding="utf8")
INTRO=(ROOT/"scripts/build_intro_video.py").read_text(encoding="utf8")

class NameOriginTests(unittest.TestCase):
    def test_homepage_explains_brand_once(self):
        self.assertEqual(HOME.count('class="axiovo-name-meaning"'),1)
        self.assertIn("Axiovo = Axiom + Novo",HOME)
        self.assertIn("foundation for reasoning",HOME)
        self.assertIn("new discoveries",HOME)
    def test_both_video_openings_explain_the_name(self):
        self.assertIn('("Axiovo = Axiom + Novo"',INTRO)
        self.assertIn('("Axiovo = Axiom + Novo"',TUTORIAL)
        self.assertIn("foundational starting point for reasoning",TUTORIAL)
        self.assertIn('".axiovo-name-meaning"',TUTORIAL)
    def test_video_transcript_and_cache_busting(self):
        self.assertIn("Axiovo combines axiom",HOME)
        self.assertIn("axiovo-tour.mp4?v=20261106-brand-intro",HOME)
        self.assertIn("axiovo-tour.vtt?v=20261106-brand-intro",HOME)

if __name__=="__main__":
    unittest.main()
