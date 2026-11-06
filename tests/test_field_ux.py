"""Regress field-specific discovery, saved-paper control and unified AI action."""
import unittest
from pathlib import Path
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[1]/"docs"

class Elements(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids={}
    def handle_starttag(self,tag,attrs):
        values=dict(attrs)
        if values.get("id"):
            self.ids.setdefault(values["id"],[]).append((tag,values))

class DiscoveryUXTests(unittest.TestCase):
    def test_search_before_library_in_navigation(self):
        nav=(ROOT/"navigation.js").read_text(encoding="utf8")
        self.assertLess(nav.index('"Explore"'),nav.index('"Library"'))
        self.assertLess(nav.index('"Research Desk"'),nav.index('"Library"'))

    def test_one_assistant_entry_on_paper_cards(self):
        workspace=(ROOT/"workspace.js").read_text(encoding="utf8")
        self.assertIn('cop.href="./copilot.html?id="+encodeURIComponent(p.arxiv_id)',workspace)
        self.assertNotIn('ai.html?id=',workspace)
        self.assertIn('Remove from Library',workspace)

    def test_field_controls_and_subtopic_accessibility(self):
        for source in ("arxiv","biorxiv","chemrxiv"):
            doc=Elements()
            doc.feed((ROOT/(source+".html")).read_text(encoding="utf8"))
            for item in ("archive-field","archive-topic","archive-subfield","archive-show-results",
                         "archive-topic-finder","archive-custom-form","archive-save-path"):
                self.assertEqual(len(doc.ids.get(item,[])),1,item)

    def test_subtopics_relevant_and_initialization(self):
        js=(ROOT/"topic-explorer.js").read_text(encoding="utf8")
        self.assertIn("topicTerms:atlas.terms(topic,leaf)",js)
        self.assertIn("loadLive(state)",js)
        self.assertIn('"./data/topics/"+source+".tsv"',js)
        self.assertIn("aria-pressed",js)

if __name__=="__main__":
    unittest.main()
