"""Feature 1 regression tests: SQLite schema, source identity and import semantics."""
from __future__ import annotations
import sqlite3
import tempfile
import unittest
from pathlib import Path
from backend.import_snapshots import open_database, import_papers, canonical_identifier

class TestResearchDatabase(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory()
        self.connection=open_database(Path(self.folder.name)/"research.sqlite")

    def tearDown(self):
        self.connection.close()
        self.folder.cleanup()

    @staticmethod
    def sample(source, *, title="Quantum network robustness", version="1"):
        if source=="arxiv":
            return {"id":"2611.12345","version":version,"title":title,
                    "abstract":"Robustness of entanglement and quantum networks.",
                    "authors":["Alice Smith","Bob Chen"],"categories":["quant-ph","cs.IT"],
                    "primary_category":"quant-ph","published":"2026-11-05T12:00:00Z",
                    "updated":"2026-11-05T12:00:00Z","doi":"10.5555/example"}
        if source=="biorxiv":
            return {"doi":"10.64898/2026.11.05.123456","title":title,
                    "authors":["Alice Smith"],"abstract":"Biological study.",
                    "category":"genomics","date":"2026-11-05","version":version}
        return {"doi":"10.26434/chemrxiv-2026-xyz","title":title,
                "authors":["Alice Smith"],"abstract":"Chemical study.","source":"ChemRxiv",
                "category":"Physical Chemistry","date":"2026-11-05"}

    def count(self, table):
        return self.connection.execute("SELECT count(*) FROM "+table).fetchone()[0]

    def test_three_sources_preserve_distinct_identifiers(self):
        for source in ("arxiv","biorxiv","chemrxiv"):
            outcome=import_papers(self.connection,source,[self.sample(source)])
            self.assertEqual(outcome["accepted"],1)
        self.assertEqual(self.count("papers"),3)
        self.assertEqual(self.count("coverage"),3)
        self.assertEqual(self.count("paper_identifiers"),6)
        self.assertEqual(self.count("citation_edges"),0)
        for source in ("arxiv","biorxiv","chemrxiv"):
            row=self.connection.execute("SELECT status FROM coverage WHERE source=?",(source,)).fetchone()
            self.assertEqual(row[0],"partial")

    def test_rerun_does_not_duplicate_and_updates_fts(self):
        one=self.sample("arxiv")
        import_papers(self.connection,"arxiv",[one])
        two=dict(one,title="Quantum steering certification",version="2",updated="2026-11-06T00:00:00Z")
        import_papers(self.connection,"arxiv",[two])
        import_papers(self.connection,"arxiv",[two])
        self.assertEqual(self.count("papers"),1)
        self.assertEqual(self.count("paper_versions"),2)
        self.assertEqual(self.count("paper_authors"),2)
        self.assertEqual(self.count("paper_categories"),2)
        self.assertEqual(self.count("paper_identifiers"),2)
        self.assertEqual(self.connection.execute(
            "SELECT count(*) FROM papers_fts WHERE papers_fts MATCH 'steering'").fetchone()[0],1)
        self.assertEqual(self.connection.execute(
            "SELECT count(*) FROM papers_fts WHERE papers_fts MATCH 'robustness'").fetchone()[0],1)

    def test_crosslisted_categories_are_not_duplicate_papers(self):
        import_papers(self.connection,"arxiv",[self.sample("arxiv")])
        self.assertEqual(self.count("papers"),1)
        self.assertEqual(self.count("paper_categories"),2)
        categories=self.connection.execute(
            "SELECT source_code FROM categories ORDER BY source_code").fetchall()
        self.assertEqual([r[0] for r in categories],["cs.IT","quant-ph"])

    def test_same_author_name_normalized(self):
        first=self.sample("arxiv")
        second=self.sample("biorxiv")
        second["authors"]=["  ALICE  SMITH "]
        import_papers(self.connection,"arxiv",[first])
        import_papers(self.connection,"biorxiv",[second])
        self.assertEqual(self.count("authors"),2)
        self.assertEqual(self.count("paper_authors"),3)

    def test_invalid_records_are_rejected_without_invented_links(self):
        invalid={"id":"not a paper","title":"Anything"}
        result=import_papers(self.connection,"arxiv",[invalid,self.sample("arxiv")])
        self.assertEqual((result["accepted"],result["rejected"]),(1,1))
        self.assertEqual(self.count("papers"),1)
        self.assertEqual(self.count("citation_edges"),0)
        self.assertEqual(self.connection.execute("SELECT status FROM ingestion_runs").fetchone()[0],"partial")

    def test_invalid_doi_and_unrelated_archive_are_rejected(self):
        item=self.sample("chemrxiv")
        item["doi"]="10.1101/2026.11.05.0001"
        item["source"]="Unrelated"
        self.assertEqual(import_papers(self.connection,"chemrxiv",[item])["accepted"],0)
        self.assertIsNone(canonical_identifier("biorxiv",{"doi":"10.26434/123"}))
        self.assertEqual(self.count("papers"),0)

    def test_fts_delete_updates_and_foreign_keys(self):
        import_papers(self.connection,"arxiv",[self.sample("arxiv")])
        with self.connection:
            self.connection.execute("DELETE FROM papers")
        self.assertEqual(self.count("papers_fts"),0)
        self.assertEqual(self.count("paper_authors"),0)
        self.assertEqual(self.count("paper_versions"),0)

    def test_no_cross_source_title_deduplication(self):
        for source in ("arxiv","biorxiv","chemrxiv"):
            import_papers(self.connection,source,[self.sample(source,title="Exactly the same title")])
        self.assertEqual(self.count("papers"),3)

if __name__=="__main__":
    unittest.main()
