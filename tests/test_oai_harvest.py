import sys
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.oai_harvest import parse_page, merge, harvest

SAMPLE = b"""<?xml version="1.0"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
<ListRecords><record><header><identifier>oai:arXiv.org:2601.01234</identifier>
<datestamp>2026-11-03</datestamp></header>
<metadata><arXiv xmlns="http://arxiv.org/OAI/arXiv/">
<id>2601.01234</id><created>2026-01-03</created>
<authors><author><keyname>Smith</keyname><forenames>A.</forenames></author></authors>
<title>  A   paper on quantum steering </title>
<categories>quant-ph cs.IT</categories><abstract>A technical abstract.</abstract>
<doi>10.1000/example</doi></arXiv></metadata></record>
<resumptionToken>continue-this-page</resumptionToken></ListRecords></OAI-PMH>"""

class OaiTests(unittest.TestCase):
    def test_parse_page(self):
        records, token, errors = parse_page(SAMPLE)
        self.assertEqual(errors, [])
        self.assertEqual(token, "continue-this-page")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["id"], "2601.01234")
        self.assertEqual(records[0]["authors"], ["A. Smith"])
        self.assertEqual(records[0]["categories"], ["quant-ph", "cs.IT"])
        self.assertEqual(records[0]["oai_datestamp"], "2026-11-03")

    def test_duplicate_updates(self):
        p = parse_page(SAMPLE)[0][0]
        older = dict(p, title="Old title", oai_datestamp="2026-11-02")
        self.assertEqual(merge([older], [p])[0]["title"], p["title"])
        self.assertEqual(merge([p], [older])[0]["title"], p["title"])

    def test_oai_error(self):
        source = b'<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"><error code="badArgument">Invalid argument</error></OAI-PMH>'
        self.assertEqual(parse_page(source)[2], ["Invalid argument"])


    def test_repeated_continuation_token_aborts_without_completion(self):
        with patch("scripts.oai_harvest.fetch", return_value=SAMPLE), patch("scripts.oai_harvest.time.sleep"):
            with self.assertRaisesRegex(RuntimeError,"Repeated or invalid OAI continuation token"):
                harvest("2026-11-01", max_pages=5)

    def test_deleted_record(self):
        source = b'<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"><ListRecords><record><header status="deleted"><identifier>oai:arXiv.org:2601.00123</identifier></header></record></ListRecords></OAI-PMH>'
        self.assertEqual(parse_page(source)[0], [])

if __name__ == "__main__":
    unittest.main()
