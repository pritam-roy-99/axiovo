"""Cryptology ePrint ingestion: source IDs, dates, OAI pages, atomically preserved data."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts import sync_eprint as source

NS='xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:dc="http://purl.org/dc/elements/1.1/"'
ROW='''<record><header><identifier>oai:eprint.iacr.org:2026/2774</identifier><datestamp>2026-11-07</datestamp></header><metadata><oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"><dc:title>Separating Pseudorandom Codes from Quantum Random Oracles</dc:title><dc:creator>Nico Döttling</dc:creator><dc:description>Original source abstract text</dc:description><dc:date>2026-11-06</dc:date><dc:subject>Quantum cryptography</dc:subject><dc:identifier>https://eprint.iacr.org/2026/2774</dc:identifier></oai_dc:dc></metadata></record>'''
def page(items=ROW,token=""):
    return f'<OAI-PMH {NS}><ListRecords>{items}<resumptionToken>{token}</resumptionToken></ListRecords></OAI-PMH>'.encode()

class EprintTests(unittest.TestCase):
    def test_canonical_ids_do_not_invent_revisions(self):
        self.assertEqual(source.canonical("https://eprint.iacr.org/2026/2774"),"2026/2774")
        self.assertEqual(source.canonical("oai:eprint.iacr.org:2026/2774"),"2026/2774")
        self.assertEqual(source.canonical("oai:eprint.iacr.org:2005/001"),"2005/001")
        for bad in ("2026/0","2026/2774v2","javascript:evil","2026/2774/other"):
            self.assertIsNone(source.canonical(bad))
    def test_original_metadata_and_dates(self):
        result,token=source.parse_page(page())
        self.assertEqual(token,"")
        self.assertEqual(len(result),1)
        paper=result[0]
        self.assertEqual(paper["id"],"2026/2774")
        self.assertEqual(paper["title"],"Separating Pseudorandom Codes from Quantum Random Oracles")
        self.assertEqual(paper["date"],"2026-11-06")
        self.assertEqual(paper["metadata_updated"],"2026-11-07")
        self.assertEqual(paper["authors"],["Nico Döttling"])
        self.assertEqual(paper["url"],"https://eprint.iacr.org/2026/2774")
    def test_empty_oai_window(self):
        xml=f'<OAI-PMH {NS}><error code="noRecordsMatch">Nothing found</error></OAI-PMH>'.encode()
        self.assertEqual(source.parse_page(xml),([],""))
    def test_corrupt_xml_and_repeated_token_fail_closed(self):
        with self.assertRaises(Exception):source.parse_page(b"<broken>")
        with patch.object(source,"request",side_effect=[page(token="repeat"),page(token="repeat")]),patch.object(source.time,"sleep"):
            with self.assertRaisesRegex(ValueError,"Repeated OAI continuation"):
                source.collect(since="2026-11-01",max_pages=3,pause=0)
    def test_preserve_old_on_invalid_snapshot(self):
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder)/"eprint.json"
            source.write_snapshot([source.parse_page(page())[0][0]],out=output,complete=False)
            before=output.read_bytes()
            with self.assertRaisesRegex(ValueError,"No valid ePrint"):
                source.write_snapshot([],out=Path(folder)/"missing.json")
            self.assertEqual(output.read_bytes(),before)
            self.assertEqual(json.loads(before)["coverage"],"incremental-OAI-PMH-snapshot-not-full-history")
            self.assertTrue(json.loads(before)["no_claim_of_full_historical_coverage"])
    def test_historical_completion_survives_incremental_refresh(self):
        with tempfile.TemporaryDirectory() as folder:
            out=Path(folder)/"eprint.json"
            paper=source.parse_page(page())[0][0]
            first=source.write_snapshot([paper],out=out,full_traversal=True)
            self.assertTrue(first["historical_oai_traversal_complete"])
            self.assertTrue(first["historical_oai_traversal_finished_at"])
            recent=source.write_snapshot([paper],out=out,complete=True)
            self.assertTrue(recent["historical_oai_traversal_complete"])
            self.assertEqual(recent["historical_oai_traversal_finished_at"],
                             first["historical_oai_traversal_finished_at"])
            self.assertTrue(recent["no_claim_of_full_historical_coverage"])
    def test_deleted_record_is_respected(self):
        row=source.parse_page(page())[0][0]
        with tempfile.TemporaryDirectory() as folder:
            out=Path(folder)/"data.json"
            source.write_snapshot([row],out=out)
            source.write_snapshot([{"id":"2026/2774","deleted":True},
                                   {"id":"2026/2775","title":"Verified new record","authors":[]}],out=out)
            names=[p["id"] for p in json.loads(out.read_text())["papers"]]
            self.assertEqual(names,["2026/2775"])

if __name__=="__main__":unittest.main()
