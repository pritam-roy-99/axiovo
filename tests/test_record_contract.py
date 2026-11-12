"""Phase 1: source identity and integrity regression fixtures (offline)."""
import json
import tempfile
import unittest
from pathlib import Path

from scripts.record_contract import (
    InvalidRecord, arxiv_id, doi_id, normalize_record,
    choose_same_revision
)
from scripts.build_source_v2 import build, verify_index


class ContractTests(unittest.TestCase):
    def test_arxiv_pinned_revision_and_date_types(self):
        item=normalize_record("arxiv", {
            "id":"2611.00001v2", "title":"A source title",
            "authors":["Author A"],"published":"2026-11-05T00:00:00Z",
            "announcement_date":"2026-11-06"},
            provider="arxiv-atom",checked_at="2026-11-07T00:00:00Z")
        self.assertEqual(item["id"],"arxiv:2611.00001")
        self.assertEqual(item["version"],2)
        self.assertEqual(item["submitted_date"],"2026-11-05")
        self.assertEqual(item["announced_date"],"2026-11-06")
        self.assertEqual(item["landing_url"],"https://arxiv.org/abs/2611.00001v2")
        self.assertEqual(item["provenance"]["provider"],"arxiv-atom")

    def test_legacy_arxiv_and_urls(self):
        self.assertEqual(arxiv_id("https://arxiv.org/abs/hep-th/9901001v3"),("hep-th/9901001",3))
        self.assertEqual(arxiv_id("https://arxiv.org/pdf/2611.12345v1.pdf"),("2611.12345",1))
        self.assertEqual(doi_id("HTTPS://doi.org/10.1101/ABC.2"),"10.1101/abc.2")

    def test_no_fabricated_version(self):
        item=normalize_record("arxiv",{"id":"2611.00001","title":"Paper"},provider="oai")
        self.assertIsNone(item["version"])
        self.assertEqual(item["landing_url"],"https://arxiv.org/abs/2611.00001")

    def test_conflicting_versions_rejected(self):
        with self.assertRaisesRegex(InvalidRecord,"conflicting_arxiv_versions"):
            normalize_record("arxiv",{"id":"2611.00001v1","version":2,"title":"Paper"},provider="oai")


    def test_same_revision_dates_are_complementary_but_conflicts_are_visible(self):
        one=normalize_record("arxiv",{"id":"2611.00001v2","title":"Paper",
            "published":"2026-11-05"},provider="atom")
        two=normalize_record("arxiv",{"id":"2611.00001v2","title":"Paper",
            "announcement_date":"2026-11-06"},provider="rss")
        combined=choose_same_revision(one,two)
        self.assertEqual(combined["submitted_date"],"2026-11-05")
        self.assertEqual(combined["announced_date"],"2026-11-06")
        conflicting=normalize_record("arxiv",{"id":"2611.00001v2","title":"Changed paper",
            "published":"2026-11-04"},provider="oai")
        flagged=choose_same_revision(combined,conflicting)
        self.assertIn("source_disagreement:submitted_date",flagged["validation"]["warnings"])
        self.assertIn("source_disagreement:title",flagged["validation"]["warnings"])

    def test_invalid_identifiers_rejected(self):
        for source,raw in [
            ("arxiv",{"id":"arxiv:invented","title":"Paper"}),
            ("biorxiv",{"doi":"10.26434/chemrxiv-123","title":"Paper"}),
            ("chemrxiv",{"doi":"10.1101/12345","title":"Paper"}),
            ("biorxiv",{"doi":"10.1101/12345","title":" "})]:
            with self.subTest(source=source,raw=raw),self.assertRaises(InvalidRecord):
                normalize_record(source,raw,provider=source)

    def test_distinct_papers_and_revisions_never_merge(self):
        a=normalize_record("arxiv",{"id":"2611.00001v1","title":"Same title","abstract":"Old"},provider="atom")
        b=normalize_record("arxiv",{"id":"2611.00001v2","title":"Same title","abstract":"New"},provider="atom")
        with self.assertRaisesRegex(InvalidRecord,"cross_revision_merge"):
            choose_same_revision(a,b)
        c=normalize_record("arxiv",{"id":"2611.00002v1","title":"Same title"},provider="atom")
        self.assertNotEqual(a["id"],c["id"])


class IntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base=Path(self.temp.name)
        self.data=self.base/"data"
        self.out=self.base/"v2"
        self.data.mkdir()
        (self.data/"feed.json").write_text(json.dumps({"generated_at":"2026-11-07T00:00:00Z",
            "papers":[
                {"id":"2611.00001v1","title":"Early version","published":"2026-11-05","abstract":"Initial"},
                {"id":"2611.00001v2","title":"Updated version","published":"2026-11-05","abstract":"Revised"},
                {"id":"2611.00002","title":"Same-looking title","published":"2026-11-05"},
                {"id":"invalid","title":"Bad identity"}
            ]}))
        (self.data/"biorxiv.json").write_text(json.dumps({"papers":[
            {"doi":"10.1101/2026.11.05.000001","title":"Biology paper","date":"2026-11-05"}]}))

    def test_version_stable_shards_and_manifest_hashes(self):
        manifest=build(self.data,self.out)
        self.assertEqual(manifest["record_count"],4)
        self.assertEqual(manifest["by_source"],{"arxiv":3,"biorxiv":1})
        self.assertEqual(manifest["rejection_reasons"],{"invalid_arxiv_id":1})
        self.assertFalse(manifest["complete_dates"])
        self.assertEqual(manifest["coverage_status"],"partial-snapshots-not-full-archives")
        files={shard["path"]:(self.out/shard["path"]).read_bytes() for shard in manifest["shards"]}
        build(self.data,self.out)
        for path,original in files.items():
            self.assertEqual((self.out/path).read_bytes(),original)
        self.assertEqual(verify_index(self.out)["record_count"],4)
        papers=json.loads((self.out/"arxiv/2026-11.json").read_text())["papers"]
        versions=sorted(p["version"] for p in papers if p["source_id"]=="2611.00001")
        self.assertEqual(versions,[1,2])
        self.assertEqual({p["abstract"] for p in papers if p["source_id"]=="2611.00001"},{"Initial","Revised"})

    def test_corrupt_shard_detected(self):
        manifest=build(self.data,self.out)
        shard=self.out/manifest["shards"][0]["path"]
        shard.write_bytes(shard.read_bytes()+b" ")
        with self.assertRaisesRegex(ValueError,"sha256_mismatch"):
            verify_index(self.out)

    def test_missing_provider_does_not_delete_verified_index(self):
        build(self.data,self.out)
        previous=(self.out/"manifest.json").read_bytes()
        empty=self.base/"broken_source";empty.mkdir()
        with self.assertRaisesRegex(ValueError,"No valid source records"):
            build(empty,self.out)
        self.assertEqual((self.out/"manifest.json").read_bytes(),previous)


if __name__=="__main__":
    unittest.main()
