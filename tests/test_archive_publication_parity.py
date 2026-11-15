import unittest
from scripts.check_archive_publication_parity import compare

class ParityTests(unittest.TestCase):
    def test_identical_reports(self):
        data={"schema_version":2,"sources":{"arxiv":{"status":"verified","complete":True,"categories":{"quant-ph":{"unique":4}}},"biorxiv":{"status":"partial"},"chemrxiv":{"status":"partial"},"eprint":{"status":"partial"}}}
        self.assertEqual(compare(data,data),[])
    def test_missing_live_paper_detected(self):
        a={"schema_version":2,"sources":{"arxiv":{"indexed_unique":10,"categories":{}}}}
        b={"schema_version":2,"sources":{"arxiv":{"indexed_unique":9,"categories":{}}}}
        self.assertTrue(any("indexed_unique" in x for x in compare(a,b)))
    def test_changed_categories_detected(self):
        a={"schema_version":2,"sources":{"arxiv":{"categories":{"quant-ph":{"v1":3}}}}}
        b={"schema_version":2,"sources":{"arxiv":{"categories":{"quant-ph":{"v1":2}}}}}
        self.assertIn("arxiv.categories differ",compare(a,b))
if __name__=="__main__": unittest.main()
