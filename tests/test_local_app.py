"""Static regression coverage for the installable local ResearchLens experience."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
PAGES = ("index", "workspace", "copilot", "lab", "paper", "profiles", "methodology")


class InstallableAppTests(unittest.TestCase):
    def test_manifest(self):
        data = json.loads((DOCS / "manifest.webmanifest").read_text())
        self.assertEqual(data["display"], "standalone")
        self.assertEqual(data["start_url"], "./")
        for icon in data["icons"]:
            # Manifest icon sources are URLs; version query strings are not filenames.
            from urllib.parse import urlsplit, unquote
            src = icon["src"]
            parsed = urlsplit(src)
            self.assertFalse(parsed.scheme or parsed.netloc, src)
            path = unquote(parsed.path)
            self.assertTrue(path.startswith("./"), src)
            relative = Path(path.removeprefix("./"))
            self.assertNotIn("..", relative.parts, src)
            self.assertTrue((DOCS / relative).is_file(), src)

    def test_launcher_art_matches_approved_logo(self):
        # Prevent the installed desktop and Android app from reverting to the old A.
        approved = (DOCS / "icons/axiovo-approved.svg").read_text()
        launcher = (DOCS / "icons/axiovo.svg").read_text()
        logo = re.search(r"data:image/webp;base64,([A-Za-z0-9+/=]+)", approved)
        self.assertIsNotNone(logo, "Approved wordmark image missing")
        self.assertIn(logo.group(1), launcher, "Launcher does not use the official Axiovo artwork")
        self.assertIn('viewBox="0 0 96 79"', launcher, "Launcher must crop the A mark, not the entire wordmark")
        manifest = json.loads((DOCS / "manifest.webmanifest").read_text())
        self.assertTrue(all("approved-desktop-v3" in icon["src"] for icon in manifest["icons"]))

    def test_primary_pages_are_installable(self):
        for page in PAGES:
            with self.subTest(page=page):
                html = (DOCS / f"{page}.html").read_text()
                self.assertIn('rel="manifest"', html)
                self.assertIn('src="./pwa.js"', html)

    def test_shell_assets_exist(self):
        service_worker = (DOCS / "sw.js").read_text()
        shell = re.search(r"const SHELL = \[(.*?)\];", service_worker, re.S)
        self.assertIsNotNone(shell)
        for item in re.findall(r'"(\./[^"]+)"', shell.group(1)):
            with self.subTest(url=item):
                path = DOCS / item.split("?",1)[0].removeprefix("./")
                if item == "./":
                    path = DOCS / "index.html"
                self.assertTrue(path.is_file(), str(path))

    def test_local_launcher_is_loopback_only(self):
        script = (ROOT / "run.py").read_text()
        self.assertIn('"127.0.0.1"', script)
        self.assertIn('ThreadingHTTPServer', script)

    def test_worker_precaches_routes_and_not_remote_metadata(self):
        worker = (DOCS / "sw.js").read_text()
        shell = re.search(r"const SHELL = \[(.*?)\];", worker, re.S).group(1)
        self.assertIn("workspace.html", shell)
        self.assertNotIn("feed.json", shell)
        self.assertNotIn("openalex.org", shell)


if __name__ == "__main__":
    unittest.main()
