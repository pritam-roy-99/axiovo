import tempfile
import unittest
from pathlib import Path
from scripts import arxiv_oai_history as history

OAI = "http://www.openarchives.org/OAI/2.0/"
ARXIV = "http://arxiv.org/OAI/arXiv/"

def xml(token):
    return (f'<OAI-PMH xmlns="{OAI}"><ListRecords><record><header>'
            f'<identifier>oai:arXiv.org:1234.5678</identifier><datestamp>2026-11-01</datestamp>'
            f'</header><metadata><arXiv xmlns="{ARXIV}"><id>1234.5678</id>'
            f'<title>Test</title><categories>quant-ph</categories></arXiv></metadata>'
            f'</record><resumptionToken>{token}</resumptionToken></ListRecords></OAI-PMH>').encode()

class HistoryTests(unittest.TestCase):
    def test_resume_and_finish(self):
        calls = []
        def fetch(token):
            calls.append(token)
            return xml("next") if token == "" else xml("")
        with tempfile.TemporaryDirectory() as directory:
            first = history.harvest(directory, 1, fetch)
            self.assertFalse(first["complete"])
            self.assertEqual(first["next_token"], "next")
            second = history.harvest(directory, 1, fetch)
            self.assertTrue(second["complete"])
            self.assertEqual(calls, ["", "next"])
            self.assertEqual(len(list(Path(directory).glob("page-*.jsonl"))), 2)
            history.harvest(directory, 1, fetch)
            self.assertEqual(len(calls), 2)

    def test_deleted_record_is_preserved_as_tombstone(self):
        raw = (f'<OAI-PMH xmlns="{OAI}"><ListRecords><record>'
               f'<header status="deleted"><identifier>oai:arXiv.org:1234.5678</identifier>'
               f'</header></record></ListRecords></OAI-PMH>').encode()
        records, token = history.parse(raw)
        self.assertTrue(records[0]["deleted"])
        self.assertEqual(token, "")

    def test_error_does_not_advance_checkpoint(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(RuntimeError):
                history.harvest(directory, 1, lambda token: b'<OAI-PMH xmlns="' + OAI.encode() + b'"><error code="badResumptionToken">Expired</error></OAI-PMH>')
            import json
            state = json.loads((Path(directory) / "checkpoint.json").read_text())
            self.assertEqual(state["pages"], 0)
            self.assertEqual(state["next_token"], "")
            self.assertTrue(state["recovery_required"])

    def test_expired_token_preserves_checkpoint_and_blocks_retries(self):
        import json
        with tempfile.TemporaryDirectory() as directory:
            history.harvest(directory, 1, lambda token: xml("continuation"))
            def expired(token):
                raise RuntimeError("OAI-PMH: badResumptionToken: Expired")
            with self.assertRaisesRegex(RuntimeError, "badResumptionToken"):
                history.harvest(directory, 1, expired)
            state = json.loads((Path(directory) / "checkpoint.json").read_text())
            self.assertEqual(state["pages"], 1)
            self.assertEqual(state["next_token"], "continuation")
            self.assertTrue(state["recovery_required"])
            with self.assertRaisesRegex(RuntimeError, "recovery required"):
                history.harvest(directory, 1, lambda token: self.fail("Must not retry"))

if __name__ == "__main__":
    unittest.main()
