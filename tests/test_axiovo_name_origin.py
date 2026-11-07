"""Guard the Axiom + Novo explanation through home redesigns."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
HOME=(ROOT/"docs/index.html").read_text(encoding="utf8")
TUTORIAL=(ROOT/"scripts/build_tutorial_video.py").read_text(encoding="utf8")
INTRO=(ROOT/"scripts/build_intro_video.py").read_text(encoding="utf8")

class NameOriginTests(unittest.TestCase):
    def test_homepage_explains_brand_once(self):
        self.assertEqual(HOME.count('class="axiovo-name-line"'),1)
        self.assertIn('Axiom</em> + <em>Novo',HOME)
        self.assertIn("established knowledge to new discoveries",HOME)

    def test_video_opening_explains_name_and_targets_current_hero(self):
        self.assertIn('("Axiovo = Axiom + Novo"',INTRO)
        self.assertIn('("Axiovo = Axiom + Novo"',TUTORIAL)
        self.assertIn("foundational starting point for reasoning",TUTORIAL)
        self.assertIn('".axiovo-welcome"',TUTORIAL)

    def test_video_and_transcript_in_the_same_section(self):
        section=HOME.split('<section class="axiovo-welcome"',1)[1].split("</section>",1)[0]
        self.assertIn('src="./assets/axiovo-tour.mp4',section)
        self.assertIn('src="./assets/axiovo-tour.vtt',section)
        self.assertIn("Full step-by-step guide",section)
        self.assertIn("Axiom</em> + <em>Novo",section)

if __name__=="__main__":
    unittest.main()
