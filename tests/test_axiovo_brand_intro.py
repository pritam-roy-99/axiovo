"""Check the unified Axiovo welcome and the genuine narrated video source."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
HOME=(ROOT/"docs/index.html").read_text(encoding="utf8")
TOUR=(ROOT/"scripts/build_tutorial_video.py").read_text(encoding="utf8")
INTRO=(ROOT/"scripts/build_intro_video.py").read_text(encoding="utf8")

class BrandIntroTest(unittest.TestCase):
    def test_one_unified_home_hero(self):
        self.assertEqual(HOME.count('<section class="axiovo-welcome"'),1)
        self.assertEqual(HOME.count('id="welcome-title"'),1)
        self.assertIn('class="axiovo-name-line"',HOME)
        self.assertIn('Axiom</em> + <em>Novo',HOME)
        self.assertIn("new discoveries",HOME)
        self.assertNotIn('class="rd-home-hero rd-topic-home"',HOME)
        section=HOME.split('<section class="axiovo-welcome"',1)[1].split('</section>',1)[0]
        self.assertIn('id="axiovo-home-video"',section)
        self.assertIn('id="axiovo-tour-heading"',section)
        self.assertLess(section.index('id="welcome-title"'),section.index('id="axiovo-home-video"'))

    def test_narration_keeps_brand_intro(self):
        first=TOUR.split("steps=[",1)[1].split('("Four research archives"',1)[0]
        self.assertIn('Axiovo = Axiom + Novo',first)
        self.assertIn("foundational starting point for reasoning",first)
        self.assertIn('".axiovo-welcome"',first)
        self.assertIn('("Axiovo = Axiom + Novo"',INTRO)

    def test_tutorial_visuals_match_current_shell(self):
        poster=(ROOT/"docs/assets/axiovo-tour-poster.svg").read_text(encoding="utf8")
        tour=(ROOT/"docs/home-tour.js").read_text(encoding="utf8")
        css=(ROOT/"docs/axiovo-blueprint-ui.css").read_text(encoding="utf8")
        self.assertIn("Find research. Follow the evidence.",poster)
        self.assertIn("Research Desk",poster)
        self.assertIn("Cryptology ePrint",poster)
        self.assertIn("axiovo-tutorial-thumbnail.webp?v=20261111-approved-cover-v1",HOME)
        self.assertIn("axiovo-tutorial-thumbnail.webp", (ROOT/"docs/tutorial.html").read_text(encoding="utf8"))
        self.assertTrue((ROOT/"docs/assets/axiovo-tutorial-thumbnail.webp").is_file())
        self.assertGreater((ROOT/"docs/assets/axiovo-tutorial-thumbnail.webp").stat().st_size,30000)
        self.assertIn("axiovo-tour-preview",tour)
        self.assertIn("axiovo-tour-preview-rail",css)
        self.assertIn("axiovo-tour-preview-hero",css)
        self.assertNotIn("Explore research in four archives",poster)

    def test_one_video_with_captions_and_a_guide(self):
        self.assertIn('src="./assets/axiovo-tour.mp4',HOME)
        self.assertIn('src="./assets/axiovo-tour.vtt',HOME)
        self.assertIn('kind="captions"',HOME)
        self.assertIn("Full step-by-step guide",HOME)
        self.assertIn('id="axiovo-tour" hidden',HOME)

if __name__=="__main__":
    unittest.main()
