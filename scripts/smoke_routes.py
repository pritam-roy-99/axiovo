#!/usr/bin/env python3
"""Regression tests for the intended Axiovo research journey.

Home (equal archive choices) -> selected server -> topic/field/subfield ->
original-source papers -> Library. The retired combined Discover exists only
behind ?legacy=1 and must never be the default route.
"""
from __future__ import annotations
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]/"docs"
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def main():
    server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    origin="http://127.0.0.1:"+str(server.server_address[1])+"/"
    checked=[]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
            page=browser.new_page(viewport={"width":1240,"height":880},service_workers="block")
            page.set_default_timeout(14000)
            errors=[]
            page.on("pageerror",lambda err: errors.append(f"{page.url}: {err}"))
            page.route("https://api.openalex.org/**",lambda route:route.fulfill(status=200,content_type="application/json",body='{"results":[]}'))
            page.route("https://api.crossref.org/**",lambda route:route.fulfill(status=200,content_type="application/json",body='{"message":{"items":[]}}'))
            page.route("https://www.ebi.ac.uk/europepmc/**",lambda route:route.fulfill(status=200,content_type="application/json",body='{"resultList":{"result":[]}}'))
            page.route("https://export.arxiv.org/api/**",lambda route:route.fulfill(status=200,content_type="text/xml",body='<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>'))
            page.goto(origin,wait_until="domcontentloaded")
            cards=page.locator(".axiovo-archive-card")
            cards.first.wait_for()
            assert cards.count()==3
            assert set(cards.evaluate_all("(els)=>els.map(e=>e.dataset.archive)"))=={"arxiv","biorxiv","chemrxiv"}
            assert page.locator("#axiovo-video-top").count()==0 or page.locator(".axiovo-video-top").count()==1
            assert page.locator(".rl-nav a").first.get_attribute("href")=="./"
            checked.append("homepage: three equal archive cards; Discover navigation stays source-neutral")
            for source,expected in (("arxiv",8),("biorxiv",1),("chemrxiv",1)):
                page.goto(origin,wait_until="domcontentloaded")
                page.locator('[data-archive="'+source+'"]').click()
                page.wait_for_url(lambda u:urlsplit(u).path.endswith("/"+source+".html"))
                assert page.locator("body").get_attribute("data-archive")==source
                assert page.locator("#archive-topic").is_visible()
                assert page.locator("#archive-field").is_visible()
                assert page.locator("#archive-subfield").is_visible()
                assert page.locator("#archive-search-form").is_visible()
                assert page.locator("#archive-topic option").count()==expected
                assert page.locator("#archive-results").count()==1
                assert page.locator("#rl-source-arxiv").count()==0
                assert page.locator("#rl-source-biorxiv").count()==0
                assert page.locator("#rl-source-chemrxiv").count()==0
                checked.append(source+": dedicated, isolated research hierarchy")
            page.goto(origin+"arxiv.html",wait_until="domcontentloaded")
            page.locator("#archive-field").select_option("12")
            assert page.locator("#archive-field").input_value()=="12"
            page.locator("#archive-custom").fill("User-defined entanglement tests")
            page.locator("#archive-custom-form button[type=submit]").click()
            assert page.locator("#archive-subfield").input_value()=="User-defined entanglement tests"
            page.reload(wait_until="domcontentloaded")
            page.locator("#archive-subfield").wait_for(state="visible")
            assert page.locator("#archive-subfield").input_value()=="User-defined entanglement tests"
            page.locator("#archive-reset").click()
            assert page.locator("#archive-subfield").input_value()==""
            checked.append("archive-specific editable subfield survives reload and reset")
            page.goto(origin+"discover.html#discover",wait_until="domcontentloaded")
            page.wait_for_url(lambda u:urlsplit(u).path=="/")
            assert page.locator(".axiovo-archive-card").count()==3
            checked.append("retired Discover redirects to archive chooser")
            page.goto(origin+"discover.html?archive=chemrxiv#discover",wait_until="domcontentloaded")
            page.wait_for_url(lambda u:urlsplit(u).path.endswith("/chemrxiv.html"))
            checked.append("old archive links preserve archive identity")
            page.goto(origin+"search.html?q=quantum%20steering",wait_until="domcontentloaded")
            page.wait_for_url(lambda u:urlsplit(u).path=="/" and "q=quantum" in urlsplit(u).query)
            page.locator('[data-archive="arxiv"]').click()
            page.wait_for_url(lambda u:urlsplit(u).path.endswith("/arxiv.html") and "q=" in urlsplit(u).query)
            assert page.locator("#archive-query").input_value()=="quantum steering"
            checked.append("search deep link preserves query through explicit archive selection")
            page.goto(origin+"discover.html#workspace",wait_until="domcontentloaded")
            page.locator("#workspace-panel #library-list").wait_for(state="attached",timeout=14000)
            assert page.locator("#workspace-panel").is_visible()
            assert page.locator(".rl-nav a").first.get_attribute("href")=="./"
            page.locator(".rl-nav a").first.click()
            page.wait_for_url(lambda u:urlsplit(u).path=="/")
            assert page.locator(".axiovo-archive-card").count()==3
            checked.append("Library is retained; its Discover navigation returns to chooser")
            mobile=browser.new_page(viewport={"width":390,"height":800},is_mobile=True,has_touch=True,service_workers="block")
            mobile.goto(origin,wait_until="domcontentloaded")
            mobile.locator(".axiovo-archive-card").first.wait_for()
            assert mobile.locator(".axiovo-archive-card").count()==3
            assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 6")
            mobile.close()
            assert not errors, "JavaScript runtime exceptions: "+str(errors[:5])
            browser.close()
    finally:
        server.shutdown()
    print("Axiovo archive-first flow verified: "+"; ".join(checked),flush=True)

if __name__=="__main__":
    main()
