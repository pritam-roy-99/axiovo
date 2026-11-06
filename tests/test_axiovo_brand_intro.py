"""Keep the established Axiovo brand meaning visible and narrated.

The actual tutorial video is built in GitHub Actions; this test verifies the
source text that drives its opening scene, subtitles and homepage context.
"""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
HOME=(ROOT/"docs/index.html").read_text(encoding="utf8")
TUTORIAL=(ROOT/"scripts/build_tutorial_video.py").read_text(encoding="utf8")
INTRO=(ROOT/"scripts/build_intro_video.py").read_text(encoding="utf8")
CSS=(ROOT/"docs/axiovo-shell.css").read_text(encoding="utf8")

class BrandIntroTest(unittest.TestCase):
    def test_brand_meaning_in_home_hero(self):
        self.assertIn('id="welcome-title"',HOME)
        self.assertIn('class="axiovo-brand-meaning"',HOME)
        self.assertIn('What does Axiovo mean?',HOME)
        self.assertIn('From knowledge to discovery',HOME)
        self.assertIn('axiovo-brand-meaning',CSS)
    def test_video_starts_with_meaning_and_narrates_it(self):
        first=TUTORIAL.split('steps=[',1)[1].split('("Three preprint archives"',1)[0]
        self.assertIn('Axiovo: From knowledge to discovery',first)
        self.assertIn('Axiovo means from knowledge to discovery',first)
        self.assertIn('.axiovo-brand-meaning',first)
        self.assertIn('Axiovo means from knowledge to discovery',INTRO)
    def test_video_and_transcript_refreshed(self):
        self.assertIn('Read video transcript',HOME)
        self.assertIn('Axiovo means',HOME)
        self.assertIn('axiovo-tour.mp4?v=20261106-brand-intro',HOME)
        self.assertIn('axiovo-tour.vtt?v=20261106-brand-intro',HOME)

if __name__=="__main__":
    unittest.main()
