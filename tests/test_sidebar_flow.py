"""Prevent the shared desktop sidebar links from returning to absolute/fixed overlap."""
import unittest
from pathlib import Path

DOCS = Path(__file__).resolve().parents[1] / "docs"


class SidebarFlowTests(unittest.TestCase):
    def test_desktop_links_reuse_shared_navigation(self):
        ui = (DOCS / "axiovo-blueprint-ui.js").read_text(encoding="utf-8")
        self.assertIn("const sideNav=nav.cloneNode(true)", ui)
        self.assertIn('sideNav.classList.add("ax-sidebar-nav")', ui)
        self.assertIn('sidebar.insertBefore(sideNav,sidebar.querySelector(".ax-sidebar-extra"))', ui)
        # The source navigation must remain available to the mobile bottom bar.
        self.assertNotIn("header.removeChild(nav)", ui)

    def test_sidebar_groups_flow_without_fixed_overlay(self):
        css = (DOCS / "axiovo-blueprint-ui.css").read_text(encoding="utf-8")
        section = css.split("Desktop navigation participates in one normal sidebar flow.", 1)[1]
        self.assertIn("position:static!important", section)
        self.assertIn(".ax-sidebar .ax-sidebar-nav", section)
        self.assertIn(".ax-sidebar-extra", section)
        self.assertIn("margin:18px 0 0!important", section)
        self.assertIn("overflow-y:auto!important", section)
        self.assertIn("header.rl-global-header nav.rl-nav", section)

    def test_versioned_styles_load_everywhere(self):
        navigation = (DOCS / "navigation.js").read_text(encoding="utf-8")
        self.assertIn('const version="20261111-sidebar-flow-v1"', navigation)
        self.assertIn("existing.href=asset.href", navigation)


if __name__ == "__main__":
    unittest.main()
