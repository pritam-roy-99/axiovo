"""Guard the original Axiovo name meaning in the homepage and both video openings."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
HOME=(ROOT/"docs/index.html").read_text(encoding="utf8")
TUTORIAL=(ROOT/"scripts/build_tutorial_video.py").read_text(encoding="utf8")
INTRO=(ROOT/"scripts/build_intro_video.py").read_text(encoding="utf8")

class BrandIntroTest(unittest.TestCase):
    def test_brand_meaning_in_home_hero(self):
        self.assertIn('id="welcome-title"', HOME)
        self.assertEqual(HOME.count('class="axiovo-name-meaning"'), 1)
        self.assertIn("Axiovo = Axiom + Novo", HOME)
        self.assertIn("foundation for reasoning", HOME)
        self.assertIn("new discoveries", HOME)

    def test_video_starts_with_meaning_and_narrates_it(self):
        first=TUTORIAL.split("steps=[",1)[1].split('("Three preprint archives"',1)[0]
        self.assertIn('Axiovo = Axiom + Novo',first)
        self.assertIn("foundational starting point for reasoning",first)
        self.assertIn(".axiovo-name-meaning",first)
        self.assertIn('("Axiovo = Axiom + Novo"',INTRO)
        self.assertIn("novo, meaning new",INTRO)

    def test_video_and_transcript_refreshed(self):
        self.assertIn("Read video transcript",HOME)
        self.assertIn("Axiovo combines axiom",HOME)
        self.assertIn("axiovo-tour.mp4?v=20261106-brand-intro",HOME)
        self.assertIn("axiovo-tour.vtt?v=20261106-brand-intro",HOME)

if __name__=="__main__":
    unittest.main()
