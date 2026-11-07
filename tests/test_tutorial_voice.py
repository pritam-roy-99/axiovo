"""Guard Axiovo tutorial pronunciation and natural female voice requirements."""
import ast
from hashlib import file_digest
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from tutorial_voice import VOICE, VOICE_ENGINE, VOICE_LOCALE, VOICE_VERSION, voice_text


class TutorialVoiceTests(unittest.TestCase):
    def test_neural_female_voice(self):
        self.assertEqual(VOICE, "en-IN-NeerjaNeural")
        self.assertEqual(VOICE_LOCALE, "en-IN")

    def test_technical_names_speak_consistently(self):
        spoken = voice_text("Axiovo explores arXiv, bioRxiv, ChemRxiv, Cryptology ePrint, DOI, IACR, WebGPU.")
        for word in ("Axiovo", "archive", "bio archive", "Kemm archive", "Cryptology e-print",
                     "D. O. I.", "IACR", "Web G P U"):
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
        self.assertIn("render(narration, sound, voice=VOICE)", script)
        self.assertIn('"voice_version":VOICE_VERSION', script)
        ast.parse(script)

    def test_deployment_publishes_verified_recording(self):
        workflow = (ROOT / ".github/workflows/pages.yml").read_text("utf8")
        self.assertIn('meta.get("voice_version") == VOICE_VERSION', workflow)
        self.assertIn('meta.get("voices") == [VOICE]', workflow)
        self.assertIn('meta.get("media_sha256")', workflow)
        self.assertNotIn("python scripts/revoice_tutorial.py", workflow)
        page = (ROOT / "docs" / "index.html").read_text("utf8")
        self.assertIn(f"axiovo-tour.mp4?v={VOICE_VERSION}", page)
        self.assertIn(f"axiovo-tour.vtt?v={VOICE_VERSION}", page)
        assets = ROOT / "docs" / "assets"
        meta = json.loads((assets / "axiovo-tour-build.json").read_text("utf8"))
        self.assertEqual(meta["voice_version"], VOICE_VERSION)
        self.assertEqual(meta["voices"], [VOICE])
        self.assertEqual(meta["voice_engine"], VOICE_ENGINE)
        with (assets / "axiovo-tour.mp4").open("rb") as media:
            self.assertEqual(file_digest(media, "sha256").hexdigest(), meta["media_sha256"])


if __name__ == "__main__":
    unittest.main()
