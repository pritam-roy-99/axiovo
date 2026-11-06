"""One shared subject, topic and subtopic hierarchy on the native archive pages."""
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
 def test_one_visible_research_hierarchy_per_archive(self):
     for source in ("arxiv","biorxiv","chemrxiv"):
         html=(ROOT/(source+".html")).read_text(encoding="utf8")
         page=IndexIds();page.feed(html)
         for ident in ("archive-field","archive-topic","archive-subfield","archive-custom","archive-save-path"):
             self.assertEqual(len(page.ids.get(ident,[])),1,ident)
         self.assertLess(html.index("./topic-atlas.js"),html.index("./topic-explorer.js"))

 def test_personal_topic_and_path_persistence(self):
     explorer=(ROOT/"topic-explorer.js").read_text(encoding="utf8")
     self.assertIn('const key="axiovo-topic-explorer-"+source+"-v1"',explorer)
     self.assertIn("syncURL(criteriaFromForm())",explorer)
     self.assertIn('followed:next,last:selected',explorer)
     self.assertIn('$("reset-custom").onclick',explorer)

 def test_homepage_keeps_fine_grained_controls_in_discover(self):
     home=(ROOT/"index.html").read_text(encoding="utf8")
     self.assertIn('id="axiovo-archive-title"',home)
     self.assertNotIn('id="archive-topic"',home)
     self.assertNotIn('id="archive-subfield"',home)

if __name__=="__main__":unittest.main()
