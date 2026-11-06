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
     page=(ROOT/"arxiv.html").read_text(encoding="utf8")
     parser=AttrParser();parser.feed(page)
     for ident in ("archive-search-form","archive-query","archive-results","archive-result-actions"):
         self.assertIn(ident,parser.ids)
     self.assertIn("arxiv-versions.js",page)
     self.assertIn("topic-explorer.css",page)

 def test_historical_search_not_limited_to_snapshot(self):
     archive=(ROOT/"archive-data.js").read_text(encoding="utf8")
     explorer=(ROOT/"topic-explorer.js").read_text(encoding="utf8")
     self.assertIn("https://api.datacite.org/dois",archive)
     self.assertIn("root.AxiovoArxiv.abs(id.requested)",archive)
     self.assertIn("data.live(source,c,signal,next)",explorer)
     self.assertIn("data.sourceLink(source,c)",explorer)

 def test_saved_revisions_are_distinct(self):
     js=(ROOT/"workspace.js").read_text(encoding="utf8")
     self.assertIn("parsed.requested",js)
     self.assertIn("parsed.explicit?indexedById.get(id):indexedByBase.get(parsed.base)",js)
     self.assertIn('list.set("arxiv:"+id',js)
     paper=(ROOT/"paper.js").read_text(encoding="utf8")
     self.assertIn("requested?.requested",paper)

 def test_recommendations_are_styled_and_live(self):
     js=(ROOT/"research-intelligence.js").read_text(encoding="utf8")
     page=(ROOT/"workspace.html").read_text(encoding="utf8")
     self.assertIn("recommendation-cards.css",page)
     self.assertIn("rl-paper-actions",js)
     self.assertIn("Save to Library",js)
     self.assertIn("loadLiveArxiv()",js)
     self.assertIn("locations.source.id:S4306400194",js)

 def test_broader_field_search_arxiv_only(self):
  js=(ROOT/"scholar-search.js").read_text(encoding="utf8")
  self.assertNotIn('const filters=["locations.source.id:S4306400194"]',js)
  scholar=(ROOT/"scholarly.js").read_text(encoding="utf8")
  self.assertIn('Arxiv?.parse(q)',scholar)
  self.assertIn('arxivURL(w)',scholar)
  self.assertIn('directArxivPaper(q)',scholar)

if __name__=="__main__":unittest.main()
