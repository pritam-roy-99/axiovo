"""High-energy research field and local advanced-AI integration checks."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]/"docs"
class HighEnergyAiTests(unittest.TestCase):
 def test_high_energy_field_in_all_discovery_layers(self):
     atlas=(ROOT/"archive-taxonomy.js").read_text()
     for category in ("hep-ex","hep-lat","hep-ph","hep-th"):
         self.assertIn(category,atlas)
         self.assertIn(category,(ROOT/"data/topics/arxiv.tsv").read_text())
     self.assertIn("Scattering amplitudes",atlas)
     self.assertIn('id="archive-field"',(ROOT/"arxiv.html").read_text())

 def test_advanced_ai_controls_have_handlers(self):
     html=(ROOT/"copilot.html").read_text()
     js=(ROOT/"copilot.js").read_text()
     for element in ("detect-models","detected-models","reasoning-depth","test-ollama","engine"):
         self.assertIn(f'id="{element}"',html)
     for expression in ('$("detect-models").onclick=detectOllamaModels',
                        '$("test-ollama").onclick=checkOllama','safeModelName','api/tags'):
         self.assertIn(expression,js)
     self.assertIn('<option value="deep">Detailed</option>',html)

 def test_sources_and_local_privacy_caveat(self):
  js=(ROOT/"copilot.js").read_text()
  self.assertIn('const safeOllama="http://127.0.0.1:11434"',js)
  self.assertIn('Do not fabricate arXiv IDs',js)
  self.assertIn('validateCitations(answer)',js)
  html=(ROOT/"copilot.html").read_text()
  self.assertIn("Run Ollama locally",html)
if __name__=="__main__":
 unittest.main()
