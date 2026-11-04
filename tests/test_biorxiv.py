"""BioRxiv public API normalization, caching and source transparency."""
import unittest
from scripts.sync_biorxiv import build, normalize

class BioRxivTests(unittest.TestCase):
    def test_normalize_doi_and_category(self):
        raw={"doi":"10.1101/2026.10.01.123456","title":"  Cell  structure and   function ",
             "authors":"A. Researcher; B. Scientist","abstract":"  A bioRxiv study ",
             "date":"2026-10-02","version":"2","category":"cell biology"}
        x=normalize(raw)
        self.assertEqual(x["doi"],"10.1101/2026.10.01.123456")
        self.assertEqual(x["title"],"Cell structure and function")
        self.assertEqual(x["authors"],["A. Researcher","B. Scientist"])
        self.assertIn("www.biorxiv.org/content/10.1101/",x["url"])
        self.assertEqual(normalize({"doi":"10.64898/2026.08.28.747819","title":"New DOI format","authors":"A. Scientist"})["doi"],"10.64898/2026.08.28.747819")
        self.assertIsNone(normalize({"doi":"bad","title":"fake"}))

    def test_preserves_distinct_records_and_versions(self):
        a={"doi":"10.1101/2026.10.01.123456","title":"A biology study",
           "authors":"A. Researcher","date":"2026-10-01","version":"1"}
        b={**a,"version":"2","date":"2026-10-03","title":"Updated biology study"}
        result=build({"collection":[a,b]})
        self.assertEqual(len(result["papers"]),1)
        self.assertEqual(result["papers"][0]["version"],"2")
        self.assertEqual(result["papers"][0]["title"],"Updated biology study")
        self.assertRaises(ValueError,build,{"collection":[]})

if __name__=="__main__":
    unittest.main()
