"""Guard shared navigation and mobile layout from page-specific regressions."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

class SharedHeaderTests(unittest.TestCase):
    def test_shared_appearance_group_is_atomic(self):
        nav = (DOCS / "navigation.js").read_text(encoding="utf-8")
        self.assertIn('appearance.className="axiovo-header-appearance"', nav)
        self.assertIn('appearance.append(settings)', nav)
        self.assertIn('appearance.append(toggle)', nav)
        self.assertIn('header.replaceChildren(logo,nav,appearance)', nav)
        self.assertNotIn('header.append(toggle)', nav)

    def test_mobile_layout_keeps_appearance_in_first_row(self):
        css = (DOCS / "axiovo-shell.css").read_text(encoding="utf-8")
        self.assertIn('header.rl-global-header > .axiovo-header-appearance', css)
        self.assertIn('grid-column:2!important', css)
        self.assertIn('grid-row:1!important', css)
        self.assertIn('grid-template-columns:minmax(0,1fr) auto!important', css)
        self.assertIn('flex-wrap:nowrap!important', css)

    def test_all_major_pages_load_shared_header_assets(self):
        pages = (
            "index.html", "desk.html", "workspace.html", "copilot.html",
            "arxiv.html", "biorxiv.html", "chemrxiv.html",
            "profiles.html", "lab.html", "paper.html",
        )
        for name in pages:
            with self.subTest(page=name):
                page = (DOCS / name).read_text(encoding="utf-8")
                self.assertIn('navigation.js', page)
                self.assertIn('axiovo-shell.css', page)

if __name__ == "__main__":
    unittest.main()
