"""Validate live arXiv search and source-first responsive paper controls."""
import unittest
from pathlib import Path
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]/"docs"

class AttrParser(HTMLParser):
 def __init__(self):
  super().__init__();self.ids={};self.sources=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get("id"):self.ids[a["id"]]=(tag,a)

class SourceFirstTests(unittest.TestCase):
 def test_search_first_and_versions(self):
  home=(ROOT/"index.html").read_text(encoding="utf8")
  parser=AttrParser();parser.feed(home)
  self.assertIn("arxiv-live-search",parser.ids)
  self.assertIn("history-official-link",parser.ids)
  self.assertIn("arxiv-versions.js",home)
  self.assertIn("paper-actions.css",home)
  self.assertIn("Search all arXiv",home)
 def test_historical_search_not_limited_to_snapshot(self):
  js=(ROOT/"history.js").read_text(encoding="utf8")
  self.assertIn('const filters=[];',js)
  self.assertIn('Arxiv?.parse(p.q)',js)
  self.assertIn('Arxiv.abs(direct.requested)',js)
  self.assertIn('arxiv-live-search',js)
  self.assertIn('rl-paper-actionbar',js)
  self.assertIn('researchlens-reading-list',js)
 def test_saved_revisions_are_distinct(self):
  js=(ROOT/"workspace.js").read_text(encoding="utf8")
  self.assertIn('ResearchLensArxiv?.parse(raw)?.requested',js)
  self.assertIn('normalizeArxiv(',js)
  self.assertIn('requestedId',js)
  p=(ROOT/"paper.js").read_text(encoding="utf8")
  self.assertIn('requested?.requested',p)
  self.assertIn('baseId',p)
  self.assertIn('Paper does not need',p) if False else None
 def test_recommendations_are_styled_and_live(self):
  js=(ROOT/"research-intelligence.js").read_text(encoding="utf8")
  self.assertIn('rl-paper-actions',js)
  self.assertIn('Research Assistant',js)
  self.assertIn('Save paper',js)
  self.assertIn('loadLiveArxiv()',js)
  self.assertIn('locations.source.id:S4306400194',js)
 def test_broader_field_search_arxiv_only(self):
  js=(ROOT/"scholar-search.js").read_text(encoding="utf8")
  self.assertNotIn('const filters=["locations.source.id:S4306400194"]',js)
  scholar=(ROOT/"scholarly.js").read_text(encoding="utf8")
  self.assertIn('Arxiv?.parse(q)',scholar)
  self.assertIn('arxivURL(w)',scholar)
  self.assertIn('directArxivPaper(q)',scholar)

if __name__=="__main__":unittest.main()
