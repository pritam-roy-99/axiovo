#!/usr/bin/env python3
"""Current Axiovo archive tests: topic selection, search, save, Library, mobile.

Uses local content for reliable baseline coverage. Remote scholarly APIs are
tested separately; a network-dependent fixture must not define UI correctness.
"""
from __future__ import annotations
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

DOCS=Path(__file__).resolve().parents[1]/"docs"
PATHS=(
 ("arxiv","arxiv.html?category=math-ph&topic=quantum-many-body-theory&subtopic=lieb-robinson-bounds","lieb-robinson-bounds"),
 ("biorxiv","biorxiv.html?category=Genomics&topic=transcriptomics&subtopic=spatial-transcriptomics","spatial-transcriptomics"),
 ("chemrxiv","chemrxiv.html?category=Catalysis&topic=electrocatalysis&subtopic=electrochemical-co2-reduction","electrochemical-co2-reduction"),
)

class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def main():
 server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(DOCS)))
 Thread(target=server.serve_forever,daemon=True).start()
 base="http://127.0.0.1:%s/"%server.server_address[1]
 checks=0
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
   for width in (390,1360):
    context=browser.new_context(viewport={"width":width,"height":850},service_workers="block")
    page=context.new_page()
    page.set_default_timeout(15000)
    for source,path,subtopic in PATHS:
     page.goto(base+path,wait_until="domcontentloaded")
     page.wait_for_function("document.querySelector('#archive-subfield')?.value.length>0")
     assert page.locator("#archive-subfield").input_value()==subtopic,(source,"Subtopic not selected")
     assert page.locator("#archive-field").input_value(),(source,"Archive subject not selected")
     assert page.locator("#archive-topic").input_value(),(source,"Research topic not selected")
     assert page.locator("#archive-search-form").count()==1
     assert page.locator("#archive-results").count()==1
     assert page.locator("#archive-query").count()==1
     assert page.locator("#archive-from").count()==1 and page.locator("#archive-to").count()==1
     assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+7"),(width,path,"Horizontal overflow")
     checks+=1
     if source=="arxiv" and width==1360:
      page.locator(".ex-paper").first.wait_for(timeout=18000)
      paper=page.locator(".ex-paper").first
      title=paper.locator("h3").inner_text().strip()
      assert title,(source,"Missing paper title")
      paper.get_by_role("button",name="Save to Library",exact=True).click()
      page.goto(base+"workspace.html",wait_until="domcontentloaded")
      page.locator("#library-list").wait_for()
      page.get_by_text(title,exact=False).first.wait_for(timeout=12000)
      checks+=1
      page.goto(base+path,wait_until="domcontentloaded")
      page.locator("#archive-from").fill("2025-01-10")
      page.locator("#archive-to").fill("2025-01-01")
      page.locator("#archive-search-form").evaluate("(form)=>form.requestSubmit()")
      page.get_by_text("The start must be on or before the end",exact=False).first.wait_for()
      checks+=1
    context.close()
   browser.close()
 finally:
  server.shutdown()
 print("PASS: %s archive workflow checks across three sources, with saving and date validation."%checks,flush=True)

if __name__=="__main__":
 main()
