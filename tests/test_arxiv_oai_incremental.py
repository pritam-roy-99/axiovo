"""Official OAI-PMH pagination and source-date semantics."""
import datetime as dt
import tempfile
import unittest
import urllib.parse
from pathlib import Path
from unittest.mock import patch
from scripts import arxiv_oai_incremental as O

def xml(rows,token=""):
    return ('''<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
      <ListRecords>'''+ "".join(rows) +
      ('<resumptionToken>'+token+'</resumptionToken>' if token else '') +
      '</ListRecords></OAI-PMH>').encode()

def paper(identifier, name="Sarkar", given="Shubhayan",date="2026-11-04"):
    return f'''<record>
     <header><identifier>oai:arXiv.org:{identifier}</identifier><datestamp>2026-11-05</datestamp></header>
     <metadata><arXiv xmlns="http://arxiv.org/OAI/arXiv/">
     <id>{identifier}</id><created>{date}</created><updated>2026-11-05</updated>
     <title>Network steering physics</title><abstract>Quantum networks and measurement.</abstract>
     <authors><author><keyname>{name}</keyname><forenames>{given}</forenames></author></authors>
     <categories>quant-ph hep-th</categories>
     </arXiv></metadata></record>'''

class Context:
    def __init__(self,value):self.value=value
    def __enter__(self):return self
    def __exit__(self,*args):return False
    def read(self):return self.value

class OaiTests(unittest.TestCase):
    def test_parse_source_submission_date_not_update_datestamp(self):
        rows,token=O.parse_oai(xml([paper("2611.00001")],"nextopaque"))
        self.assertEqual(token,"nextopaque")
        self.assertEqual(rows[0]["published"],"2026-11-04T00:00:00Z")
        self.assertEqual(rows[0]["oai_datestamp"],"2026-11-05")
        self.assertEqual(rows[0]["authors"],["Shubhayan Sarkar"])
        self.assertEqual(rows[0]["categories"],["quant-ph","hep-th"])
    def test_follows_all_resumption_tokens_and_deduplicates(self):
        requests=[]
        def opener(request,timeout):
            args=urllib.parse.parse_qs(urllib.parse.urlsplit(request.full_url).query)
            requests.append(args)
            if len(requests)==1:return Context(xml([paper("2611.00001")],"opaque token/2"))
            return Context(xml([paper("2611.00002"),paper("2611.00001")]))
        records,pages=O.fetch_window(dt.date(2026,11,3),dt.date(2026,11,5),
            opener=opener,sleep=lambda *_:None)
        self.assertEqual(len(records),2)
        self.assertEqual(pages,2)
        self.assertEqual(requests[0]["metadataPrefix"],["arXiv"])
        self.assertEqual(requests[0]["from"],["2026-11-03"])
        self.assertEqual(requests[1]["resumptionToken"],["opaque token/2"])
        self.assertNotIn("metadataPrefix",requests[1])
    def test_protocol_error_is_not_silently_accepted(self):
        with self.assertRaises(RuntimeError):
            O.parse_oai(b'<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"><error code="badArgument">Invalid request</error></OAI-PMH>')
    def test_partial_provenance_never_marks_date_complete(self):
        with tempfile.TemporaryDirectory() as directory:
            folder=Path(directory)
            with patch.object(O,"TARGET",folder),patch.object(O,"MANIFEST",folder/"manifest.json"):
                def stub(_first,_last):return O.parse_oai(xml([paper("2611.00001")]))[0],1
                result=O.harvest(today=dt.date(2026,11,5),fetcher=stub)
                self.assertFalse(result["complete_submission_dates"])
                self.assertEqual(result["days"]["2026-11-04"]["count"],1)
                self.assertFalse(result["days"]["2026-11-04"]["complete"])
                import json
                shard=json.loads((folder/"2026-11-04.json").read_text())
                self.assertEqual(shard["paper_count"],1)
                self.assertFalse(shard["complete"])

if __name__=="__main__": unittest.main()
