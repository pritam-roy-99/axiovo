#!/usr/bin/env python3
"""Large-corpus mobile browser parity test: worker vs synchronous Feed.

Uses identical synthetic source snapshots. Validates that ranking and author
identity safeguards are unchanged, rather than benchmarking network speed.
"""
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
    docs=[]
    for i in range(1800):
        matches=(i%19==0)
        docs.append({
            "id":f"2611.{i:05}",
            "title":("Preparation contextuality and quantum information "+str(i) if matches
                     else "Stochastic control and unrelated theoretical systems "+str(i)),
            "abstract":("Operational quantum information and contextuality tests." if matches
                        else "An unrelated mathematical systems analysis."),
            "authors":["Pritam Roy"] if i%43==0 else ["Source Author"],
            "published":"2026-11-05"
        })
    fixture=json.dumps({"papers":docs})
    server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f"http://127.0.0.1:{server.server_address[1]}/"
    try:
      with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        results=[]
        for worker_enabled in (True,False):
            ctx=browser.new_context(viewport={"width":390,"height":844},
                                    service_workers="block")
            page=ctx.new_page()
            page.set_default_timeout(25000)
            errors=[]
            page.on("pageerror",lambda e:errors.append(str(e)))
            page.add_init_script("""(() => {
              localStorage.setItem("axiovo-followed-topics",JSON.stringify(["preparation contextuality"]));
              localStorage.setItem("axiovo-author-follows",JSON.stringify(["Pritam Roy"]));
              window.__workerConstructed=0;
              const NativeWorker=window.Worker;
              if(WORKER_FLAG){
                window.Worker=class extends NativeWorker {
                  constructor(...args){super(...args);window.__workerConstructed++}
                };
              }else{
                window.Worker=undefined;
              }
            })()""".replace("WORKER_FLAG","true" if worker_enabled else "false"))
            page.route("**/data/feed-preview.json",lambda req:req.fulfill(status=404,body=""))
            page.route("**/data/feed.json",lambda req:req.fulfill(
                status=200,content_type="application/json",body=fixture))
            for filename in ("oai-recent.json","announcements.json","biorxiv.json","chemrxiv.json"):
                page.route("**/data/"+filename,lambda req:req.fulfill(
                    status=200,content_type="application/json",body='{"papers":[]}'))
            page.goto(base+"feed.html",wait_until="domcontentloaded")
            page.wait_for_function("""() =>
              document.querySelector("#feed-match-count")?.textContent?.includes("matching") &&
              document.querySelector("#feed-refresh")?.disabled === false
            """,timeout=25000)
            page.locator(".feed-card").first.wait_for(state="visible",timeout=25000)
            counts=page.evaluate("""() => ({
              total:document.querySelector("#feed-match-count").textContent,
              first:[...document.querySelectorAll(".feed-card h3")].map(x=>x.textContent),
              workers:window.__workerConstructed,
              overflow:document.documentElement.scrollWidth-innerWidth
            })""")
            assert counts["first"],("Feed must show research matches",worker_enabled,counts)
            assert counts["overflow"]<=7,("Mobile overflow",worker_enabled,counts)
            assert not errors,(worker_enabled,errors)
            if worker_enabled:
                assert counts["workers"]>=1,("Worker should handle large corpus",counts)
            else:
                assert counts["workers"]==0
            # The title and source filters must remain fully interactive.
            page.locator("#feed-source").select_option("biorxiv")
            assert page.locator(".feed-card").count()==0
            page.locator("#feed-source").select_option("all")
            page.locator(".feed-card").first.get_by_role("button",name="Save").click()
            assert page.locator(".feed-card").first.locator(".feed-save").get_attribute("aria-pressed")=="true"
            results.append(counts)
            ctx.close()
        assert results[0]["total"]==results[1]["total"],results
        assert results[0]["first"]==results[1]["first"],results
        print("PASS: mobile worker and synchronous fallback show identical ranked results, filters, save actions and no overflow")
        browser.close()
    finally:
        server.shutdown()

if __name__=="__main__":
    main()
