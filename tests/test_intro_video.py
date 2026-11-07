"""Validate a source-recorded tutorial on the unified Axiovo homepage."""
import ast
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]

class VideoParser(HTMLParser):
    def __init__(self):
        super().__init__();self.videos=[];self.sources=[];self.tracks=[]
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if tag=="video":self.videos.append(data)
        if tag=="source":self.sources.append(data)
        if tag=="track":self.tracks.append(data)

class IntroVideoTests(unittest.TestCase):
    def test_homepage_video_and_captions(self):
        html=(ROOT/"docs/index.html").read_text(encoding="utf8")
        parser=VideoParser();parser.feed(html)
        self.assertEqual(len(parser.videos),1)
        self.assertIn("controls",parser.videos[0])
        self.assertIn("playsinline",parser.videos[0])
        self.assertNotIn("autoplay",parser.videos[0])
        self.assertNotIn("hidden",parser.videos[0])
        self.assertTrue(parser.videos[0].get("poster","").startswith("./assets/axiovo-tour-poster.svg"))
        self.assertTrue(any(x.get("src","").split("?")[0]=="./assets/axiovo-tour.mp4" for x in parser.sources))
        self.assertTrue(any(x.get("kind")=="captions" and x.get("srclang")=="en" for x in parser.tracks))
        self.assertIn("Full step-by-step guide",html)
        self.assertIn('id="welcome-title"',html)
        self.assertIn("My Library",html)
        self.assertIn('class="axiovo-welcome"',html)
        self.assertIn("axiom",html.lower())

    def test_video_builder_python_syntax(self):
        script=ROOT/"scripts/build_tutorial_video.py"
        source=script.read_text(encoding="utf8")
        ast.parse(source,filename=str(script))
        self.assertIn("sync_playwright()",source)
        self.assertIn("page.screenshot(",source)
        self.assertIn("axiovo-tour-build.json",source)
        self.assertIn('("crypto-search", "quantum cryptography")',source)
        self.assertIn('#crypto-topic-suggestions button',source)
        self.assertNotIn('("select", "crypto-topic", "quantum cryptography")',source)

if __name__=="__main__":
    unittest.main()
