"""Protect relevant-result pagination in the three-source Discover pages."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
EXPLORER=(ROOT/"docs/topic-explorer.js").read_text(encoding="utf-8")

class PaginationContractTests(unittest.TestCase):
    def test_relevance_is_applied_before_pagination_stop(self):
        self.assertIn("page=data.merge(page,data.filter(result.papers,c));",EXPLORER)
        self.assertIn("while(page.length<12&&next!=null&&checked<4)",EXPLORER)
        self.assertIn("state.remote=data.merge(state.remote,page);",EXPLORER)
    def test_cursor_loops_and_abort_are_guarded(self):
        self.assertIn("next=seen.has(String(result.next))?null:result.next;",EXPLORER)
        self.assertIn("if(signal.aborted)return;",EXPLORER)
    def test_search_discloses_partial_coverage(self):
        self.assertIn("Coverage may be partial.",EXPLORER)
        self.assertIn("More pages available.",EXPLORER)

if __name__=="__main__":
    unittest.main()
