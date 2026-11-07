"""Check revoice implementation without downloading the neural model."""
import importlib.util
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import revoice_tutorial as remix
from tutorial_voice import VOICE, VOICE_VERSION, VOICE_ENGINE, VOICE_LOCALE


class RevoiceTutorialTests(unittest.TestCase):
    def test_video_uses_one_neural_female_voice(self):
        self.assertEqual(VOICE, "en-IN-NeerjaNeural")
        self.assertEqual(VOICE_ENGINE, "edge-tts")
        self.assertEqual(VOICE_LOCALE, "en-IN")

    def test_original_recording_has_matching_caption_chapters(self):
        contents = remix.CAPTIONS.read_text(encoding="utf-8")
        captions = remix.narration_from_captions(contents)
        import json
        chapters = json.loads(remix.MANIFEST.read_text(encoding="utf-8"))["chapters"]
        self.assertEqual(len(captions), len(chapters))
        self.assertGreaterEqual(len(chapters), 20)
        self.assertTrue(all(captions))
        self.assertIn("IACR Cryptology ePrint Archive", captions[1])

    def test_timestamps_keep_precise_webvtt_format(self):
        self.assertEqual(remix.timestamp(0), "00:00:00.000")
        self.assertEqual(remix.timestamp(71.317), "00:01:11.317")
        self.assertEqual(remix.timestamp(366.7), "00:06:06.700")

    def test_original_video_is_preserved_until_new_mix_completes(self):
        script=(ROOT/"scripts"/"revoice_tutorial.py").read_text("utf-8")
        self.assertIn("os.replace(final, VIDEO)",script)
        self.assertIn("render(text, wav)",script)
        self.assertIn('"voice_version": VOICE_VERSION',script)
        self.assertNotIn("espeak-ng",script.lower())


if __name__ == "__main__":
    unittest.main()
