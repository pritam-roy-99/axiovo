"""Regression checks for the user-approved Axiovo assistant mascot and language support."""
from pathlib import Path
import unittest
import re
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/"docs"

class AnimatedRobotTest(unittest.TestCase):
    def test_approved_mascot_asset_is_self_contained_and_cached(self):
        asset=DOCS/"assets/axiovo-assistant-mascot.svg"
        self.assertTrue(asset.is_file())
        image=asset.read_text(encoding="utf-8")
        self.assertIn('viewBox="0 0 200 200"',image)
        self.assertIn('<path',image) 
        self.assertNotIn('data:image/webp;base64,',image)
        self.assertGreater(len(image),1200)
        sw=(DOCS/"sw.js").read_text()
        self.assertIn("./assets/axiovo-assistant-mascot.svg",sw)
        self.assertIn("axiovo-shell-v114",sw)

    def test_assistant_reuses_existing_help_functions(self):
        js=(DOCS/"axiovo-robot-help.js").read_text(encoding="utf-8")
        self.assertIn('const mascot=make("span","robot-mascot")',js) 
        self.assertIn('mascot.innerHTML=',js)
        self.assertIn("robot-mascot",js)
        self.assertIn("robot-speaking",js)
        self.assertIn("robot-listening",js)
        self.assertIn("@media(prefers-reduced-motion:reduce)",js)
        self.assertIn("pointerdown",js)
        self.assertIn("pointermove",js)
        self.assertIn("showTarget(",js)
        self.assertIn("function searchPapers(",js)
        self.assertIn("function routeToCopilot(",js)
        self.assertIn("window.AxiovoRobotGuide",js)
        self.assertIn("Save to Library",js)

    def test_language_selector_is_persistent_and_speech_is_consent_based(self):
        js=(DOCS/"axiovo-robot-help.js").read_text(encoding="utf-8")
        self.assertIn('id="axiovo-robot-language"',js)
        self.assertIn("axiovo-robot-language-v1",js)
        for name in ("bn-IN","hi-IN","ta-IN","te-IN","ur-IN","es-ES","fr-FR","ar-SA","zh-CN","ja-JP"):
            self.assertIn(name,js)
        self.assertIn("rec.lang=currentLanguage()",js)
        self.assertIn("window.SpeechRecognition||window.webkitSpeechRecognition",js)
        self.assertIn("confirm(",js)
        self.assertIn("Axiovo does not store recordings",js)
        self.assertIn("window.Translator?.create",js)
        self.assertIn("No matching installed voice",js)
        self.assertIn("speechSynthesis",js)
        self.assertNotIn('filter(v=>v.lang?.toLowerCase().startsWith("en"))',js)

    def test_all_pages_load_one_robot_from_navigation(self):
        nav=(DOCS/"navigation.js").read_text()
        self.assertIn("axiovo-robot-help.js?v=20261111-multilingual-mascot-v1",nav)
        self.assertIn('script[data-axiovo-robot]',nav)
        css=(DOCS/"axiovo-blueprint-ui.css").read_text()
        self.assertIn("bottom:calc(88px + env(safe-area-inset-bottom,0px))!important",css)
        self.assertIn("width:68px!important;height:68px!important",css)
        self.assertIn("calc(100dvh - 185px",css)

if __name__=="__main__":
    unittest.main()
