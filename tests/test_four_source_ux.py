"""Keep four-archive UI honest, fast to paint and browser data unchanged."""
import json
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
class FourArchiveUX(unittest.TestCase):
 def test_poster_never_advertises_three_archives_or_wrong_duration(self):
  svg=(ROOT/"docs/assets/axiovo-tour-poster.svg").read_text("utf8")
  self.assertIn("four archives",svg)
  for name in ("arXiv","bioRxiv","ChemRxiv","Cryptology"):
   self.assertIn(name,svg)
  self.assertNotIn("three archives",svg)
  self.assertNotIn("54-second",svg)
 def test_visible_homepage_buttons_have_explicit_icons_and_labels(self):
  html=(ROOT/"docs/index.html").read_text("utf8")
  self.assertEqual(html.count('class="axiovo-cta-icon"'),2)
  self.assertIn("<strong>Search papers</strong>",html)
  self.assertIn("<strong>Explore archives</strong>",html)
  self.assertIn('id="axiovo-source-pulse"',html)
  self.assertIn('src="./source-pulse.js"',html)
  css=(ROOT/"docs/home-landing.css").read_text("utf8")
  self.assertIn('background:#83e6df!important',css)
  self.assertIn('color:#082b42!important',css)
 def test_library_and_following_contain_fourth_archive(self):
  html=(ROOT/"docs/workspace.html").read_text("utf8")
  self.assertIn('id="library-source"',html)
  self.assertIn('id="following-source"',html)
  self.assertEqual(html.count('<option value="eprint">Cryptology ePrint</option>'),2)
 def test_freshness_compact_and_source_truthful(self):
  from scripts.build_source_freshness import generate
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp)
   (root/"announcements.json").write_text(json.dumps({"papers":[{"id":"2601.0001"}],
       "generated_at":"2026-11-07T12:00:00Z","complete":False}))
   (root/"eprint.json").write_text(json.dumps({"papers":[{"id":"2026/1234"}],
       "generated_at":"2026-11-07T11:00:00Z",
       "historical_oai_traversal_complete":False}))
   result=generate(root)
   self.assertEqual(set(result["sources"]),{"arxiv","biorxiv","chemrxiv","eprint"})
   self.assertEqual(result["sources"]["arxiv"]["coverage"],"partial-or-unverified-announcements")
   self.assertEqual(result["sources"]["eprint"]["coverage"],"partial-OAI-history")
   self.assertFalse(result["sources"]["chemrxiv"]["available"])
   self.assertLess((root/"source-freshness.json").stat().st_size,8000)
 def test_source_status_ui_does_not_download_full_archive(self):
  s=(ROOT/"docs/source-pulse.js").read_text("utf8")
  self.assertIn('source-freshness.json',s)
  for archive in ("feed.json","eprint.json","biorxiv.json","chemrxiv.json"):
   self.assertNotIn('fetch("./data/'+archive,s)
 def test_fourth_source_routes_use_real_crypto_page(self):
  desk=(ROOT/"docs/research-desk.js").read_text("utf8")
  feed=(ROOT/"docs/feed.js").read_text("utf8")
  crypto=(ROOT/"docs/crypto.js").read_text("utf8")
  self.assertIn('source==="eprint"?"./crypto.html"',desk)
  self.assertIn('path.source==="eprint"?"crypto"',feed)
  self.assertNotIn('eprint.html',desk+feed)
  self.assertIn('feed-preview.json',crypto)
  self.assertIn('Results are provisional',crypto)
  self.assertIn('data.snapshot("eprint")',crypto)
  self.assertIn('preview=false;',crypto)
  self.assertTrue((ROOT/"docs/crypto.html").is_file())

 def test_saved_local_storage_api_is_untouched(self):
  html=(ROOT/"docs/workspace.html").read_text("utf8")
  self.assertIn('id="library-list"',html)
  self.assertIn('id="export-library"',html)

if __name__=="__main__":unittest.main()
