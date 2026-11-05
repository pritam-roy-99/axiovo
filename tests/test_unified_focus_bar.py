"""One global field/topic/subtopic hierarchy, with legacy controls hidden but functional."""
from pathlib import Path
import unittest
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]/"docs"
class IndexIds(HTMLParser):
 def __init__(self): super().__init__();self.ids={}
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if d.get("id"): self.ids.setdefault(d["id"],[]).append((tag,d))
class UnifiedFocusTests(unittest.TestCase):
 def test_one_visible_research_hierarchy(self):
  html=(ROOT/"index.html").read_text(encoding="utf8")
  p=IndexIds();p.feed(html)
  for id in ("rl-focus-bar","rl-focus-field-details","rl-focus-field-title","rl-focus-fields",
             "rl-focus-areas","rl-focus-subtopics","rl-focus-custom","rl-focus-apply"):
   self.assertEqual(len(p.ids.get(id,[])),1,id)
  self.assertIn('id="arxiv-legacy-focus" hidden',html)
  self.assertIn('class="panel rl-scholar-legacy-focus" hidden',html)
  self.assertIn('src="./focus-bar.js"',html)
  self.assertLess(html.index('src="./custom-taxonomy.js"'),html.index('src="./focus-bar.js"'))
  self.assertLess(html.index('id="rl-focus-bar"'),html.index('id="arxiv-discovery"'))
 def test_source_navigation_and_synchronization(self):
  source=(ROOT/"focus-bar.js").read_text(encoding="utf8")
  self.assertIn("function chooseField",source)
  self.assertIn("function chooseTopic",source)
  self.assertIn("function chooseSubtopic",source)
  self.assertIn("ResearchLensInterests",source)
  self.assertIn("Custom.addArea",source)
  self.assertIn("Custom.removeArea",source)
  self.assertIn("Custom?.addInterest",source)
  self.assertIn("Custom.removeInterest",source)
  self.assertIn("researchlens:focus-change",source)
  explorer=(ROOT/"scholarly.js").read_text(encoding="utf8")
  self.assertIn('window.addEventListener("researchlens:focus-change"',explorer)
  self.assertIn('state.query=state.areaSelected?(newSubtopic||newTopic):"";',explorer)
  discover=(ROOT/"discover.js").read_text(encoding="utf8")
  self.assertIn('chemrxiv',discover)
 def test_legacy_sections_invisible(self):
  css=(ROOT/"discover.css").read_text(encoding="utf8")
  self.assertIn('#arxiv-legacy-focus,.rl-scholar-legacy-focus{display:none!important}',css)
  self.assertIn('.rl-focus-fields{display:grid;',css)
  self.assertIn('.rl-focus-subrow{display:grid;',css)

if __name__=="__main__":unittest.main()
