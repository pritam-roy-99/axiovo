import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path

from scripts.arxiv_oai_windows import harvest_window, windows

START = dt.date(2020, 1, 1)
END = dt.date(2020, 1, 31)
NS = "http://www.openarchives.org/OAI/2.0/"

def page(token):
    token_xml = f"<resumptionToken>{token}</resumptionToken>"
    return (f'<OAI-PMH xmlns="{NS}"><ListRecords>'
            f'<record><header><identifier>oai:arXiv.org:1234.5678</identifier></header></record>'
            f'{token_xml}</ListRecords></OAI-PMH>').encode()

class WindowTests(unittest.TestCase):
    def test_month_partition(self):
        self.assertEqual(list(windows(dt.date(2020, 1, 30), dt.date(2020, 2, 2))),
                         [(dt.date(2020, 1, 30), dt.date(2020, 1, 31)),
                          (dt.date(2020, 2, 1), dt.date(2020, 2, 2))])

    def test_expiry_restarts_only_window(self):
        with tempfile.TemporaryDirectory() as root:
            calls = []
            def fetch(start, end, token):
                calls.append(token)
                if token == "old":
                    raise RuntimeError("OAI-PMH: badResumptionToken")
                return page("old" if len(calls) == 1 else "")
            state = harvest_window(root, START, END, 1, fetch, 0)
            self.assertEqual(state["pages"], 1)
            state = harvest_window(root, START, END, 1, fetch, 0)
            self.assertEqual(state["pages"], 0)
            self.assertEqual(state["replays"], 1)
            state = harvest_window(root, START, END, 1, fetch, 0)
            self.assertTrue(state["complete"])
            self.assertEqual(calls, ["", "old", ""])
            directory = Path(root) / "2020-01-01_2020-01-31"
            self.assertEqual(len(list(directory.glob("page-*.jsonl"))), 1)

if __name__ == "__main__":
    unittest.main()
