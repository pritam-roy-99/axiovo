"""Regression checks for cross-archive freshness snapshot protection."""
import unittest
from scripts.validate_sync_snapshots import acceptable, equivalent

def papers(n):
    return [{"id": str(i), "title": "Verified paper"} for i in range(n)]

class SnapshotIntegrityTests(unittest.TestCase):
    def test_rejects_older_arxiv_announcement(self):
        prior={"announcement_date":"2026-11-06","count":2,"complete":True,"papers":papers(2)}
        recent={"announcement_date":"2026-11-05","count":2,"complete":True,"papers":papers(2)}
        self.assertFalse(acceptable("announcements.json",prior,recent)[0])

    def test_rejects_partial_replacement_of_complete_batch(self):
        prior={"announcement_date":"2026-11-06","count":2,"complete":True,"papers":papers(2)}
        recent={"announcement_date":"2026-11-06","count":2,"complete":False,"papers":papers(2)}
        self.assertFalse(acceptable("announcements.json",prior,recent)[0])

    def test_rejects_duplicate_announcements(self):
        recent={"announcement_date":"2026-11-06","count":2,"complete":False,
                "papers":[{"id":"2611.12345"},{"id":"2611.12345"}]}
        self.assertFalse(acceptable("announcements.json",None,recent)[0])

    def test_rejects_biorxiv_incomplete_window_regression(self):
        prior={"complete_window":True,"papers":papers(2)}
        current={"complete_window":False,"count":2,"papers":papers(2)}
        self.assertFalse(acceptable("biorxiv.json",prior,current)[0])

    def test_rejects_eprint_record_loss(self):
        prior={"papers":papers(3)}
        current={"papers":papers(2),"known_records":2}
        self.assertFalse(acceptable("eprint.json",prior,current)[0])

    def test_accepts_newer_announcement(self):
        prior={"announcement_date":"2026-11-05","count":2,"complete":True,"papers":papers(2)}
        current={"announcement_date":"2026-11-06","count":3,"complete":True,"papers":papers(3)}
        self.assertTrue(acceptable("announcements.json",prior,current)[0])

    def test_final_rss_can_reconcile_early_catchup_count(self):
        prior={"announcement_date":"2026-11-09","count":3,"complete":False,
               "early_release":True,"papers":papers(3)}
        current={"announcement_date":"2026-11-09","count":2,"complete":True,
                 "source":"https://rss.arxiv.org/rss/","papers":papers(2)}
        self.assertTrue(acceptable("announcements.json",prior,current)[0])
        current["complete"]=False
        self.assertFalse(acceptable("announcements.json",prior,current)[0])

    def test_ignores_timestamp_only_changes(self):
        previous={"papers":papers(2),"generated_at":"2026-11-07T00:00:00Z"}
        updated={"papers":papers(2),"generated_at":"2026-11-08T00:00:00Z"}
        self.assertTrue(equivalent(previous,updated))

if __name__=="__main__":
    unittest.main()
