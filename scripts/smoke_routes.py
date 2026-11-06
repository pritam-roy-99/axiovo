#!/usr/bin/env python3
"""Current Axiovo browser acceptance test for real routes, mobile navigation and controls.

Uses local HTTP only, blocks service workers to avoid stale caches. Does not treat a
missing upstream research provider as evidence of an application defect.
"""
from __future__ import annotations
import functools
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

DOCS = Path(__file__).resolve().parents[1] / "docs"
ROUTES = ("", "arxiv.html", "biorxiv.html", "chemrxiv.html", "desk.html", "feed.html",
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
                    assert result["nav"] == 5, (width,path,"Incorrect global navigation, expected Explore, Research Desk, My Feed, Library, Research Assistant",result)
                    assert result["settings"] and result["theme"],(width,path,"Appearance actions absent")
                    a,b=result["settings"],result["theme"]
                    assert abs(a["y"]-b["y"])<=2, (width,path,"Settings and theme not in same row",result)
                    assert 0<=a["x"] and b["right"]<=width+2,(width,path,"Appearance outside viewport",result)
                    assert result["overflow"]<=7,(width,path,"Page has horizontal overflow",result)
                    if width<=760:
                        assert abs(result["logo"]["y"]-a["y"])<=7,(width,path,"Mobile header shifted",result)
                        if path:
                            assert result["back"] and result["home"],(width,path,"Back/Home missing")
                    if not path:
                        # Regression for the dark-on-dark Axiovo meaning panel.
                        # Verify computed text/background contrast, not only CSS source.
                        contrast=page.locator(".axiovo-name-meaning").evaluate("""node=>{
                          const parse=x=>{
                            const m=x.match(/[\\d.]+/g);
                            return m?m.slice(0,3).map(Number):[0,0,0];
                          };
                          const lum=v=>{
                            const a=parse(v).map(x=>{
                              const c=x/255;
                              return c<=.04045?c/12.92:((c+.055)/1.055)**2.4
                            });
                            return .2126*a[0]+.7152*a[1]+.0722*a[2];
                          };
                          const bg=getComputedStyle(node).backgroundColor;
                          const fg=getComputedStyle(node.querySelector('span')).color;
                          const h=getComputedStyle(node.querySelector('strong')).color;
                          const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
                          return {body:ratio(bg,fg),title:ratio(bg,h)};
                        }""")
                        assert contrast["body"]>=4.5 and contrast["title"]>=4.5,(width,"Axiovo name text illegible",contrast)
                    verified.append((width,path or "home"))
                page.goto(base,wait_until="domcontentloaded")
                page.locator(".axiovo-archive-card").first.wait_for()
                assert page.locator(".axiovo-archive-card").count()==3
                for source in ("arxiv","biorxiv","chemrxiv"):
                    page.locator('[data-archive="%s"]'%source).click()
                    page.wait_for_url(lambda url: urlsplit(url).path.endswith("/"+source+".html"))
                    page.get_by_role("combobox",name="Archive subject",exact=True).wait_for()
                    assert page.locator("#archive-topic").count()==1
                    show = page.locator("#archive-show-results")
                    assert show.count()==1,(source,"Results CTA missing")
                    assert "Show matching papers" in show.inner_text(),(source,"Results CTA label missing")
                    for action_width in ((320, width) if width == 360 else (width,)):
                        if width == 360:
                            page.set_viewport_size({"width": action_width, "height": 850})
                        action = show.evaluate("""el=>{
                            const button=el.getBoundingClientRect();
                            const clear=document.getElementById("archive-clear-path").getBoundingClientRect();
                            const label=Array.from(el.childNodes).find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
                            const range=document.createRange();
                            range.selectNodeContents(label);
                            const lines=new Set(Array.from(range.getClientRects(),rect=>Math.round(rect.top))).size;
                            return {
                                color:getComputedStyle(el).color,
                                fullWidth:Math.abs(button.width-el.parentElement.clientWidth)<=1,
                                height:button.height,lines,
                                clearBelow:clear.top>=button.bottom,
                                clearHeight:clear.height
                            };
                        }""")
                        assert action["color"]=="rgb(255, 255, 255)",(action_width,source,action)
                        assert action["fullWidth"] and action["lines"]==1 and 44<=action["height"]<=56,(action_width,source,action)
                        assert action["clearBelow"] and action["clearHeight"]>=44,(action_width,source,action)
                    show.click()
                    assert page.evaluate("document.activeElement?.id")=="archive-results-heading",(source,"Results not focused")
                    page.locator(".axiovo-home-link").click()
                    page.wait_for_url(lambda url: urlsplit(url).path.endswith("/"))
                if width==390:
                    # A user in India should see the latest arXiv release under
                    # its verified US Eastern announcement date, not the UTC
                    # first-submission shard of the previous calendar day.
                    page.goto(base+"arxiv.html?announced=latest",wait_until="domcontentloaded")
                    page.wait_for_function("""() => document.querySelector('#archive-sync-status')
                      ?.textContent.includes('Official arXiv release:')""",timeout=24000)
                    assert page.locator("#archive-announced").count()==1
                    assert page.locator(".ex-paper").count()>0, "Latest announced arXiv records missing"
                    assert "all arXiv categories" in page.locator("#archive-scope-label").inner_text()
                    first=page.locator(".ex-paper").first
                    assert "Announced" in first.locator(".rd-small").first.inner_text()
                    subject=page.get_by_role("combobox",name="Archive subject",exact=True)
                    subject.fill("quant-ph")
                    page.get_by_role("option",name="Quantum Physics · quant-ph",exact=True).click()
                    assert "Quantum Physics" in page.locator("#archive-scope-label").inner_text()
                    assert "Official arXiv release:" in page.locator("#archive-sync-status").inner_text()
                    page.locator("#archive-latest").click()
                    page.wait_for_function("""() => !document.querySelector('#archive-sync-status')
                      ?.textContent.includes('Official arXiv release:')""",timeout=24000)
                # Community actions must open the intended live pages, not a legacy redirect.
                page.goto(base+"community.html",wait_until="domcontentloaded")
                page.get_by_role("link",name="Find a paper").click()
                page.wait_for_url(lambda url: urlsplit(url).path.endswith("/arxiv.html"))
                page.goto(base+"community.html",wait_until="domcontentloaded")
                page.get_by_role("link",name="Open Library").click()
                page.wait_for_url(lambda url: urlsplit(url).path.endswith("/workspace.html"))
                # Navigation labels should describe the destination and remain usable.
                nav = page.locator(".rl-nav a")
                assert nav.count()==5, "Expected Explore, Research Desk, My Feed, Library and Research Assistant"
                assert all(nav.nth(i).get_attribute("title") for i in range(5))
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
                if width==390:
                    # Reproduce the reported mobile failure: an overbroad
                    # "macroscopic quantumness" search used to display
                    # unrelated energy gaps, thermodynamics and AI sources.
                    example={"papers":[
                        {"id":"2611.11001","title":"Macroscopic stochastic thermodynamics",
                         "abstract":"Macroscopic thermodynamic fluctuations in many body matter.",
                         "authors":["Sample Author"],"published":"2026-11-03"},
                        {"id":"2611.11002","title":"Macroscopic energy gaps in quantum matter",
                         "abstract":"How gaps remain stable in large quantum systems.",
                         "authors":["Sample Author"],"published":"2026-11-03"},
                        {"id":"2611.11003","title":"Experimental witnesses of macroscopic quantumness",
                         "abstract":"We investigate witnesses of macroscopic quantumness by collective measurements.",
                         "authors":["Sample Author"],"published":"2026-11-03"}]}
                    page.route("**/data/feed.json",
                        lambda route: route.fulfill(status=200,content_type="application/json",
                            body=json.dumps(example)))
                    page.route("**/data/oai-recent.json",
                        lambda route: route.fulfill(status=200,content_type="application/json",
                            body='{"papers":[]}'))
                    page.reload(wait_until="domcontentloaded")
                    page.wait_for_function("document.getElementById('retrieval-status').textContent.includes('indexed arXiv records ready')")
                    page.locator("#question").fill("Why should we study macroscopic quantumness?")
                    page.locator("#ask").click()
                    page.wait_for_function("document.querySelector('#ask').disabled===false && document.querySelector('#conversation .message.assistant')",timeout=15000)
                    page.wait_for_function("document.querySelectorAll('#evidence-list .source').length===1")
                    assert "Experimental witnesses of macroscopic quantumness" in page.locator("#conversation").inner_text()
                    assert "[1]" in page.locator("#conversation").inner_text()
                    assert "Macroscopic energy gaps" not in page.locator("#evidence-list").inner_text()
                    assert page.locator("#evidence-list .assistant-source-details").count()==1
                    assert page.locator("#evidence-list .assistant-source-details").first.get_attribute("open") is None
                    attempted=[]
                    def external_lookup(route):
                        attempted.append(route.request.url)
                        route.abort()
                    for provider in ("https://api.openalex.org/**","https://api.datacite.org/**"):
                        page.route(provider,external_lookup)
                    page.locator("#question").fill("Microbial resistance in tropical river sediments")
                    page.locator("#ask").click()
                    page.wait_for_function("document.querySelector('#retrieval-status').textContent.includes('0 relevant sources')")
                    assert not attempted,("Indexed-only search sent a query to a public provider",attempted)
                    for requested in ("2611.11003v9","2611.11999"):
                        page.goto(base+"copilot.html?id="+requested,wait_until="domcontentloaded")
                        assert page.locator("#question").input_value()==requested
                        page.locator("#ask").click()
                        original=page.locator("#retrieval-status a")
                        original.wait_for()
                        assert original.get_attribute("href")=="https://arxiv.org/abs/"+requested
                        assert page.locator("#evidence-list .source").count()==0
                    assert not attempted,("Unverified arXiv ID looked up in indexed-only mode",attempted)
                    for provider in ("https://api.openalex.org/**","https://api.datacite.org/**"):
                        page.unroute(provider,external_lookup)
                if width==390:
                    # Followed-author identity regression: abbreviated A. S. Majumdar
                    # must reveal work indexed as Archan S Majumdar, while an
                    # unrelated S. N. Majumdar result must not be shown.
                    page.route("https://api.datacite.org/dois?**",
                        lambda route: route.fulfill(status=200,content_type="application/json",
                            body='{"data":[],"meta":{"total":0},"links":{}}'))
                    page.route("https://api.openalex.org/authors?**",
                        lambda route: route.fulfill(status=200,content_type="application/json",
                            body=json.dumps({"results":[
                              {"id":"https://openalex.org/A12345","display_name":"Archan S Majumdar"},
                              {"id":"https://openalex.org/A67890","display_name":"S. N. Majumdar"}]})))
                    page.route("https://api.openalex.org/works?**",
                        lambda route: route.fulfill(status=200,content_type="application/json",
                            body=json.dumps({"results":[{"id":"https://openalex.org/W3333",
                              "display_name":"Sharing quantum nonlocality and teleportation over long distance using optical hybrid states",
                              "publication_date":"2025-02-02",
                              "authorships":[{"author":{"display_name":"Archan S Majumdar"}}],
                              "locations":[{"landing_page_url":"https://arxiv.org/abs/2502.00707"}]}]})))
                    page.evaluate('localStorage.setItem("axiovo-author-follows",JSON.stringify(["A.S. Majumdar"]))')
                    page.goto(base+"workspace.html#following",wait_until="domcontentloaded")
                    page.locator("#following-source").select_option("arxiv")
                    page.wait_for_function(
                        "() => document.querySelector('#following-results').textContent.includes('Sharing quantum nonlocality')",
                        timeout=25000)
                    text=page.locator("#following-results").inner_text()
                    assert "Sharing quantum nonlocality" in text
                    assert "Archan S Majumdar" in text
                    assert "S. N. Majumdar" not in text
                    page.unroute("https://api.datacite.org/dois?**")
                    page.unroute("https://api.openalex.org/authors?**")
                    page.unroute("https://api.openalex.org/works?**")
                page.goto(base+"profiles.html",wait_until="domcontentloaded")
                before = page.evaluate("document.documentElement.dataset.theme")
                page.locator(".axiovo-header-appearance .theme-toggle").click()
                assert page.evaluate("document.documentElement.dataset.theme") != before
                page.reload(wait_until="domcontentloaded")
                assert page.evaluate("document.documentElement.dataset.theme") != before
                ctx.close()
            context=browser.new_context(viewport={"width":390,"height":850})
            page=context.new_page()
            page.goto(base+"workspace.html",wait_until="load")
            page.wait_for_function("Boolean(navigator.serviceWorker.controller)",timeout=25000)
            page.evaluate("""() => {
                const paper=AxiovoArchiveData.normalize("arxiv",{
                    id:"2611.11333v2", title:"Synthetic pinned paper for the offline Library"
                });
                AxiovoArchiveData.save(paper);
            }""")
            context.set_offline(True)
            page.goto(base+"workspace.html?view=saved",wait_until="domcontentloaded")
            saved=page.locator("#library-list").get_by_role("link",name="Synthetic pinned paper for the offline Library")
            saved.wait_for()
            assert saved.get_attribute("href")=="https://arxiv.org/abs/2611.11333v2"
            context.close()
            browser.close()
    finally:
        server.shutdown()
    print("PASS: %d route/viewport combinations, archive clicks, Research Desk, Library, Assistant, persisted theme." % len(verified),flush=True)

if __name__ == "__main__":
    main()
