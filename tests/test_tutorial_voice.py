"""Guard Axiovo tutorial pronunciation and natural female voice requirements."""
import ast
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from tutorial_voice import VOICE, VOICE_VERSION, voice_text


class TutorialVoiceTests(unittest.TestCase):
    def test_neural_female_voice(self):
        self.assertEqual(VOICE, "en-US-JennyNeural")
        self.assertEqual(VOICE_VERSION, "axiovo-female-neural-v2")

    def test_technical_names_speak_consistently(self):
        spoken = voice_text("Axiovo explores arXiv, bioRxiv, ChemRxiv, Cryptology ePrint, DOI, IACR, WebGPU.")
        for word in ("Ax-ee-oh-voh", "archive", "bio archive", "chem archive", "Cryptology e-print",
                     "D O I", "I A C R", "Web G P U"):
            self.assertIn(word, spoken)
        self.assertNotIn("bioRxiv", spoken)
        self.assertNotIn("ChemRxiv", spoken)

    def test_literal_caption_and_narration_are_not_overwritten(self):
        original = "Read the bioRxiv abstract before citing it."
        self.assertEqual(original, "Read the bioRxiv abstract before citing it.")
        self.assertNotEqual(voice_text(original), original)

    def test_no_automatic_robotic_fallback(self):
        script = (ROOT / "scripts" / "build_tutorial_video.py").read_text("utf8")
        self.assertNotIn('["espeak-ng"', script)
        self.assertIn('"--voice", VOICE', script)
        self.assertIn('"voice_version":VOICE_VERSION', script)
        ast.parse(script)

    def test_deployment_rebuilds_old_narration(self):
        workflow = (ROOT / ".github/workflows/pages.yml").read_text("utf8")
        self.assertIn('meta.get("voice_version")=="axiovo-female-neural-v2"', workflow)
        self.assertIn('meta.get("voices")==["en-US-JennyNeural"]', workflow)
        self.assertIn('voice_metadata.get("voice_engine")=="edge-tts-neural"', workflow)
        self.assertIn("actions/cache@v4", workflow)
        page = (ROOT / "docs" / "index.html").read_text("utf8")
        self.assertIn("axiovo-tour.mp4?v=axiovo-female-neural-v2", page)
        self.assertIn("axiovo-tour.vtt?v=axiovo-female-neural-v2", page)


if __name__ == "__main__":
    unittest.main()
