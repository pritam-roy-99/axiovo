import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import urllib.parse
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.sync import parse_id, parse_atom, merge, read_pinned_ids, fetch_by_ids, fetch_recent

class ArxivSyncTests(unittest.TestCase):
    def test_arxiv_id(self):
        self.assertEqual(parse_id("https://arxiv.org/abs/2601.00123v3"), ("2601.00123", 3))

    def test_version_upgrade(self):
        old={"id":"2601.00123","version":1,"title":"Old","updated":"2026-01-01"}
        new={"id":"2601.00123","version":2,"title":"New","updated":"2026-01-02"}
        self.assertEqual(merge([old],[new])[0]["title"],"New")
        self.assertEqual(merge([new],[old])[0]["title"],"New")


    def test_recent_submissions_not_evicted_by_old_revisions(self):
        # The rolling index must prioritize first submissions, not edit dates.
        papers=[
            {"id":"2601.00001","title":"New submission","published":"2026-11-03T01:00:00Z","updated":"2026-11-03T01:00:00Z"},
            {"id":"2401.00001","title":"Old revised","published":"2024-01-01T01:00:00Z","updated":"2026-11-03T02:00:00Z"},
        ]
        self.assertEqual(merge([], papers, limit=1)[0]["id"],"2601.00001")

    def test_fetch_recent_polls_submissions_and_updates(self):
        xml=b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/2601.00123v1</id><title> New </title><summary>A</summary><published>2026-01-01</published><updated>2026-01-01</updated><category term="quant-ph"/></entry></feed>'
        requests=[]
        class FakeResponse:
            def __enter__(self): return self
            def __exit__(self,*args): return False
            def read(self): return xml
        def fake_urlopen(req,timeout=45):
            requests.append(urllib.parse.parse_qs(urllib.parse.urlsplit(req.full_url).query)["sortBy"][0])
            return FakeResponse()
        with patch.dict("os.environ", {"ARXIV_CATEGORIES":"quant-ph","ARXIV_MAX_RESULTS":"10"}), \\
             patch("scripts.sync.urllib.request.urlopen",side_effect=fake_urlopen), \\
             patch("scripts.sync.time.sleep"):
            papers=fetch_recent()
        self.assertEqual(requests,["submittedDate","lastUpdatedDate"])
        self.assertEqual(len(papers),2)

    def test_historical_index_has_requested_paper(self):
        self.assertIn("2608.13942", read_pinned_ids())

    def test_pinned_lookup_empty_does_not_make_network_request(self):
        self.assertEqual(fetch_by_ids([]), [])

    def test_atom(self):
        xml=b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/2601.00123v2</id><title> An  Example </title><summary> Abstract </summary><published>2026-01-01</published><updated>2026-01-02</updated><author><name>Researcher One</name></author><category term="quant-ph"/></entry></feed>'
        paper=parse_atom(xml)[0]
        self.assertEqual((paper["id"],paper["version"],paper["title"]),("2601.00123",2,"An Example"))
        self.assertEqual(paper["primary_category"],"quant-ph")

if __name__ == "__main__":
    unittest.main()
