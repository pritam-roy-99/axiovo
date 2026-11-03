import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.sync import parse_id, parse_atom, merge

class ArxivSyncTests(unittest.TestCase):
    def test_arxiv_id(self):
        self.assertEqual(parse_id("https://arxiv.org/abs/2601.00123v3"), ("2601.00123", 3))

    def test_version_upgrade(self):
        old={"id":"2601.00123","version":1,"title":"Old","updated":"2026-01-01"}
        new={"id":"2601.00123","version":2,"title":"New","updated":"2026-01-02"}
        self.assertEqual(merge([old],[new])[0]["title"],"New")
        self.assertEqual(merge([new],[old])[0]["title"],"New")

    def test_atom(self):
        xml=b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/2601.00123v2</id><title> An  Example </title><summary> Abstract </summary><published>2026-01-01</published><updated>2026-01-02</updated><author><name>Researcher One</name></author><category term="quant-ph"/></entry></feed>'
        paper=parse_atom(xml)[0]
        self.assertEqual((paper["id"],paper["version"],paper["title"]),("2601.00123",2,"An Example"))
        self.assertEqual(paper["primary_category"],"quant-ph")

if __name__ == "__main__":
    unittest.main()
