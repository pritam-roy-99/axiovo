"""Validate the first-fold guided-tour video experience without external APIs."""
import ast
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class VideoParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.videos=[]
        self.sources=[]
        self.tracks=[]
        self.headings=[]
    def handle_starttag(self, tag, attrs):
        data=dict(attrs)
        if tag=="video":self.videos.append(data)
        if tag=="source":self.sources.append(data)
        if tag=="track":self.tracks.append(data)
        if tag=="h1":self.headings.append(data)

class IntroVideoTests(unittest.TestCase):
    def test_homepage_explainer_has_controls_and_captions(self):
        html=(ROOT/"docs/index.html").read_text(encoding="utf8")
        parser=VideoParser();parser.feed(html)
        self.assertEqual(len(parser.videos),1)
        self.assertIn("controls",parser.videos[0])
        self.assertNotIn("autoplay",parser.videos[0])
        self.assertEqual(parser.videos[0].get("poster"),"./assets/researchlens-tour-poster.jpg")
        self.assertTrue(any(x.get("src")=="./assets/researchlens-tour.mp4" for x in parser.sources))
        self.assertTrue(any(x.get("kind")=="captions" and x.get("srclang")=="en" for x in parser.tracks))
        self.assertIn("Read video transcript",html)
        self.assertIn("Find papers",html)
        self.assertTrue("My research library" in html or "My Library" in html)
        self.assertIn("current Axiovo interface",html)
        self.assertIn("axiom",html)

    def test_video_builder_python_syntax(self):
        script=ROOT/"scripts/build_live_demo.py"
        source=script.read_text(encoding="utf8")
        ast.parse(source,filename=str(script))
        self.assertIn("sync_playwright()",source)
        self.assertIn("page.screenshot(",source)
        self.assertIn("SCENES = [",source)
        self.assertIn("researchlens-tour.mp4",source)
        self.assertNotIn("What does Axiovo mean?",source)

if __name__=="__main__":
    unittest.main()
