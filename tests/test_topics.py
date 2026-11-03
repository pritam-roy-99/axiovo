import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from scripts.quantum_topics import assign_topics,topic_catalog
from scripts.enrich import title_match

class TopicTests(unittest.TestCase):
    def test_qkd(self):
        p={"title":"Device-independent quantum key distribution under collective attacks","abstract":"Security and secret-key rate."}
        self.assertIn("quantum-communication",assign_topics(p))
    def test_bell(self):
        p={"title":"CHSH nonlocality in a network","abstract":"Bell inequality."}
        self.assertIn("foundations",assign_topics(p))
    def test_contextuality(self):
        p={"title":"Preparation contextuality in parity-oblivious communication","abstract":"Quantum resources"}
        self.assertIn("contextuality",assign_topics(p))
    def test_catalog(self):
        self.assertGreaterEqual(len(topic_catalog()),12)
    def test_unrelated(self):
        self.assertEqual(assign_topics({"title":"Arbitrary generic title","abstract":"Nothing scientific"}),[])
    def test_verified_title_matching(self):
        self.assertTrue(title_match("A quantum bound: a result","A Quantum Bound - A Result"))
        self.assertFalse(title_match("A quantum bound","A stronger quantum bound"))

if __name__=="__main__":
    unittest.main()
