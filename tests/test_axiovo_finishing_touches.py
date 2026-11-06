"""Check finishing touches without requiring a hosted backend."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/"docs"
class FinishingTouchesTests(unittest.TestCase):
 def test_internal_community_and_truthful_status(self):
  nav=(ROOT/"navigation.js").read_text()
  self.assertNotIn('["./community.html","Community"]',nav)
  page=(ROOT/"community.html").read_text()
  self.assertIn("GitHub Issues",page)
  self.assertIn('href="./community.html"',(ROOT/"profiles.html").read_text())
  self.assertIn("Native cross-user commenting",page)
  self.assertIn("not automatically published",page)
 def test_saved_paper_attaches_to_research_question(self):
  code=(ROOT/"workspace.js").read_text()
  self.assertIn('const PROJECT_KEY="axiovo-research-projects-v1"',code)
  self.assertIn('found.paper_ids=[...new Set([...ids,base])]',code)
  self.assertIn('new Event("axiovo:projects-updated")',code)
  self.assertIn('window.addEventListener("axiovo:projects-updated"',code)
  recs=(ROOT/"research-intelligence.js").read_text()
  self.assertIn('window.addEventListener("axiovo:projects-updated"',recs)
  self.assertIn("axiovo-reading-list",code)
 def test_video_is_inside_unified_hero_and_optional_on_mobile(self):
     html=(ROOT/"index.html").read_text()
     self.assertLess(html.index('id="axiovo-home-video"'),html.index('id="axiovo-archive-title"'))
     self.assertIn('class="axiovo-welcome"',html)
     self.assertIn('id="axiovo-tour" hidden',html)
     self.assertIn('Full step-by-step guide',html)
     self.assertIn('kind="captions"',html)
     self.assertIn("playsinline",html)
     self.assertNotIn("autoplay",html)
     css=(ROOT/"home-landing.css").read_text()
     self.assertIn("@media(max-width:650px)",css)

 def test_offline_app_caches_library(self):
     worker=(ROOT/"sw.js").read_text()
     self.assertRegex(worker, r'const CACHE = "axiovo-shell-v\d+";')
     self.assertIn("./workspace.html",worker)
     self.assertIn("./workspace.js",worker)

if __name__=="__main__":
 unittest.main()
