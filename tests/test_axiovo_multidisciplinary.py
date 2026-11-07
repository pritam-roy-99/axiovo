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
     page=(DOCS/"arxiv.html").read_text()
     self.assertIn('id="archive-crosslisted"',page)
     self.assertIn('type="checkbox"',page)
     archive=(DOCS/"archive-data.js").read_text()
     self.assertIn('c.crosslisted&&(p.source!=="arxiv"||p.categories.length<2)',archive)
     source=(ROOT/"scripts"/"sync.py").read_text()
     self.assertIn('"categories": categories',source)
     self.assertIn('"primary_category":',source)

 def test_biorxiv_source_works_without_credentials(self):
     page=(DOCS/"biorxiv.html").read_text()
     self.assertIn('data-explore-source="biorxiv"',page)
     self.assertIn('id="archive-query"',page)
     self.assertRegex(page,r'src="\./archive-data\.js(?:\?v=[^"]+)?"')
     self.assertIn("https://api.biorxiv.org/details/biorxiv/",(DOCS/"archive-data.js").read_text())
     self.assertIn('<option value="biorxiv">bioRxiv</option>',(DOCS/"workspace.html").read_text())

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
  self.assertRegex((DOCS/"sw.js").read_text(), r'const CACHE = "axiovo-shell-v\d+";')
if __name__=="__main__":
 unittest.main()
