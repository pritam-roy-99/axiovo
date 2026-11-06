#!/usr/bin/env python3
"""Source-to-Desk-to-Library browser integration at phone and desktop widths.

All records below are synthetic test fixtures, never displayed as real papers
in production. This test must not use live provider success as a pass condition.
"""
import functools
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

DOCS=Path(__file__).resolve().parents[1]/"docs"

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def main():
    server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(DOCS)))
    Thread(target=server.serve_forever,daemon=True).start()
    base="http://127.0.0.1:%s/"%server.server_address[1]
    sources={
      "arxiv":[
        dict(id="2611.13001",title="Synthetic diffusion quantum transport older",
             abstract="Diffusion of quantum information",authors=["Test Author A"],published="2026-10-01",categories=["quant-ph"]),
        dict(id="2611.13002",title="Synthetic diffusion quantum transport newer",
             abstract="Diffusion of quantum information",authors=["Test Author B"],published="2026-11-05",categories=["quant-ph"])],
      "biorxiv":[
        dict(doi="10.1101/2026.11.01.123456",title="Synthetic diffusion of cells",
             abstract="Diffusion in cellular tissue",authors=["Test Biologist"],date="2026-11-01")],
      "chemrxiv":[
        dict(doi="10.26434/chemrxiv-2026-diffusion",title="Synthetic diffusion catalysis",
             abstract="Molecular diffusion and catalysis",authors=["Test Chemist"],date="2026-11-02")]
    }
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
            for width in (390,1360):
                ctx=browser.new_context(viewport={"width":width,"height":850},service_workers="block")
                page=ctx.new_page()
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                def data_route(route):
                    file=route.request.url.rsplit("/",1)[-1].split("?",1)[0]
                    key={"feed.json":"arxiv","biorxiv.json":"biorxiv","chemrxiv.json":"chemrxiv"}.get(file)
                    payload={"papers":sources[key],"generated_at":"2026-11-06T12:00:00Z"} if key else {"papers":[]}
                    route.fulfill(status=200,content_type="application/json",body=json.dumps(payload))
                page.route("**/data/*.json",data_route)
                def empty_doi(route):
                    route.fulfill(status=200,content_type="application/json",body=json.dumps({"data":[],"meta":{"total":0},"links":{}}))
                page.route("https://api.datacite.org/dois?**",empty_doi)
                page.route("https://www.ebi.ac.uk/europepmc/**",lambda route:route.fulfill(status=200,content_type="application/json",
                    body='{"resultList":{"result":[]},"hitCount":0}'))
                page.route("https://api.crossref.org/**",lambda route:route.fulfill(status=200,content_type="application/json",
                    body='{"message":{"items":[],"total-results":0}}'))
                page.goto(base+"desk.html?q=diffusion",wait_until="domcontentloaded")
                for source in ("arxiv","biorxiv","chemrxiv"):
                    lane=page.locator("#rd-source-"+source)
                    lane.locator("h4 a").first.wait_for(timeout=20000)
                    assert lane.locator("h4 a").first.get_attribute("href").startswith("https://"),(width,source)
                arxiv=page.locator("#rd-source-arxiv")
                assert arxiv.locator("h4").count()==2
                page.locator("#rd-results-sort").select_option("recent")
                assert "newer" in arxiv.locator("h4").first.inner_text().lower()
                page.locator("#rd-results-sort").select_option("oldest")
                assert "older" in arxiv.locator("h4").first.inner_text().lower()
                for source in ("arxiv","biorxiv","chemrxiv"):
                    lane=page.locator("#rd-source-"+source)
                    lane.get_by_role("button",name="Save to Library").first.click()
                page.goto(base+"workspace.html",wait_until="domcontentloaded")
                page.wait_for_function("document.querySelector('#library-list').textContent.includes('Synthetic diffusion')")
                saved=page.locator("#library-list").inner_text()
                for text in ("Synthetic diffusion quantum transport","Synthetic diffusion of cells","Synthetic diffusion catalysis"):
                    assert text in saved,(width,"Missing saved source paper",text)
                assert not errors,(width,errors)
                if width==390:
                    overflow=page.evaluate("document.documentElement.scrollWidth-innerWidth")
                    assert overflow<=7,(width,overflow)
                ctx.close()
            browser.close()
            print("PASS: cross-archive search, original URLs, newest/oldest sorting and persistent Library saving on phone and desktop")
    finally:
        server.shutdown()

if __name__=="__main__":
    main()
