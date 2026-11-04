"""High-energy research field and local advanced-AI integration checks."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]/"docs"
class HighEnergyAiTests(unittest.TestCase):
 def test_high_energy_field_in_all_discovery_layers(self):
  fields=(ROOT/"research-fields.js").read_text()
  self.assertIn('highenergy:',fields)
  for label in ("Quantum field theory","Lattice gauge theory and QCD",
                "Scattering amplitudes","Higgs and electroweak physics",
                "Early-universe particle cosmology"):
   self.assertIn(label,fields)
  explorer=(ROOT/"scholar-search.js").read_text()
  self.assertIn('highenergy:["31"]',explorer)
  fallback=(ROOT/"cached-arxiv-search.js").read_text()
  self.assertIn('field==="highenergy"',fallback)
  self.assertIn("hep-ph",fallback)
  workspace=(ROOT/"workspace.js").read_text()
  self.assertIn("High-energy physics & particle physics",workspace)
 def test_advanced_ai_controls_have_handlers(self):
  html=(ROOT/"copilot.html").read_text()
  js=(ROOT/"copilot.js").read_text()
  for mode in ("deepreview","derivations"):
   self.assertIn(f'data-mode="{mode}"',html)
   self.assertIn(mode+":",js)
  for element in ("detect-models","detected-models","reasoning-depth"):
   self.assertIn(f'id="{element}"',html)
  for expression in ('$("detect-models").onclick=detectOllamaModels',
                     'deep?16384:8192','deep?1800:900',
                     'safeModelName','api/tags'):
   self.assertIn(expression,js)
 def test_sources_and_local_privacy_caveat(self):
  js=(ROOT/"copilot.js").read_text()
  self.assertIn('const safeOllama="http://127.0.0.1:11434"',js)
  self.assertIn('Do not fabricate arXiv IDs',js)
  self.assertIn('validateCitations(answer)',js)
  html=(ROOT/"copilot.html").read_text()
  self.assertIn("The model runs on your computer",html)
if __name__=="__main__":
 unittest.main()
