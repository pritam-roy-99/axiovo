#!/usr/bin/env python3
"""Reproducible local Pages performance/accessibility sampling.

This automated audit is NOT a real Android/Safari or WCAG certification.
Never claim Lighthouse or network quality values from these local measurements.
"""
from __future__ import annotations

import contextlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import socket
import threading
from time import perf_counter

ROOT=Path(__file__).resolve().parents[1]
PAGES=["index.html","arxiv.html","biorxiv.html","chemrxiv.html",
       "desk.html","feed.html","workspace.html","copilot.html","lab.html"]
WIDTHS=[320,360,390,430,768,1366]
OUTPUT=ROOT/"reports"/"local-browser-quality.json"

def run():
    from playwright.sync_api import sync_playwright
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs):
            super().__init__(*args,directory=str(ROOT/"docs"),**kwargs)
        def log_message(self,*args): pass

    with socket.socket() as sock:
        sock.bind(("127.0.0.1",0))
        port=sock.getsockname()[1]
    server=ThreadingHTTPServer(("127.0.0.1",port),Handler)
    worker=threading.Thread(target=server.serve_forever,daemon=True)
    worker.start()
    result={"environment":"local Chromium, default CPU, warm local HTTP; not production",
            "widths":WIDTHS,"pages":PAGES,"measurements":[]}
    try:
      with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True,args=["--no-sandbox"])
        for width in WIDTHS:
          page=browser.new_page(viewport={"width":width,"height":850},reduced_motion="reduce")
          page.add_init_script("""(() => {
            window.__axiovoPerf = {lcp:null,cls:0};
            try{
              new PerformanceObserver(list=>{
                for(const e of list.getEntries())window.__axiovoPerf.lcp=e.startTime;
              }).observe({type:"largest-contentful-paint",buffered:true});
              new PerformanceObserver(list=>{
                for(const e of list.getEntries())if(!e.hadRecentInput)window.__axiovoPerf.cls+=e.value;
              }).observe({type:"layout-shift",buffered:true});
            }catch(e){}
          })()""")
          for route in PAGES:
            began=perf_counter()
            problem=None
            try:
              response=page.goto(f"http://127.0.0.1:{port}/{route}",
                                 wait_until="domcontentloaded",timeout=20000)
              page.wait_for_timeout(150)
              info=page.evaluate("""() => ({
               documentWidth:document.documentElement.scrollWidth,
               viewport:document.documentElement.clientWidth,
               title:document.title,
               h1:document.querySelectorAll('h1').length,
               nav:!!document.querySelector('header'),
               timing:performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd ?? null,
               lcp:window.__axiovoPerf?.lcp,
               cls:window.__axiovoPerf?.cls
              })""")
              if response is None or response.status>=400:problem="HTTP error"
              if info["documentWidth"]>info["viewport"]+3:problem="horizontal-overflow"
              if info["h1"]<1:problem=(problem or "")+" missing-main-heading"
            except Exception as error:
              info={};problem=str(error).splitlines()[0][:160]
            result["measurements"].append({"width":width,"route":route,"elapsed_ms":round((perf_counter()-began)*1000,1),
                                              "error":problem,**info})
          page.close()
        browser.close()
    finally:
      server.shutdown()
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(result,indent=2),encoding="utf8")
    issues=[x for x in result["measurements"] if x["error"]]
    print(f"Local browser measurements: {len(result['measurements'])}, issues: {len(issues)}; {OUTPUT}")
    for x in issues[:20]:
      print(f"  {x['width']}px {x['route']}: {x['error']}")
    return len(issues)

if __name__=="__main__":
    raise SystemExit(1 if run() else 0)
