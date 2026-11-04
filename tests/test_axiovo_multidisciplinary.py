"""Check discipline neutrality, real cross-list data and local-only provider boundaries."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/"docs"
class SourceAndPaletteTests(unittest.TestCase):
 def test_neutral_field_is_available_first(self):
  fields=(DOCS/"research-fields.js").read_text()
  self.assertIn('general:',fields)
  self.assertIn('return Object.prototype.hasOwnProperty.call(FIELDS,value)?value:"general"',fields)
  html=(DOCS/"index.html").read_text()
  self.assertNotIn('Select a quantum topic to focus your feed',html)
  self.assertNotIn('Choose a quantum topic to personalize your feed',html)
  self.assertNotIn('((p.categories||[]).includes("quant-ph")?1:0)',html)
 def test_crosslisting_is_from_real_secondary_arxiv_metadata(self):
  page=(DOCS/"index.html").read_text()
  self.assertIn('id="crosslist-only"',page)
  self.assertIn('Cross-listed:',page)
  self.assertIn('(p.categories||[]).filter(c=>c!==p.primary_category)',page)
  self.assertIn('el("crosslist-only").checked',page)
  source=(ROOT/"scripts"/"sync.py").read_text()
  self.assertIn('"categories": categories',source)
  self.assertIn('"primary_category":',source)
 def test_biorxiv_source_works_without_credentials(self):
  page=(DOCS/"index.html").read_text()
  for value in ('id="biorxiv-discovery"','id="rl-source-biorxiv"','id="axiovo-biorxiv-query"'):
   self.assertIn(value,page)
  self.assertIn('const biology=',(DOCS/"discover.js").read_text())
  self.assertIn('fetch("./data/biorxiv.json"',(DOCS/"biorxiv.js").read_text())
  lib=(DOCS/"workspace.html").read_text()
  self.assertIn('id="axiovo-biorxiv-library"',lib)
 def test_palette_settings_and_small_nav(self):
  nav=(DOCS/"navigation.js").read_text()
  self.assertNotIn('["./community.html","Community"]',nav)
  self.assertIn('settings.href="./profiles.html"',nav)
  settings=(DOCS/"profiles.html").read_text()
  self.assertIn('id="axiovo-palette-options"',settings)
  self.assertIn('href="./community.html"',settings)
  theme=(DOCS/"theme.js").read_text()
  for name in ("ocean","forest","violet","rose","amber"):
   self.assertIn(name,theme)
  self.assertIn('grid-template-columns:repeat(3,minmax(0,1fr))',(DOCS/"theme.css").read_text())
 def test_consensus_key_never_enters_browser(self):
  app=(ROOT/"run.py").read_text()
  self.assertIn('os.environ.get("CONSENSUS_API_KEY"',app)
  self.assertIn('https://api.consensus.app/v1/search',app)
  client=(DOCS/"research-providers.js").read_text()
  self.assertIn('./api/consensus?query=',client)
  self.assertNotIn("x-api-key",client)
  self.assertIn("consensus.app/search/",client)
  self.assertIn("axiovo-shell-v8",(DOCS/"sw.js").read_text())
if __name__=="__main__":
 unittest.main()
