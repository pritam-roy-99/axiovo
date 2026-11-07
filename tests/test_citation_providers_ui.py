"""Citation sources load only on demand and preserve source identity."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
class CitationIntegrity(unittest.TestCase):
 def test_every_discover_and_collection_includes_citation_module(self):
  for name in ("arxiv","biorxiv","chemrxiv","crypto","desk","feed","workspace","paper"):
   text=(ROOT/"docs"/(name+".html")).read_text("utf8")
   self.assertRegex(text,r'src="\\./citation-evidence\\.js\\?v=20261107[^"]*"')
   self.assertRegex(text,r'href="\\./citation-evidence\\.css\\?v=20261107[^"]*"')
 def test_no_nonconsensual_bulk_citation_requests(self):
  text=(ROOT/"docs/citation-evidence.js").read_text("utf8")
  self.assertIn('button.addEventListener("click"',text)
  self.assertIn("Promise.allSettled",text)
  self.assertIn('if(id.doi)',text)
  self.assertIn('if(id.arxiv)',text)
  self.assertNotIn("localStorage",text)
  self.assertNotIn("setInterval",text)
 def test_each_paper_surface_has_citation_control(self):
  for name in ("topic-explorer.js","crypto.js","research-desk.js","feed.js","workspace.js","paper.js"):
   self.assertIn("AxiovoCitationEvidence?.add",(ROOT/"docs"/name).read_text("utf8"),name)
 def test_no_fabricated_universal_count(self):
  text=(ROOT/"docs/citation-evidence.js").read_text("utf8")
  self.assertIn("provider-specific",text)
  self.assertIn("unknown",text)
  self.assertIn("citationCount",text)
  self.assertIn("citation_count",text)
  self.assertIn("is-referenced-by-count",text)
  self.assertIn("identifier-verified",text)

if __name__=="__main__":unittest.main()
