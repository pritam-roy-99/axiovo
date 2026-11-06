"""Protect relevant-result pagination in the three-source Discover pages."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
EXPLORER=(ROOT/"docs/topic-explorer.js").read_text(encoding="utf-8")

class PaginationContractTests(unittest.TestCase):
    def test_relevance_is_applied_before_pagination_stop(self):
        self.assertIn("let page=data.filter(result.papers,c);",EXPLORER)
        self.assertIn("while(page.length<12&&next!=null&&pagesChecked<4&&!signal.aborted)",EXPLORER)
        self.assertIn("page=data.merge(page,data.filter(additional.papers,c));",EXPLORER)
    def test_cursor_loops_and_abort_are_guarded(self):
        self.assertIn("if(seen.has(current))break;",EXPLORER)
        self.assertIn("if(signal.aborted)return;",EXPLORER)
    def test_search_discloses_partial_coverage(self):
        self.assertIn("Full archive coverage is not implied.",EXPLORER)
        self.assertIn("More pages available.",EXPLORER)

if __name__=="__main__":
    unittest.main()
