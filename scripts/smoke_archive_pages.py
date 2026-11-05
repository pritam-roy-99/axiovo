#!/usr/bin/env python3
"""Exercise the actual three dedicated source pages, without remote API assumptions."""
from __future__ import annotations
import functools
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]/"docs"
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
def main():
 server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
 Thread(target=server.serve_forever,daemon=True).start()
 base=f"http://127.0.0.1:{server.server_address[1]}/"
 try:
  with sync_playwright() as pw:
   b=pw.chromium.launch(headless=True,args=["--no-sandbox"])
   p=b.new_page(viewport={"width":1200,"height":850})
   p.set_default_timeout(16000)
   errors=[]
   p.on("pageerror",lambda e:errors.append(str(e)))
   p.goto(base,wait_until="domcontentloaded")
   cards=p.locator(".axiovo-archive-card");cards.first.wait_for()
   assert cards.count()==3
   assert [x.get_attribute("data-archive") for x in cards.all()]==["arxiv","biorxiv","chemrxiv"]
   assert p.locator(".axiovo-video-top").count()==1
   assert p.locator(".axiovo-video-top").bounding_box()["y"]>cards.first.bounding_box()["y"]
   for source,expected in [("arxiv",8),("biorxiv",1),("chemrxiv",1)]:
    p.goto(base+source+".html",wait_until="domcontentloaded")
    p.locator("#archive-field").wait_for(state="visible")
    assert p.locator("#archive-topic option").count()==expected
    assert p.locator("#archive-field option").count()>1
    assert p.locator("#archive-subfield").is_visible()
    assert p.locator("#archive-search-form").is_visible()
    assert p.locator("#archive-results").is_visible()
    assert p.locator("#archive-sort option").count()==3
    assert p.locator("#archive-scope option").count()==2
    p.locator(".axiovo-edit-fields > summary").click()
    p.locator("#archive-custom").fill("Synthetic instrumentation")
    p.locator("#archive-custom-form button[type=submit]").click()
    assert p.locator("#archive-subfield").input_value()=="Synthetic instrumentation"
    p.reload(wait_until="domcontentloaded")
    p.locator("#archive-subfield").wait_for()
    assert p.locator("#archive-subfield").input_value()=="Synthetic instrumentation"
    p.locator(".axiovo-edit-fields > summary").click()
    p.locator("#archive-reset").click()
    assert p.locator("#archive-subfield").input_value()==""
    assert p.locator("#archive-result-count").is_visible()
    assert p.evaluate("document.documentElement.scrollWidth-window.innerWidth")<8
   mobile=b.new_page(viewport={"width":390,"height":820})
   for source in ("arxiv","biorxiv","chemrxiv"):
    mobile.goto(base+source+".html",wait_until="domcontentloaded")
    mobile.locator("#archive-field").wait_for()
    assert mobile.evaluate("document.documentElement.scrollWidth-window.innerWidth")<8
   assert not errors,"Unhandled runtime errors: "+repr(errors)
   b.close()
 finally:server.shutdown()
 print("Three dedicated archive pages, saved editable subfields, mobile layouts and source UI passed.",flush=True)
if __name__=="__main__":main()
