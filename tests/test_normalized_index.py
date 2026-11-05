"""The normalized index must never fabricate metadata or misstate coverage."""
import json
import tempfile
import unittest
from pathlib import Path
from scripts.build_normalized_index import normalize, prefer, build


class NormalizedIndexTests(unittest.TestCase):
    def test_arxiv_identity_and_announcement_are_distinct(self):
        entry = normalize("arxiv", {"id":"2611.00001v2","title":" Verified title ",
             "authors":["Author A"],"categories":["math-ph"],"announcement_date":"2026-11-06",
             "version":2}, "2026-11-06T00:00:00Z", "announcements.json")
        self.assertEqual(entry["id"],"arxiv:2611.00001")
        self.assertEqual(entry["landing_url"],"https://arxiv.org/abs/2611.00001v2")
        self.assertEqual(entry["pdf_url"],"https://arxiv.org/pdf/2611.00001v2")
        self.assertEqual(entry["announced_date"],"2026-11-06")
        self.assertIsNone(entry["submitted_date"])
        self.assertIsNone(entry["doi"])
        self.assertTrue(entry["tagging"]["review_required"])

    def test_no_unverified_input_records(self):
        self.assertIsNone(normalize("arxiv",{"id":"NOT_A_VALID_ID","title":"Fake"},"","feed.json"))
        self.assertIsNone(normalize("biorxiv",{"doi":"10.9999/unrelated","title":"Other source"},"","biorxiv.json"))
        self.assertIsNone(normalize("chemrxiv",{"doi":"10.9999/unrelated","title":"Other source"},"","chemrxiv.json"))

    def test_revision_dedup_does_not_copy_old_abstract(self):
        old=normalize("arxiv",{"id":"2611.00002v1","title":"Original","abstract":"Old findings"},
                      "2026-11-05","feed.json")
        new=normalize("arxiv",{"id":"2611.00002v2","title":"Updated","abstract":""},
                      "2026-11-06","feed.json")
        selected=prefer(old,new)
        self.assertEqual(selected["version"],2)
        self.assertEqual(selected["abstract"],"")

    def test_month_shards_match_coverage_counts(self):
        with tempfile.TemporaryDirectory() as directory:
            directory=Path(directory)
            input_dir=directory/"data"
            out_dir=directory/"normalized"
            input_dir.mkdir()
            (input_dir/"feed.json").write_text(json.dumps({"generated_at":"2026-11-06T01:00:00Z",
             "papers":[{"id":"2611.00002v1","title":"Reliable arXiv paper","published":"2026-11-05",
                        "categories":["math-ph"]}]}))
            (input_dir/"announcements.json").write_text(json.dumps({"checked_at":"2026-11-06T02:00:00Z",
             "papers":[{"id":"2611.00002v1","title":"Reliable arXiv paper","announcement_date":"2026-11-06",
                        "categories":["math-ph"]}]}))
            (input_dir/"biorxiv.json").write_text(json.dumps({"generated_at":"2026-11-06T03:00:00Z",
             "papers":[{"doi":"10.1101/2026.11.05.000001","title":"Verified bioRxiv record",
                        "date":"2026-11-05","category":"genomics"}]}))
            (input_dir/"chemrxiv.json").write_text(json.dumps({"papers":[]}))
            coverage=build(input_dir,out_dir)
            self.assertEqual(coverage["unique_papers"],2)
            self.assertEqual(sum(row["count"] for row in coverage["shards"]),2)
            self.assertEqual(coverage["pending_subtopic_review"],2)
            self.assertEqual(coverage["by_source"],{"arxiv":1,"biorxiv":1})
            self.assertEqual(coverage["daily_counts_by_first_submission_date"]["arxiv"]["2026-11-05"],1)
            manifest=json.loads((out_dir/"manifest.json").read_text())
            self.assertEqual(manifest["unique_papers"],2)
            self.assertTrue(all((out_dir/row["path"]).is_file() for row in manifest["shards"]))
            shard=json.loads((out_dir/"arxiv"/"2026-11.json").read_text())
            paper=shard["papers"][0]
            self.assertEqual(paper["submitted_date"],"2026-11-05")
            self.assertEqual(paper["announced_date"],"2026-11-06")
            self.assertTrue(paper["landing_url"].startswith("https://arxiv.org/abs/"))
            self.assertEqual(coverage["coverage_status"],"partial-snapshots-not-full-archives")


if __name__=="__main__":
    unittest.main()
