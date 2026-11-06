#!/usr/bin/env python3
"""Mobile paper-card acceptance test, using clearly synthetic arXiv fixtures."""
import functools
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]/"docs"
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_):pass

def main():
    server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base="http://127.0.0.1:%s/"%server.server_address[1]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
            for width in (390,1024):
                context=browser.new_context(viewport={"width":width,"height":850},service_workers="block")
                context.add_init_script("""{
                  localStorage.setItem("axiovo-research-interest-settings-v1",
                    JSON.stringify({interests:["preparation contextuality"],authors:[]}));
                }""")
                page=context.new_page()
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                fixture={"papers":[{
                  "id":"2611.12345","title":"Preparation contextuality and quantum dimension witnesses",
                  "authors":["A. Researcher","B. Researcher"],
                  "abstract":"This is a synthetic test abstract about preparation contextuality and dimension witnesses.",
                  "published":"2026-11-05"
                }]}
                page.route("**/data/feed.json",lambda r:r.fulfill(status=200,content_type="application/json",body=json.dumps(fixture)))
                page.route("https://api.openalex.org/**",lambda r:r.fulfill(status=200,content_type="application/json",body='{"results":[]}'))
                page.goto(base+"workspace.html",wait_until="domcontentloaded")
                page.locator("#library-research-tools > summary").click()
                card=page.locator("#research-recommendations .axiovo-rec-card").first
                card.wait_for(timeout=15000)
                assert card.locator(".axiovo-rec-actions > a.axiovo-rec-read").count()==1
                assert card.locator(".axiovo-rec-actions > button.axiovo-rec-listen").count()==1
                assert card.locator(".axiovo-rec-actions > a.axiovo-rec-assistant").count()==1
                assert card.locator(".axiovo-rec-actions > button.paper-save-btn").count()==1
                assert card.locator(".axiovo-rec-reason").count()>=1
                assert card.locator(".axiovo-rec-abstract").count()==1
                assert card.locator(".axiovo-rec-actions").evaluate("e=>getComputedStyle(e).display")=="grid"
                save=card.locator(".paper-save-btn")
                save.click()
                assert save.get_attribute("aria-pressed")=="true"
                assert page.evaluate("JSON.parse(localStorage.getItem('axiovo-reading-list')).length")==1
                save.click()
                assert save.get_attribute("aria-pressed")=="false"
                assert page.evaluate("JSON.parse(localStorage.getItem('axiovo-reading-list')).length")==0
                card.locator(".axiovo-rec-abstract-full summary").click()
                assert card.locator(".axiovo-rec-abstract-full").get_attribute("open") is not None
                card.locator(".axiovo-rec-more summary").click()
                assert card.locator(".axiovo-rec-more").get_attribute("open") is not None
                listen=card.locator(".axiovo-rec-listen")
                assert listen.is_enabled()
                listen.click()
                assert not errors,errors
                if width==390:
                    overflow=page.evaluate("document.documentElement.scrollWidth-window.innerWidth")
                    assert overflow<=7,("Mobile page overflow",overflow)
                context.close()
            browser.close()
            print("PASS: responsive paper cards, author tools, abstract, audio action and persistent save toggle")
    finally:server.shutdown()
if __name__=="__main__":main()
