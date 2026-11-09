#!/usr/bin/env python3
"""Current Axiovo archive tests: topic selection, search, save, Library, mobile.

Uses local content for reliable baseline coverage. Remote scholarly APIs are
tested separately; a network-dependent fixture must not define UI correctness.
"""
from __future__ import annotations
import functools,json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import parse_qs, urlsplit
from playwright.sync_api import expect, sync_playwright

DOCS=Path(__file__).resolve().parents[1]/"docs"
PATHS=(
 ("arxiv","arxiv.html?category=math-ph&topic=quantum-many-body-theory&subtopic=lieb-robinson-bounds","lieb-robinson-bounds"),
 ("biorxiv","biorxiv.html?category=Genomics&topic=transcriptomics&subtopic=spatial-transcriptomics","spatial-transcriptomics"),
 ("chemrxiv","chemrxiv.html?category=Catalysis&topic=electrocatalysis&subtopic=electrochemical-co2-reduction","electrochemical-co2-reduction"),
)
PICKER_CASES={
 "arxiv":(
  ("q","Quantum Physics · quant-ph","quant-ph"),
  ("hard","Quantum hardware","quantum-hardware"),
  ("neutral atom","Neutral atom quantum computing","neutral-atom-quantum-computing"),
 ),
 "biorxiv":(
  ("genom","Genomics","Genomics"),
  ("transcri","Transcriptomics","transcriptomics"),
  ("spatial trans","Spatial transcriptomics","spatial-transcriptomics"),
 ),
 "chemrxiv":(
  ("catal","Catalysis","Catalysis"),
  ("electrocat","Electrocatalysis","electrocatalysis"),
  ("co2 reduc","Electrochemical CO2 reduction","electrochemical-co2-reduction"),
 ),
}

# Synthetic announcement fixture, served only by this local test server.
# A narrow subtopic can legitimately have zero papers on a real release day.
ANNOUNCEMENT_FIXTURE={"date_type":"announcement","source":"https://rss.arxiv.org/rss/",
 "announcement_date":"2026-11-09","complete":True,"count":2,"papers":[
 {"id":"2611.00001","title":"Lieb-Robinson bounds for quantum many-body theory",
  "abstract":"Lieb-Robinson bounds on information propagation in quantum many-body systems.",
  "authors":["Test Author"],"categories":["math-ph"],"version":1,
  "announcement_date":"2026-11-09","announce_type":"new"},
 {"id":"2611.00002","title":"Unrelated galaxy survey",
  "abstract":"Galaxy observations.","authors":["Test Author"],
  "categories":["astro-ph.GA"],"version":1,
  "announcement_date":"2026-11-09","announce_type":"new"}]}
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if urlsplit(self.path).path!="/data/announcements.json":
   return super().do_GET()
  payload=json.dumps(ANNOUNCEMENT_FIXTURE).encode()
  self.send_response(200)
  self.send_header("Content-Type","application/json")
  self.send_header("Content-Length",str(len(payload)))
  self.end_headers()
  self.wfile.write(payload)

