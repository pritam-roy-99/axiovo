#!/usr/bin/env python3
"""Mobile browser acceptance checks for My Feed, with synthetic source fixtures."""
from __future__ import annotations
import functools
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]/"docs"
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass

def main():
    server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f"http://127.0.0.1:{server.server_address[1]}/"
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
            ctx=browser.new_context(viewport={"width":390,"height":844},service_workers="block")
            page=ctx.new_page()
            page.set_default_timeout(12000)
            errors=[]
            page.on("pageerror",lambda e:errors.append(str(e)))
            fixture={"papers":[
             {"id":"2611.00011","title":"Preparation contextuality and quantum dimension witnessing",
              "abstract":"Quantum preparation contextuality is an operational signature of nonclassicality.",
              "authors":["Archan S Majumdar"],"published":"2026-11-04"},
             {"id":"2611.00012","title":"Experimental preparation contextuality under operational equivalences",
              "abstract":"We demonstrate quantum contextuality under experimental operational constraints.",
              "authors":["Another Researcher"],"published":"2026-11-05"},
             {"id":"2611.00013","title":"Educational robotics beyond ROS",
              "abstract":"An unrelated educational robotics study.", "authors":["Robotics Person"],
              "published":"2026-11-05"}]}
            # The published fast preview must not contaminate synthetic source fixtures.
            page.route("**/data/feed-preview.json",lambda r:r.fulfill(status=404,body=""))
            page.route("**/data/feed.json",lambda r:r.fulfill(status=200,content_type="application/json",body=json.dumps(fixture)))
            for path in ("oai-recent.json","announcements.json","biorxiv.json","chemrxiv.json"):
                page.route("**/data/"+path,lambda r:r.fulfill(status=200,content_type="application/json",body='{"papers":[]}'))
            # Browsing a topic does not subscribe the device to that topic.
            page.add_init_script("""() => {
              localStorage.setItem("axiovo-field-explorer-v1", JSON.stringify({topic:"Numerical relativity"}));
            }""")
            page.goto(base+"feed.html",wait_until="domcontentloaded")
            assert page.locator("#feed-results").get_by_text("Build your research feed").is_visible()
            assert "No authors followed yet" in page.locator("#feed-followed-authors").inner_text()
            assert "No topics followed yet" in page.locator("#feed-followed-topics").inner_text()
            page.evaluate("""() => {
               localStorage.setItem("axiovo-author-follows",JSON.stringify(["A.S. Majumdar"]));
               localStorage.setItem("axiovo-topic-explorer-arxiv-v1",
                 JSON.stringify({followed:[{category:"quant-ph",topic:"preparation contextuality",
                    label:"Preparation contextuality"}]}));
            }""")
            page.reload(wait_until="domcontentloaded")
            page.locator(".feed-card").first.wait_for()
            titles=page.locator(".feed-card h3").all_inner_texts()
            assert len(titles)==2,(titles,"source-only topic and author matching")
            assert all("robotics" not in title.lower() for title in titles)
            assert "preparation contextuality" in page.locator("#feed-followed-paths").inner_text().lower()
            assert page.locator("#feed-followed-authors").inner_text().find("Majumdar")>=0
            first=page.locator(".feed-card").first
            button=first.locator(".feed-save")
            button.click()
            assert button.get_attribute("aria-pressed")=="true"
            assert page.evaluate("JSON.parse(localStorage.getItem('axiovo-reading-list')).length")>=1
            button.click()
            assert button.get_attribute("aria-pressed")=="false"
            first.locator(".feed-summary summary").click()
            assert first.locator(".feed-summary").get_attribute("open") is not None
            page.locator("#feed-topic-input").fill("quantum contextuality")
            page.locator("#feed-topic-form button").click()
            assert "quantum contextuality" in page.locator("#feed-followed-topics").inner_text()
            page.locator("#feed-source").select_option("biorxiv")
            assert page.locator(".feed-card").count()==0
            page.locator("#feed-source").select_option("all")
            page.locator("[data-view='following']").click()
            assert page.locator(".feed-card").count()==2
            page.locator(".feed-card").first.locator(".feed-dismiss").click()
            assert page.locator(".feed-card").count()==1
            page.locator("#feed-undo-button").click()
            assert page.locator(".feed-card").count()==2
            card=page.locator(".feed-card").first
            title=card.locator("h3").inner_text()
            card.get_by_role("button",name="Add to comparison").click()
            card.get_by_role("link",name="In comparison").click()
            page.wait_for_url("**/desk.html#rd-queue-heading")
            assert title in page.locator("#rd-queue").inner_text()
            page.go_back(wait_until="domcontentloaded")
            page.locator(".feed-card").first.wait_for()
            assert not errors,errors
            overflow=page.evaluate("document.documentElement.scrollWidth-window.innerWidth")
            assert overflow<=7,("Mobile horizontal overflow",overflow)
            browser.close()
            print("PASS: mobile feed personalization, cards, sorting, follow topic, save/unsave, hide/undo, and source filtering")
    finally:
        server.shutdown()

if __name__=="__main__":
    main()
