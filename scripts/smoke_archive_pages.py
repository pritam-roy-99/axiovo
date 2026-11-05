#!/usr/bin/env python3
"""Exercise the topic explorer, saved paths and following with repeatable provider responses."""
from __future__ import annotations

import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import sync_playwright

DOCS = Path(__file__).resolve().parents[1] / "docs"


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def metadata(route):
    url = urlsplit(route.request.url)
    terms = parse_qs(url.query)
    if url.hostname == "api.datacite.org":
        arxiv = {
            "doi": "10.48550/arxiv.2207.00001",
            "url": "https://arxiv.org/abs/2207.00001",
            "titles": [{"title": "Test metadata: Lieb-Robinson bounds"}],
            "creators": [{"name": "Ada Researcher"}],
            "subjects": [{"subject": "Mathematical Physics (math-ph)", "subjectScheme": "arXiv"}],
            "dates": [{"date": "2022-06-17", "dateType": "Submitted", "dateInformation": "v1"}],
            "descriptions": [{"description": "We prove Lieb-Robinson bounds for a spin system.", "descriptionType": "Abstract"}],
        }
        row = {"attributes": arxiv}
        payload = {"data": row} if "/10.48550/" in url.path else {"meta": {"total": 1}, "data": [row]}
    elif url.hostname == "www.ebi.ac.uk":
        query = terms.get("query", [""])[0]
        rows = [{
            "doi": "10.1101/123456", "title": "Test metadata: spatial transcriptomics",
            "bookOrReportDetails": {"publisher": "bioRxiv"},
            "firstPublicationDate": "2025-01-02", "authorString": "Ada Researcher",
            "abstractText": "We use spatially resolved transcriptomics to profile the tissue.",
        }] if 'PUBLISHER:"bioRxiv"' in query else []
        payload = {"hitCount": len(rows), "resultList": {"result": rows}}
    elif url.hostname == "api.biorxiv.org":
        payload = {"messages": [{"status": "ok", "total": 0}], "collection": []}
    elif url.hostname == "api.crossref.org":
        row = {
            "DOI": "10.26434/chemrxiv-2025-fixture", "title": ["Test metadata: electrochemical reduction of CO2"],
            "posted": {"date-parts": [[2025, 1, 2]]}, "author": [{"given": "Ada", "family": "Researcher"}],
        }
        payload = {"message": {"total-results": 1, "items": [row]}}
    else:
        return route.abort()
    route.fulfill(json=payload, headers={"Access-Control-Allow-Origin": "*"})


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(DOCS)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_address[1]}/"
    paths = (
        ("arxiv.html?category=math-ph&topic=quantum-many-body-theory&subtopic=lieb-robinson-bounds", "lieb-robinson-bounds"),
        ("biorxiv.html?category=Genomics&topic=transcriptomics&subtopic=spatial-transcriptomics", "spatial-transcriptomics"),
        ("chemrxiv.html?category=Catalysis&topic=electrocatalysis&subtopic=electrochemical-co2-reduction", "electrochemical-co2-reduction"),
    )
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
            desktop = browser.new_page(viewport={"width": 1360, "height": 900}, service_workers="block")
            desktop.route("https://**", metadata)
            desktop.set_default_timeout(12000)
            errors = []
            desktop.on("pageerror", lambda error: errors.append(str(error)))
            desktop.goto(base, wait_until="domcontentloaded")
            assert desktop.locator(".axiovo-archive-card").count() == 3
            for path, selected in paths:
                desktop.goto(base + path, wait_until="domcontentloaded")
                desktop.get_by_text("Test metadata:", exact=False).first.wait_for()
                assert desktop.locator("#archive-subfield").input_value() == selected
                assert desktop.locator("#archive-topic-options button").count() > 0
                assert desktop.locator("#archive-subtopic-options button").count() > 0

            desktop.goto(base + paths[0][0], wait_until="domcontentloaded")
            desktop.get_by_text("Test metadata: Lieb-Robinson bounds", exact=True).wait_for()
            paper = desktop.locator(".ex-paper").filter(has_text="Test metadata: Lieb-Robinson bounds").first
            paper.get_by_role("button", name="Save to Library", exact=True).click()
            paper.locator(".axiovo-follow-details summary").click()
            paper.get_by_role("button", name="Follow Ada Researcher", exact=True).click()
            desktop.goto(base + "workspace.html#following", wait_until="domcontentloaded")
            desktop.get_by_text("Showing available records for Ada Researcher", exact=False).wait_for()
            assert desktop.locator("#following-author").input_value() == "Ada Researcher"
            assert desktop.locator("#following-results h4").count() > 0
            desktop.locator("#library-tab-saved").click()
            desktop.locator("#library-list").get_by_text("Test metadata: Lieb-Robinson bounds", exact=True).wait_for()

            desktop.goto(base + paths[0][0], wait_until="domcontentloaded")
            desktop.get_by_text("Test metadata: Lieb-Robinson bounds", exact=True).wait_for()
            desktop.locator(".ex-personal summary").click()
            desktop.locator("#archive-custom-kind").select_option("subtopic")
            desktop.locator("#archive-custom").fill("Nonlocal propagation")
            desktop.locator("#archive-custom-add").click()
            desktop.reload(wait_until="domcontentloaded")
            desktop.get_by_text("Scope: Mathematical Physics › Quantum many-body theory › Nonlocal propagation").wait_for()
            assert desktop.locator("#archive-subfield").input_value() == "nonlocal-propagation"

            desktop.goto(base + "arxiv.html?date=2026-11-04", wait_until="domcontentloaded")
            desktop.get_by_text("All requested UTC submission dates fully harvested.", exact=False).wait_for()
            assert desktop.locator("#archive-results h3").count() > 0

            desktop.goto(base + "copilot.html?id=2207.00001", wait_until="domcontentloaded")
            desktop.get_by_role("button", name="Inspect abstract", exact=True).click()
            desktop.locator("#conversation .assistant").get_by_text("Test metadata: Lieb-Robinson bounds", exact=False).wait_for()
            assert desktop.locator("#evidence-list a").first.get_attribute("href") == "https://arxiv.org/abs/2207.00001"

            for width in (360, 390, 768):
                mobile = browser.new_page(viewport={"width": width, "height": 800}, service_workers="block")
                mobile.route("https://**", metadata)
                for path in ("", *[pair[0] for pair in paths], "workspace.html", "workspace.html#following", "copilot.html", "desk.html"):
                    mobile.goto(base + path, wait_until="domcontentloaded")
                    assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), (width, path)
                mobile.close()
            assert not errors, errors
            browser.close()
    finally:
        server.shutdown()
    print("Passed topic navigation, source relevance, Library and following, exact dates, Assistant, and responsive checks.")


if __name__ == "__main__":
    main()