def check_searchable_path(page,base,source,touch):
 # Isolate this baseline test from the path saved by the previous deep-link test.
 # Keep production persistence unchanged.
 page.goto(base+source+".html",wait_until="domcontentloaded")
 page.evaluate("(source) => localStorage.removeItem('axiovo-topic-explorer-' + source + '-v1')",source)
 page.goto(base+source+".html?sort=relevance",wait_until="domcontentloaded")
 expect(page.locator("#archive-topic-input")).to_be_disabled()
 expect(page.locator("#archive-subfield-input")).to_be_disabled()
 for field,(query,label,value) in zip(("field","topic","subfield"),PICKER_CASES[source]):
  native=page.locator("#archive-"+field)
  picker=page.locator("#archive-"+field+"-input")
  expect(picker).to_be_enabled()
  assert not native.is_visible()
  original=native.input_value()
  picker.tap() if touch else picker.click()
  expect(picker).to_have_attribute("aria-expanded","true")
  popup=page.locator("#archive-"+field+"-listbox")
  unfiltered=popup.get_by_role("option").count()
  original_url=page.url
  picker.fill(query)
  option=popup.get_by_role("option",name=label,exact=True)
  expect(option).to_be_visible()
  assert popup.get_by_role("option").count()<unfiltered,(source,field,query,"Unfiltered menu")
  assert native.input_value()==original and page.url==original_url,(source,field,"Typing changed the selected path")
  if touch:
   option.tap()
  else:
   if source=="arxiv" and field=="field":
    assert popup.get_by_role("option",name="Mathematical Physics · math-ph",exact=True).count()==0
    active=picker.get_attribute("aria-activedescendant")
    picker.press("ArrowDown")
    assert picker.get_attribute("aria-activedescendant")!=active
    picker.fill("zzzz-no-such-choice")
    expect(page.get_by_text("No matching choices.")).to_be_visible()
    picker.press("Enter")
    assert native.input_value()==original
    picker.press("Escape")
    expect(picker).to_have_value("All subjects")
    expect(picker).to_have_attribute("aria-expanded","false")
   picker.fill(value.upper())
   expect(option).to_be_visible()
   picker.press("Enter")
  expect(native).to_have_value(value)
  expect(picker).to_have_value(label)
  expect(picker).to_have_attribute("aria-expanded","false")
  assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+7")
 selected=[choice[2] for choice in PICKER_CASES[source]]
 params=parse_qs(urlsplit(page.url).query)
 assert [params.get(key,[None])[0] for key in ("category","topic","subtopic")]==selected
 page.reload(wait_until="domcontentloaded")
 expect(page.locator("#archive-subfield-input")).to_have_value(PICKER_CASES[source][-1][1])
 if touch:
  subject=page.locator("#archive-field-input")
  topic=page.locator("#archive-topic-input")
  subject.tap()
  expect(subject).to_have_attribute("aria-expanded","true")
  topic.tap()
  expect(subject).to_have_attribute("aria-expanded","false")
  expect(topic).to_have_attribute("aria-expanded","true")
  page.locator("#ex-guide-title").tap()
  expect(topic).to_have_attribute("aria-expanded","false")
  expect(page.locator("#archive-subfield")).to_have_value(selected[-1])

def main():
 server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(DOCS)))
 Thread(target=server.serve_forever,daemon=True).start()
 base="http://127.0.0.1:%s/"%server.server_address[1]
 checks=0
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
   for width in (390,1360):
    context=browser.new_context(viewport={"width":width,"height":850},service_workers="block",has_touch=width==390)
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
      assert "Lieb-Robinson bounds" in title
      assert page.locator(".ex-paper").count()==1,"Unrelated announcement leaked into subtopic"
      assert page.locator("#archive-subfield").input_value()==subtopic
      assert title,(source,"Missing paper title")
      paper.get_by_role("button",name="Save to Library",exact=True).click()
      page.goto(base+"workspace.html",wait_until="domcontentloaded")
      page.locator("#library-list").wait_for()
      page.get_by_text(title,exact=False).first.wait_for(timeout=12000)
      checks+=1
      page.goto(base+path,wait_until="domcontentloaded")
      page.locator("#archive-advanced").evaluate("el=>el.open=true")
      page.locator("#archive-from").fill("2025-01-10")
      page.locator("#archive-to").fill("2025-01-01")
      page.locator("#archive-search-form").evaluate("(form)=>form.requestSubmit()")
      page.get_by_text("The start must be on or before the end",exact=False).first.wait_for()
      checks+=1
     check_searchable_path(page,base,source,touch=width==390)
     checks+=1
     # Historical-range action must load a source-era window, never a recent-only default.
     page.goto(base+source+".html",wait_until="domcontentloaded")
     page.locator("#archive-history").click()
     expected={"arxiv":"1991-08-01","biorxiv":"2013-11-01","chemrxiv":"2017-01-01"}[source]
     assert page.locator("#archive-from").input_value()==expected,(source,"Historical start")
     assert page.locator("#archive-to").input_value(),(source,"Missing historical end")
     assert page.locator("#archive-sort").input_value()=="oldest"
     assert page.locator("#archive-advanced").evaluate("el=>el.open")
     assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+7"),(source,width,"History overflow")
     checks+=1
    context.close()
   browser.close()
 finally:
  server.shutdown()
 print("PASS: %s archive workflow checks across three sources, including typed filters, touch, keyboard, saving and dates."%checks,flush=True)

if __name__=="__main__":
 main()
