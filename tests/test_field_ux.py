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
    def test_workspace_before_discover(self):
        nav=(ROOT/"navigation.js").read_text(encoding="utf8")
        self.assertLess(nav.index('["./#discover","Discover"]'),nav.index('["./#workspace","Library"]'))

    def test_one_ai_entry_on_paper_cards(self):
        html=(ROOT/"index.html").read_text(encoding="utf8")
        self.assertIn('ai.textContent="✦ Research Assistant"',html)
        self.assertNotIn('ai.href="./ai.html?id="',html)
        self.assertNotIn('cop.textContent="✦ Ask Copilot"',html)
        self.assertIn("rl-save-button",html)
        self.assertIn('saveButton.setAttribute("aria-pressed"',html)

    def test_field_controls_and_subtopic_accessibility(self):
        html=(ROOT/"index.html").read_text(encoding="utf8")
        doc=Elements();doc.feed(html)
        for item in ("arxiv-main-field","scholar-field","scholar-topic-list",
                     "scholar-subtopic-list","scholar-custom-subtopic","scholar-use-subtopic",
                     "scholar-field-heading"):
            self.assertEqual(len(doc.ids.get(item,[])),1,item)
        self.assertEqual(doc.ids["scholar-field"][0][0],"input")
        self.assertEqual(doc.ids["scholar-field"][0][1].get("type"),"hidden")
        self.assertEqual(doc.ids["arxiv-main-field"][0][0],"input")
        self.assertEqual(doc.ids["arxiv-main-field"][0][1].get("type"),"hidden")
        self.assertIn("arxiv-field-choices",doc.ids)
        self.assertIn("scholar-field-choices",doc.ids)
        self.assertIn("research-fields.js",html)
        self.assertIn("researchlens:choose-field",html)
        self.assertIn("researchlens:field-changed",html)

    def test_subtopics_relevant_and_initialization(self):
        js=(ROOT/"scholarly.js").read_text(encoding="utf8")
        self.assertIn("fieldTopics(state.field,state.topic)",js)
        self.assertIn("function subtopicSelect(t)",js)
        self.assertIn('state.subtopic=""',js)
        self.assertIn('window.addEventListener("researchlens:scholarly-open",init,{once:true})',js)
        switch=(ROOT/"discover.js").read_text(encoding="utf8")
        self.assertIn('primary!=="quantum"',switch)

if __name__=="__main__":
    unittest.main()
