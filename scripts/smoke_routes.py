#!/usr/bin/env python3
"""Browser-level routing regression tests for the real Axiovo static website.

Uses a local HTTP server, no live source availability assertions.
Tests critical navigation paths, persisted field selection and legacy URLs.
"""
from __future__ import annotations
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from threading import Thread
from playwright.sync_api import sync_playwright

DOCS=Path(__file__).resolve().parents[1]/"docs"


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass


def main():
    server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(DOCS)))
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    base="http://127.0.0.1:"+str(server.server_address[1])+"/"
    checked=[]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
            page=browser.new_page(viewport={"width":1280,"height":900})
            page.set_default_timeout(14000)
            page_errors=[]
            failed_assets=[]
            page.on("pageerror",lambda error:page_errors.append(str(error)))
            def check_response(response):
                u=urlsplit(response.url)
                if u.hostname=="127.0.0.1" and response.status>=400 and u.path.endswith((".html",".js",".css",".webmanifest")):
                    failed_assets.append((response.status,u.path))
            page.on("response",check_response)
            def go(path):
                page.goto(base+path,wait_until="domcontentloaded",timeout=25000)
            def assert_path(path):
                assert page.url.startswith(base+path),("Unexpected URL",page.url,path)
            def target_is(selector,ends):
                item=page.locator(selector).first
                item.wait_for(state="attached")
                path=item.get_attribute("href") or ""
                assert path.startswith("./"+ends),("Bad link",selector,path)
                checked.append(selector)
            go("")
            page.locator("#axiovo-entry-field").wait_for()
            assert page.locator("body").get_attribute("class")=="axiovo-home"
            target_is(".rl-nav a:nth-child(1)","discover.html#discover")
            target_is(".rl-nav a:nth-child(2)","discover.html#workspace")
            assert page.locator("#axiovo-entry-topic").count()==0
            assert page.locator("#axiovo-entry-subtopic").count()==0
            assert page.locator("#axiovo-entry-field option").count()>=5
            page.select_option("#axiovo-entry-field","quantum")
            page.locator("#axiovo-entry-form button[type=submit]").click()
            page.wait_for_url(lambda u:urlsplit(u).path.endswith("/discover.html") and urlsplit(u).fragment=="discover")
            assert_path("discover.html")
            assert page.evaluate('JSON.parse(localStorage.getItem("researchlens-field-explorer-v1")).field')=="quantum"
            checked.append("homepage field > Discover")
            page.locator("#rl-source-arxiv").wait_for()
            assert page.locator(".axiovo-home-link").is_visible()
            assert page.locator(".axiovo-back-button").is_visible()
            assert page.locator(".axiovo-home-link").get_attribute("href")=="./"
            assert page.locator("#rl-focus-field-title").inner_text()!="Choose your field"
            page.locator(".axiovo-home-link").click()
            page.wait_for_url(lambda u:urlsplit(u).path.endswith("/"))
            assert page.locator("#axiovo-entry-field").is_visible()
            assert page.locator("#axiovo-entry-topic").count()==0
            page.locator(".rl-nav a[href*='#discover']").click()
            page.wait_for_url(lambda u:urlsplit(u).path.endswith("/discover.html"))
            assert page.locator(".axiovo-back-button").is_visible()
            page.locator(".axiovo-back-button").click()
            page.wait_for_url(lambda u:urlsplit(u).path.endswith("/"))
            page.locator(".rl-nav a[href*='#discover']").click()
            page.wait_for_url(lambda u:urlsplit(u).path.endswith("/discover.html"))
            assert page.locator(".axiovo-advanced-focus > summary").count()==1
            assert page.locator(".axiovo-feed-tools > summary").count()==1
            page.locator("#rl-source-scholarly").click()
            assert page.locator("#scholarly-discovery").is_visible()
            assert page.locator(".axiovo-scholar-tools > summary").count()==1
            checked.append("source tabs and advanced sections")
            page.locator("#rl-source-biorxiv").click()
            assert page.locator("#biorxiv-discovery").is_visible()
            page.locator("#rl-source-arxiv").click()
            assert page.locator("#arxiv-discovery").is_visible()
            page.locator("#papers .paper .rl-save-button").first.wait_for(timeout=16000)
            paper=page.locator("#papers .paper").first
            paper_id=paper.get_attribute("data-paper-id")
            assert paper_id,"Indexed paper card has no arXiv identifier"
            paper.locator(".rl-save-button").click()
            assert paper_id in page.evaluate('JSON.parse(localStorage.getItem("researchlens-reading-list")||"[]")')
            checked.append("arXiv browsing and saving to Library")
            target_is(".rl-nav a:nth-child(2)","discover.html#workspace")
            page.locator(".rl-nav a:nth-child(2)").click()
            page.wait_for_url(lambda u:urlsplit(u).path.endswith("/discover.html") and urlsplit(u).fragment=="workspace")
            page.locator("#workspace-panel #research-questions").wait_for(timeout=16000)
            assert page.locator("#workspace-panel #library-list").is_visible()
            assert paper_id in page.locator("#workspace-panel #library-list").inner_text(timeout=10000) or paper_id in page.locator("#workspace-panel").inner_text(),"Saved paper missing from Library after navigation"
            checked.append("Library SPA navigation and saved paper persistence")
            page.locator(".rl-nav a:nth-child(1)").click()
            page.wait_for_url(lambda u:urlsplit(u).path.endswith("/discover.html") and urlsplit(u).fragment=="discover")
            assert page.locator("#discover-shell").is_visible()
            checked.append("back to Discover")
            go("search.html?q=quantum")
            page.wait_for_url(lambda u: urlsplit(u).path.endswith("/discover.html") and urlsplit(u).query.find("view=scholarly")>=0 and urlsplit(u).fragment=="discover")
            checked.append("legacy search redirect")
            go("fields.html")
            page.wait_for_url("**/discover.html?view=scholarly#discover")
            checked.append("legacy field redirect")
            go("index.html#workspace")
            page.wait_for_url(lambda u:urlsplit(u).path.endswith("/discover.html") and urlsplit(u).fragment=="workspace")
            checked.append("legacy homepage hash")
            go("copilot.html")
            assert page.locator("main").count()==1
            target_is(".rl-nav a:nth-child(1)","discover.html#discover")
            checked.append("Research Assistant navigation")
            assert not failed_assets, "Broken local HTML/JS/CSS resources: "+repr(failed_assets)
            assert not page_errors, "Unhandled JavaScript errors: "+repr(page_errors)
            checked.append("No broken local assets or unhandled page errors")
            mobile=browser.new_page(viewport={"width":390,"height":844},device_scale_factor=1)
            mobile.set_default_timeout(13000)
            for path,ready in [("","#axiovo-entry-form"),("discover.html#discover","#rl-source-arxiv"),
                               ("discover.html?view=scholarly#discover","#scholar-search-form"),
                               ("discover.html#workspace","#workspace-panel #library-list")]:
                mobile.goto(base+path,wait_until="domcontentloaded",timeout=25000)
                mobile.locator(ready).wait_for(timeout=17000)
                overflow=mobile.evaluate("Math.max(0,document.documentElement.scrollWidth-window.innerWidth)")
                assert overflow<=5,("Horizontal overflow on mobile",path,overflow)
                checked.append("mobile "+(path or "homepage"))
            mobile.close()
            browser.close()
    finally:
        server.shutdown()
    print("Axiovo browser routes verified:",len(checked),checked,flush=True)


if __name__=="__main__":
    main()
