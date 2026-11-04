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
            self.assertTrue((DOCS / icon["src"]).is_file(), icon["src"])

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
                path = DOCS / item.removeprefix("./")
                if item == "./":
                    path = DOCS / "index.html"
                self.assertTrue(path.is_file(), str(path))

    def test_local_launcher_is_loopback_only(self):
        script = (ROOT / "run.py").read_text()
        self.assertIn('"127.0.0.1"', script)
        self.assertIn('ThreadingHTTPServer', script)

    def test_worker_precaches_snapshot_but_not_remote_apis(self):
        worker = (DOCS / "sw.js").read_text()
        shell = re.search(r"const SHELL = \[(.*?)\];", worker, re.S).group(1)
        self.assertIn("feed.json", shell)
        self.assertNotIn("openalex.org", shell)


if __name__ == "__main__":
    unittest.main()
