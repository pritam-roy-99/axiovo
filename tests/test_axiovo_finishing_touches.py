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
  self.assertIn('const PROJECT_KEY="researchlens-research-projects-v1"',code)
  self.assertIn('found.paper_ids=[...new Set([...ids,base])]',code)
  self.assertIn('new Event("axiovo:projects-updated")',code)
  self.assertIn('window.addEventListener("axiovo:projects-updated"',code)
  recs=(ROOT/"research-intelligence.js").read_text()
  self.assertIn('window.addEventListener("axiovo:projects-updated"',recs)
  self.assertIn("researchlens-reading-list",code)
 def test_video_remains_optional_on_mobile(self):
  html=(ROOT/"index.html").read_text()
  self.assertIn('id="axiovo-video-details"',html)
  self.assertIn("Read video transcript",html)
  self.assertIn('kind="captions"',html)
  onboard=(ROOT/"onboarding.js").read_text()
  self.assertIn('tour.open=false',onboard)
 def test_offline_app_caches_community(self):
  worker=(ROOT/"sw.js").read_text()
  self.assertIn("axiovo-shell-v13",worker)
  self.assertIn("community.html",worker)
if __name__=="__main__":
 unittest.main()
