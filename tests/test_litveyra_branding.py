"""Check visible branding without changing persistent storage identifiers."""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"


class AxiovoBrandingTests(unittest.TestCase):
    def test_manifest_display_identity(self):
        manifest = json.loads((DOCS / "manifest.webmanifest").read_text())
        self.assertEqual(manifest["name"], "Axiovo")
        self.assertEqual(manifest["short_name"], "Axiovo")

    def test_primary_page_titles_and_navigation(self):
        for name in ["index", "workspace", "copilot", "lab", "paper", "profiles", "methodology"]:
            with self.subTest(name=name):
                html = (DOCS / f"{name}.html").read_text()
                self.assertIn("Axiovo", html)
        self.assertIn('document.createTextNode(" Axiovo")', (DOCS / "navigation.js").read_text())

    def test_keep_existing_browser_data_keys(self):
        workspace = (DOCS / "workspace.js").read_text()
        self.assertIn("researchlens-reading-list", workspace)
        self.assertIn("researchlens-library-metadata-v1", workspace)

    def test_pwa_cache_migrates_old_shell(self):
        worker = (DOCS / "sw.js").read_text()
        self.assertIn("axiovo-shell-v3", worker)
        self.assertIn("researchlens-shell-", worker)


if __name__ == "__main__":
    unittest.main()
