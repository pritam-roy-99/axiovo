#!/usr/bin/env python3
"""Current Axiovo browser acceptance test for real routes, mobile navigation and controls.

Uses local HTTP only, blocks service workers to avoid stale caches. Does not treat a
missing upstream research provider as evidence of an application defect.
"""
from __future__ import annotations
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

DOCS = Path(__file__).resolve().parents[1] / "docs"
ROUTES = ("", "arxiv.html", "biorxiv.html", "chemrxiv.html", "desk.html",
          "workspace.html", "copilot.html", "profiles.html", "lab.html",
          "paper.html", "compare.html", "methodology.html", "privacy.html",
          "community.html")

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(DOCS)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:%s/" % server.server_address[1]
    verified = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            for width in (360, 390, 768, 1360):
                ctx = browser.new_context(viewport={"width": width, "height": 850},
                                          service_workers="block", reduced_motion="reduce")
                page = ctx.new_page()
                page.set_default_timeout(12000)
                for path in ROUTES:
                    page.goto(base + path, wait_until="domcontentloaded", timeout=25000)
                    page.locator("header.rl-global-header .axiovo-header-appearance").wait_for()
                    page.locator(".axiovo-header-appearance .theme-toggle").wait_for()
                    result = page.evaluate("""() => {
                      const qs = s => document.querySelector(s);
                      const box = s => {const r=qs(s)?.getBoundingClientRect();return r&&{
                        x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height
                      }};
                      return {
                        settings:box('.axiovo-header-appearance .rl-settings-link'),
                        theme:box('.axiovo-header-appearance .theme-toggle'),
                        logo:box('.rl-logo'),
                        back:box('.axiovo-back-button'),
                        home:box('.axiovo-home-link'),
                        overflow:document.documentElement.scrollWidth - window.innerWidth,
                        nav:document.querySelectorAll('.rl-nav a').length,
                        header:box('header.rl-global-header')
                      };
                    }""")
                    assert result["nav"] == 4, (width,path,"Incorrect global navigation",result)
                    assert result["settings"] and result["theme"],(width,path,"Appearance actions absent")
                    a,b=result["settings"],result["theme"]
                    assert abs(a["y"]-b["y"])<=2, (width,path,"Settings and theme not in same row",result)
                    assert 0<=a["x"] and b["right"]<=width+2,(width,path,"Appearance outside viewport",result)
                    assert result["overflow"]<=7,(width,path,"Page has horizontal overflow",result)
                    if width<=760:
                        assert abs(result["logo"]["y"]-a["y"])<=7,(width,path,"Mobile header shifted",result)
                        if path:
                            assert result["back"] and result["home"],(width,path,"Back/Home missing")
                    verified.append((width,path or "home"))
                page.goto(base,wait_until="domcontentloaded")
                page.locator(".axiovo-archive-card").first.wait_for()
                assert page.locator(".axiovo-archive-card").count()==3
                for source in ("arxiv","biorxiv","chemrxiv"):
                    page.locator('[data-archive="%s"]'%source).click()
                    page.wait_for_url(lambda url: urlsplit(url).path.endswith("/"+source+".html"))
                    page.locator("#archive-field").wait_for()
                    assert page.locator("#archive-topic").count()==1
                    show = page.locator("#archive-show-results")
                    assert show.count()==1,(source,"Results CTA missing")
                    assert "Show matching papers" in show.inner_text(),(source,"Results CTA label missing")
                    contrast = show.evaluate("""el=>({
                        color:getComputedStyle(el).color,
                        background:getComputedStyle(el).backgroundColor,
                        readable:el.getBoundingClientRect().width>0
                    })""")
                    assert contrast["readable"] and contrast["color"]=="rgb(255, 255, 255)",(source,contrast)
                    show.click()
                    assert page.evaluate("document.activeElement?.id")=="archive-results-heading",(source,"Results not focused")
                    page.locator(".axiovo-home-link").click()
                    page.wait_for_url(lambda url: urlsplit(url).path.endswith("/"))
                page.goto(base+"desk.html",wait_until="domcontentloaded")
                assert page.locator("#rd-search-form").count()==1
                assert page.locator("#rd-query").count()==1
                page.goto(base+"workspace.html",wait_until="domcontentloaded")
                assert page.locator("#library-list").count()==1
                assert page.locator("#following").count()==1
                page.goto(base+"copilot.html",wait_until="domcontentloaded")
                assert page.locator("#question").count()==1
                assert page.locator("#ask").count()==1
                page.locator(".assistant-advanced").first.evaluate("el=>el.open=true")
                assert page.locator("#engine option[value=hosted]").is_disabled(), "No server configured: hosted mode must be disabled"
                assert page.locator("#hosted-key").count()==0, "Browser must not collect API secrets"
                assert page.locator("#clear-hosted-key").count()==0
                assert page.locator("#engine").input_value()=="evidence"
                page.goto(base+"profiles.html",wait_until="domcontentloaded")
                before = page.evaluate("document.documentElement.dataset.theme")
                page.locator(".axiovo-header-appearance .theme-toggle").click()
                assert page.evaluate("document.documentElement.dataset.theme") != before
                page.reload(wait_until="domcontentloaded")
                assert page.evaluate("document.documentElement.dataset.theme") != before
                ctx.close()
            browser.close()
    finally:
        server.shutdown()
    print("PASS: %d route/viewport combinations, archive clicks, Research Desk, Library, Assistant, persisted theme." % len(verified),flush=True)

if __name__ == "__main__":
    main()
