"""All public paper-listing views expose predictable sorting without changing Library keys."""
import unittest
from pathlib import Path

DOCS=Path(__file__).resolve().parents[1]/"docs"
class PaperSortUITests(unittest.TestCase):
    def test_search_and_discovery_controls(self):
        for source in ("arxiv","biorxiv","chemrxiv"):
            html=(DOCS/(source+".html")).read_text(encoding="utf8")
            self.assertIn('id="archive-result-sort"',html)
            self.assertIn('value="oldest"',html)
            self.assertIn('value="cited"',html)
            self.assertIn('src="./paper-sort.js"',html)
        desk=(DOCS/"desk.html").read_text(encoding="utf8")
        self.assertIn('id="rd-results-sort"',desk)
        self.assertIn('value="oldest"',desk)
        self.assertIn('value="cited"',desk)
    def test_local_workspaces(self):
        html=(DOCS/"workspace.html").read_text(encoding="utf8")
        for element in ("research-results-sort","library-papers-sort","following-papers-sort"):
            self.assertIn('id="'+element+'"',html)
        self.assertIn('value="title">Title A–Z',html)
        self.assertIn('src="./paper-sort.js"',html)
        for script in ("research-intelligence.js","workspace.js","following-authors.js"):
            self.assertIn("AxiovoPaperSort", (DOCS/script).read_text(encoding="utf8"))
    def test_personalized_feed(self):
        html=(DOCS/"feed.html").read_text(encoding="utf8")
        self.assertIn('id="feed-sort"',html)
        self.assertIn('src="./paper-sort.js"',html)
        source=(DOCS/"feed.js").read_text(encoding="utf8")
        self.assertIn('AxiovoPaperSort',source)
        self.assertIn('const filtered=current.filter(',source)
    def test_source_filtering_remains_before_sorting(self):
        data=(DOCS/"archive-data.js").read_text(encoding="utf8")
        self.assertIn('score:matchScore(p,criteria)',data)
        self.assertIn('filter(row=>row.score!==null)',data)
        self.assertIn('AxiovoPaperSort.sort(values,mode',data)
        self.assertIn('const OLD_SAVED="axiovo-reading-list"',(DOCS/"research-intelligence.js").read_text(encoding="utf8"))

if __name__=="__main__":
    unittest.main()
