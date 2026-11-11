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
ROUTES = ("", "arxiv.html", "biorxiv.html", "chemrxiv.html", "crypto.html", "desk.html", "feed.html",
          "workspace.html", "copilot.html", "profiles.html", "lab.html",
          "paper.html", "compare.html", "methodology.html", "privacy.html",
          "community.html")
FEATURES = ("Explore", "Research Desk", "My Feed", "Library", "Research Assistant")

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

def check_phone_content(page, path, width):
    def boxes(selector, count):
        controls=page.locator(selector).evaluate_all("""nodes=>nodes.map(el=>{
          const {x,y,width,height,right}=el.getBoundingClientRect();
          return {x,y,width,height,right};
        })""")
        assert len(controls)==count,(width,path,selector,controls)
        assert all(c["height"]>=44 and c["x"]>=0 and c["right"]<=width+1 for c in controls),(
            width,path,"Clipped or undersized phone controls",selector,controls)
        return controls

    if path=="desk.html":
        sources=boxes("#rd-search-form .rd-sources label",4)
        assert sources[0]["y"]==sources[1]["y"]<sources[2]["y"]==sources[3]["y"],(width,path,sources)
        boxes("#rd-advanced>summary",1)
    elif path=="feed.html":
        tabs=boxes(".feed-tabs button",4)
        assert all(tab["y"]==tabs[0]["y"] for tab in tabs),(width,path,tabs)
        assert page.locator(".feed-tabs").evaluate("el=>el.scrollWidth<=el.clientWidth+1")
        boxes(".feed-filters :is(select,button)",4)
        assert page.locator(".feed-filters").evaluate("""el=>[...el.querySelectorAll('label')].every(label=>{
          const a=label.getBoundingClientRect(),b=label.control.getBoundingClientRect();
          return Math.abs(a.x-b.x)<=1&&a.bottom<=b.top;
        })"""),(width,path,"Feed labels are separated from their filters")
        assert page.locator(".feed-layout").evaluate("""el=>
          el.querySelector('.feed-stream').getBoundingClientRect().top<
          el.querySelector('#feed-follow-tools').getBoundingClientRect().top"""),(width,path,"Settings precede papers")
        if width==390:
            page.locator('.feed-hero-actions a[href="#feed-follow-tools"]').click()
            page.wait_for_url("**/feed.html#feed-follow-tools")
            assert page.locator("#feed-author-input").is_visible()
    elif path in ("arxiv.html","biorxiv.html","chemrxiv.html","crypto.html"):
        archives=boxes(".ex-archives a",4)
        assert all(link["y"]==archives[0]["y"] for link in archives),(width,path,archives)
        assert page.locator(".ex-archives").evaluate("el=>el.scrollWidth<=el.clientWidth+1")
    elif path=="workspace.html":
        tabs=boxes(".library-tabs a",3)
        assert tabs[0]["y"]==tabs[1]["y"]<tabs[2]["y"],(width,path,tabs)
        boxes("#export-library, #export-citations",2)
    elif path=="copilot.html":
        modes=boxes(".assistant-task-row :is(button,a)",3)
        assert modes[0]["y"]==modes[1]["y"]<modes[2]["y"],(width,path,modes)
        boxes("#ask",1)
        assert page.locator("#ask").evaluate("el=>el.offsetWidth===el.parentElement.clientWidth")

def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(DOCS)))
    Thread(target=server.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:%s/" % server.server_address[1]
    verified = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            for width, height in ((320, 740), (360, 850), (390, 850), (428, 926), (740, 390), (844, 390),
                                  (768, 850), (1360, 850)):
                phone = width <= 760
                mobile = pw.devices["Pixel 7"] if phone else {}
                ctx = browser.new_context(**{**mobile, "viewport": {"width": width, "height": height}},
                                          service_workers="block", reduced_motion="reduce")
                page = ctx.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.set_default_timeout(12000)
                for path in ROUTES:
                    page.goto(base + path, wait_until="domcontentloaded", timeout=25000)
                    page.locator("header.rl-global-header .axiovo-header-appearance").wait_for(state="attached")
                    page.locator("body.axiovo-reference-ui").wait_for()
                    page.locator(".axiovo-header-appearance .theme-toggle").wait_for(state="attached")
                    result = page.evaluate("""() => {
                      const qs = s => document.querySelector(s);
                      const rect = el => {const r=el?.getBoundingClientRect();return r&&{
                        x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height
                      }};
                      const box = s => rect(qs(s));
                      const nav=qs('.rl-nav');
                      return {
                        settings:box('.axiovo-header-appearance .rl-settings-link'),
                        theme:box('.axiovo-header-appearance .theme-toggle'),
                        logo:box('.rl-logo'),
                        back:box('.axiovo-back-button'),
                        home:box('.axiovo-home-link'),
                        navigation:box('.rl-nav'),
                        overflow:document.documentElement.scrollWidth - window.innerWidth,
                        links:[...nav.querySelectorAll('a')].map(a=>({
                          ...rect(a),label:a.textContent,overflow:a.scrollWidth-a.clientWidth
                        })),
                        navOverflow:nav.scrollWidth-nav.clientWidth,
                        header:box('header.rl-global-header')
                      };
                    }""")
                    # The shared navigation supplies the only desktop Home
                    # action on inner pages. Home itself needs no redundant
                    # header Home button.
                    if not phone:
                        assert page.locator("header .ax-header-home").count() == 0, (width,path,"Duplicate injected Home")
                        expected_home = 0 if path in ("", "index.html") else 1
                        assert page.locator("header .axiovo-home-link").count() == expected_home, (width,path,"Incorrect Home link count")
                    links=result["links"]
                    assert tuple(link["label"] for link in links)==FEATURES,(width,path,"Incorrect navigation labels",result)
                    assert result["overflow"]<=7,(width,path,"Horizontal overflow",result)
                    if phone:
                        # Five native navigation links now form the bottom app bar.
                        nav=result["navigation"]
                        assert nav and nav["x"]<=2 and nav["right"]>=width-2,(width,path,"Bottom bar not full width",result)
                        assert nav["y"]>=height-100 and nav["bottom"]<=height+3,(width,path,"Bottom bar not anchored",result)
                        assert result["header"]["height"]<=90,(width,path,"Mobile topbar too tall",result)
                        assert all(x["width"]>=44 and x["height"]>=44 for x in links),(width,path,"Bottom navigation touch target",result)
                        assert all(abs(x["y"]-links[0]["y"])<=2 for x in links),(width,path,"Bottom links not aligned",result)
                        assert page.locator(".ax-mobile-menu summary").is_visible(),(width,path,"More menu missing")
                        if width==390 and path=="desk.html":
                            page.locator(".ax-mobile-menu summary").click()
                            assert page.locator(".ax-menu-panel a[href='./profiles.html']").is_visible()
                            page.locator(".ax-mobile-menu summary").click()
                    else:
                        # A real desktop workspace sidebar replaces the old horizontal nav.
                        assert page.locator(".ax-sidebar").is_visible(),(width,path,"Desktop sidebar missing")
                        nav=result["navigation"]
                        assert nav and nav["x"]<=16 and nav["right"]<width/2,(width,path,"Sidebar nav moved out",result)
                        assert all(x["height"]>=44 for x in links),(width,path,"Desktop nav touch targets",result)
                        assert all(links[i+1]["y"]>links[i]["y"] for i in range(4)),(width,path,"Sidebar links out of order",result)
                        assert page.locator(".axiovo-header-appearance .theme-toggle").is_visible()
                        assert page.locator(".ax-header-search").is_visible()
                    if width<=428:
                        check_phone_content(page,path,width)
                    if width in (390,1360) and path in ("","desk.html","copilot.html"):
                        bot=page.locator("#axiovo-robot .robot-mascot")
                        bot.wait_for(state="visible",timeout=15000)
                        assert bot.locator("svg").count() == 1, "Inline SVG mascot must be present"
                        assert page.locator("#axiovo-robot .robot-fab").is_visible()
                        assert page.locator("#axiovo-robot .robot-help-label").is_visible()
                        if phone:
                            robot_geometry=page.evaluate("""() => {
                              const box=s=>document.querySelector(s).getBoundingClientRect();
                              const bot=box('#axiovo-robot .robot-fab');
                              const bar=box('header.rl-global-header nav.rl-nav');
                              return {bottom:bot.bottom,top:bar.top};
                            }""")
                            assert robot_geometry["bottom"] < robot_geometry["top"],(
                                width,path,"Assistant covers bottom navigation",robot_geometry)
                        if path=="":
                            page.locator("#axiovo-robot .robot-fab").click()
                            # English-only speech: no language selector should be displayed.
                            assert page.locator("#axiovo-robot-language").count() == 0
                            assert "Need help" in page.locator(".robot-help-label").inner_text()
                            assert page.locator("#axiovo-robot .robot-voice-settings select").count() == 1
                            page.get_by_role("button",name="Close robot help").click()
                    if not path:
                        # Both modes must share one stage below their own
                        # controls, not jump above/below when toggled.
                        stage=page.locator("#axiovo-tour-stage")
                        stage.wait_for(state="visible")
                        page.locator(".ax-home-guide").wait_for(state="attached")
                        assert page.evaluate("""() => {
                          const tabs=document.querySelector(".axiovo-tour-mode-switch");
                          const stage=document.querySelector("#axiovo-tour-stage");
                          return tabs?.nextElementSibling===stage &&
                            ["axiovo-home-video","axiovo-tour"].every(id=>stage.contains(document.getElementById(id))) &&
                            stage.contains(document.querySelector(".ax-home-guide"));
                        }"""),(width,"Video and interactive guide do not share the same stage")
                        page.locator("#axiovo-tour-show-guide").click()
                        assert stage.get_attribute("data-mode")=="guide"
                        assert page.locator("#axiovo-tour").is_visible()
                        assert page.locator("#axiovo-home-video").is_hidden()
                        assert page.locator(".ax-home-guide").is_hidden()
                        assert page.locator("#axiovo-tour-progress button").count()==10
                        page.locator("#axiovo-tour-show-video").click()
                        assert stage.get_attribute("data-mode")=="video"
                        assert page.locator("#axiovo-home-video").is_visible()
                        assert page.locator("#axiovo-tour").is_hidden()
                        assert page.locator(".ax-home-guide").is_visible()
                        # The unified hero has a dark gradient, and the name
                        # meaning is inline text rather than a separate panel.
                        # Compare real computed text colors against the darkest
                        # specified hero background; don't assume a legacy div.
                        contrast=page.locator(".axiovo-name-line").evaluate("""node=>{
                          const rgb=x=>{
                            const m=x.match(/[\\d.]+/g);
                            return m?m.slice(0,3).map(Number):[0,0,0];
                          };
                          const luminance=x=>{
                            const a=rgb(x).map(v=>{
                              const c=v/255;
                              return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
                            });
                            return .2126*a[0]+.7152*a[1]+.0722*a[2];
                          };
                          const background="rgb(11, 33, 57)";
                          const ratio=c=>(Math.max(luminance(background),luminance(c))+.05)/
                             (Math.min(luminance(background),luminance(c))+.05);
                          return {
                            body:ratio(getComputedStyle(node).color),
                            strong:ratio(getComputedStyle(node.querySelector("strong")).color),
                            title:ratio(getComputedStyle(document.querySelector("#welcome-title")).color)
                          };
                        }""")
                        assert min(contrast.values())>=4.5,(width,"Unified Axiovo intro text illegible",contrast)
                        # The icon-first CTA labels must remain readable in light and dark themes.
                        cta_contrast=page.evaluate("""() => {
                          const lum=v=>{
                            const nums=v.match(/[\\d.]+/g).slice(0,3).map(Number).map(x=>{
                              const c=x/255;
                              return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
                            });
                            return .2126*nums[0]+.7152*nums[1]+.0722*nums[2];
                          };
                          return [...document.querySelectorAll(".axiovo-welcome-actions .axiovo-cta")].map(a=>{
                            const computed=getComputedStyle(a);
                            const title=a.querySelector("strong"),helper=a.querySelector("small");
                            const contrast=node=>{
                              const foreground=lum(getComputedStyle(node).color),background=lum(computed.backgroundColor);
                              return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
                            };
                            return {label:title.textContent,ratio:contrast(title),help:contrast(helper),
                              icons:a.querySelectorAll("svg").length,visible:a.getBoundingClientRect().width>0};
                          });
                        }""")
                        assert len(cta_contrast)==3,(width,"Homepage start actions missing",cta_contrast)
                        assert [x["label"] for x in cta_contrast]==["Search papers","Explore archives","Install Axiovo"],(width,"Homepage actions changed order",cta_contrast)
                        assert all(x["ratio"]>=4.5 and x["help"]>=4.5 and x["icons"]==1 and x["visible"]
                                   for x in cta_contrast),(width,"CTA contrast or icon regression",cta_contrast)
                        if width<=390:
                            geometry=page.evaluate("""() => {
                              const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();
                                return {top:r.top,bottom:r.bottom,height:r.height,width:r.width}};
                              return {
                                copy:rect(".axiovo-welcome-copy"),
                                actions:rect(".axiovo-welcome-actions"),
                                tutorial:rect(".axiovo-welcome-media"),
                                header:rect(".axiovo-welcome-header"),
                                primary:rect(".axiovo-cta-primary"),
                                secondary:rect(".axiovo-cta-outline"),
                              };
                            }""")
                            gap=geometry["actions"]["top"]-geometry["copy"]["bottom"]
                            assert 0<=gap<=45,(width,"Unexpected blank space before mobile homepage buttons",gap,geometry)
                            assert geometry["copy"]["height"]<430,(width,"Mobile copy retains desktop minimum height",geometry)
                            assert geometry["header"]["height"]<700,(width,"Welcome intro and installation controls are too tall on small phones",geometry)
                            assert geometry["tutorial"]["top"]>=geometry["actions"]["bottom"],(width,"Tutorial overlaps buttons",geometry)
                            assert abs(geometry["primary"]["top"]-geometry["secondary"]["top"])<=3,(width,"Mobile CTAs not aligned",geometry)

                    verified.append((width,path or "home"))
                assert not errors, (width, height, errors)
                if width in (320, 428, 740, 844):
                    ctx.close()
                    continue
                page.goto(base,wait_until="domcontentloaded")
                page.locator(".axiovo-archive-card").first.wait_for()
                assert page.locator(".axiovo-archive-card").count()==4
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
                    (page.locator(".rl-nav a:first-child") if phone else page.locator(".axiovo-home-link")).click()
                    page.wait_for_url(lambda url: urlsplit(url).path.endswith("/index.html"))
                # Regression: returning from My Feed must show the top of Home,
                # not a restored anchor at the archive cards below the video.
                page.goto(base+"index.html#axiovo-archive-title",wait_until="domcontentloaded")
                page.locator("a[href='./feed.html']").first.click()
                page.wait_for_url(lambda url: urlsplit(url).path.endswith("/feed.html"))
                history_length = page.evaluate("history.length")
                (page.go_back(wait_until="domcontentloaded") if phone else page.locator(".axiovo-back-button").click())
                page.wait_for_url(lambda url: urlsplit(url).path.endswith("/index.html"))
                page.locator("#axiovo-home-video").wait_for()
                assert page.locator("#axiovo-tour-show-video").is_visible()
                assert not page.locator("#axiovo-home-video").is_hidden()
                assert page.locator("#axiovo-tour").is_hidden()
                assert page.evaluate("location.hash")=="" , "Back must not restore archive fragment"
                assert page.evaluate("history.length") == history_length, "Back must reuse the Home entry"
                page.go_forward(wait_until="domcontentloaded")
                assert page.url.endswith("/feed.html"), "Browser Forward must return to My Feed"
                page.go_back(wait_until="domcontentloaded")
                page.wait_for_function("window.scrollY<5",timeout=5000)
                page.locator("#axiovo-tour-show-guide").click()
                assert page.locator("#axiovo-home-video").is_hidden()
                assert page.locator("#axiovo-tour").is_visible()
                page.locator("#axiovo-tour-show-video").click()
                assert page.locator("#axiovo-home-video").is_visible()
                assert page.locator("#axiovo-tour").is_hidden()
                page.goto(base+"feed.html",wait_until="domcontentloaded")
                if phone:
                    page.locator(".ax-mobile-menu summary").click()
                    page.locator('.ax-menu-panel a[href="./index.html?axiovo_return=1"]').click()
                else:
                    page.locator(".axiovo-home-link").click()
                page.wait_for_url(lambda url: urlsplit(url).path.endswith("/index.html"))
                assert page.locator("#axiovo-home-video").is_visible()
                assert page.evaluate("location.hash")=="" , "Home must land at the start"
                assert page.evaluate("new URLSearchParams(location.search).has('axiovo_return')")
                page.wait_for_function("window.scrollY<5",timeout=5000)
                assert page.locator("#axiovo-tour-show-video").get_attribute("aria-pressed")=="true"
                assert page.locator("#axiovo-home-video").is_visible()
                # A scroll restoration regression cannot pass merely because
                # the video still exists somewhere above the viewport.
                page.evaluate("window.scrollTo(0,document.body.scrollHeight)")
                page.goto(base+"feed.html",wait_until="domcontentloaded")
                if phone:
                    page.locator(".ax-mobile-menu summary").click()
                    page.locator('.ax-menu-panel a[href="./index.html?axiovo_return=1"]').click()
                else:
                    page.locator(".axiovo-home-link").click()
                page.wait_for_url(lambda url: urlsplit(url).path.endswith("/index.html"))
                page.wait_for_function("window.scrollY<5",timeout=5000)
                assert page.locator("#axiovo-home-video").is_visible()


                # A transient MP4 error must never silently swap the video
                # for the six-card guide, on either viewport.
                page.goto(base+"index.html?axiovo_return=1",wait_until="domcontentloaded")
                page.locator("#axiovo-home-video").wait_for()
                page.locator("#axiovo-home-video source").evaluate("el=>el.dispatchEvent(new Event('error'))")
                assert page.locator("#axiovo-home-video").is_visible(),(width,"Video hidden after media error")
                assert page.locator("#axiovo-tour").is_hidden(),(width,"Guide unexpectedly replaced video")
                assert page.locator("#axiovo-tour-show-video").get_attribute("aria-pressed")=="true"
                page.locator("#axiovo-tour-show-guide").click()
                assert page.locator("#axiovo-tour").is_visible()
                page.locator("#axiovo-tour-show-video").click()
                assert page.locator("#axiovo-home-video").is_visible()
                assert page.locator("#axiovo-tour").is_hidden()

                # Explore in the global header must not bypass the Home
                # tutorial by navigating directly to the archive-card anchor.
                page.goto(base+"feed.html",wait_until="domcontentloaded")
                page.locator(".rl-nav").get_by_role("link",name="Explore",exact=False).click()
                page.wait_for_url(lambda url: urlsplit(url).path.endswith("/index.html"))
                assert page.evaluate("location.hash")=="" , "Explore from Feed skipped the tutorial"
                assert page.locator("#axiovo-home-video").is_visible()
                assert page.locator("#axiovo-tour-show-video").get_attribute("aria-pressed")=="true"
                # Returning from a BFCache-restored interactive guide must
                # explicitly restore the tutorial video as the default.
                page.locator("#axiovo-tour-show-guide").click()
                page.locator(".rl-nav").get_by_role("link",name="My Feed",exact=False).click()
                page.wait_for_url(lambda url: urlsplit(url).path.endswith("/feed.html"))
                page.go_back(wait_until="domcontentloaded")
                assert page.locator("#axiovo-home-video").is_visible()
                assert page.locator("#axiovo-tour").is_hidden()
                assert page.locator("#axiovo-tour-show-video").get_attribute("aria-pressed")=="true"

                if width==390:
                    # A user in India should see the latest arXiv release under
                    # its verified US Eastern announcement date, not the UTC
                    # first-submission shard of the previous calendar day.
                    page.goto(base+"arxiv.html?announced=latest",wait_until="domcontentloaded")
                    page.wait_for_function("""() => document.querySelector('#archive-sync-status')
                      ?.textContent.includes('Official arXiv ')""",timeout=24000)
                    assert page.locator("#archive-announced").count()==1
                    assert page.locator(".ex-paper").count()>0, "Latest announced arXiv records missing"
                    assert "all arXiv categories" in page.locator("#archive-scope-label").inner_text()
                    first=page.locator(".ex-paper").first
                    assert "Announced" in first.locator(".rd-small").first.inner_text()
                    subject=page.get_by_role("combobox",name="Archive subject",exact=True)
                    subject.fill("quant-ph")
                    page.get_by_role("option",name="Quantum Physics · quant-ph",exact=True).click()
                    assert "Quantum Physics" in page.locator("#archive-scope-label").inner_text()
                    assert "Official arXiv " in page.locator("#archive-sync-status").inner_text()
                    page.locator("#archive-latest").click()
                    page.wait_for_function("""() => !document.querySelector('#archive-sync-status')
                      ?.textContent.includes('Official arXiv ')""",timeout=24000)
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
                    page.route("**/data/eprint.json",
                        lambda route: route.fulfill(status=200,content_type="application/json",
                            body=json.dumps({"source":"eprint","papers":[
                                {"id":"2026/1234","title":"Public key signature protocols"}]})))
                    attempted=[]
                    providers={
                        "api.openalex.org": {"results":[]},
                        "api.datacite.org": {"data":[],"meta":{"total":0},"links":{}},
                    }
                    def empty_public_lookup(route):
                        host=urlsplit(route.request.url).hostname
                        attempted.append(host)
                        route.fulfill(status=200,content_type="application/json",
                            headers={"Access-Control-Allow-Origin":"*"},
                            body=json.dumps(providers[host]))
                    for host in providers:
                        page.route(f"https://{host}/**",empty_public_lookup)
                    page.reload(wait_until="domcontentloaded")
                    # The Research Assistant can refresh its status after
                    # IACR/OAI enrichment. Assert the actual verified fixture
                    # has entered the picker, not a transient status string.
                    page.wait_for_function("""() =>
                        [...document.querySelectorAll('#paper-picker option')]
                          .some(option => option.value === '2611.11003')
                    """,timeout=20000)
                    page.locator(".assistant-advanced").first.evaluate("el=>el.open=true")
                    page.locator("#retrieval-scope").select_option("local")
                    page.locator("#question").fill("Why should we study macroscopic quantumness?")
                    page.locator("#ask").click()
                    page.wait_for_function("document.querySelector('#ask').disabled===false && document.querySelector('#conversation .message.assistant')",timeout=15000)
                    page.wait_for_function("document.querySelectorAll('#evidence-list .source').length===1")
                    assert "Experimental witnesses of macroscopic quantumness" in page.locator("#conversation").inner_text()
                    assert "[1]" in page.locator("#conversation").inner_text()
                    assert "Macroscopic energy gaps" not in page.locator("#evidence-list").inner_text()
                    assert page.locator("#evidence-list .assistant-source-details").count()==1
                    assert page.locator("#evidence-list .assistant-source-details").first.get_attribute("open") is None
                    assert not attempted,("Public providers queried despite a relevant indexed match",attempted)
                    page.locator("#question").fill("Microbial resistance in tropical river sediments")
                    page.locator("#ask").click()
                    page.wait_for_function("document.querySelector('#retrieval-status').textContent.includes('0 relevant sources')")
                    assert set(attempted)==set(providers),("No public fallback after an indexed miss",attempted)
                    # Exact-ID fallback is tested with deterministic offline
                    # provider responses. Slow public APIs must not decide if
                    # our original-paper link appears in the interface.
                    unavailable_exact=lambda route:route.fulfill(status=404,content_type="application/json",body='{}')
                    page.route("https://api.semanticscholar.org/graph/v1/paper/**",unavailable_exact)
                    page.route("https://api.datacite.org/dois/**",unavailable_exact)
                    for requested in ("2611.11003v9","2611.11999"):
                        page.goto(base+"copilot.html?id="+requested,wait_until="domcontentloaded")
                        assert page.locator("#question").input_value()==requested
                        page.locator("#ask").click()
                        original=page.locator("#retrieval-status a[data-original-source]")
                        original.wait_for(timeout=15000)
                        assert original.get_attribute("href")=="https://arxiv.org/abs/"+requested
                        assert page.locator("#evidence-list .source").count()==0
                        # Asynchronously loaded metadata can change the
                        # status message, never remove the source action.
                        page.wait_for_timeout(150)
                        assert original.count()==1
                    page.unroute("https://api.semanticscholar.org/graph/v1/paper/**",unavailable_exact)
                    page.unroute("https://api.datacite.org/dois/**",unavailable_exact)
                    for host in providers:
                        page.unroute(f"https://{host}/**",empty_public_lookup)
                    page.unroute("**/data/eprint.json")
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
                (page.locator(".ax-mobile-menu summary").click() if phone else None)
                (page.locator(".ax-menu-theme").click() if phone else page.locator(".axiovo-header-appearance .theme-toggle").click())
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
            card=page.locator("#library-list article").filter(
                has=page.get_by_role("link",name="Synthetic pinned paper for the offline Library"))
            notes=card.locator("summary").filter(has_text="Notes and organization")
            assert notes.bounding_box()["height"]>=44
            notes.click()
            note=card.get_by_role("textbox",name="Private note for Synthetic pinned paper for the offline Library")
            note.fill("Verify the exact paper version offline.")
            note.press("Tab")
            page.reload(wait_until="domcontentloaded")
            notes.click()
            assert note.input_value()=="Verify the exact paper version offline."
            context.close()
            browser.close()
    finally:
        server.shutdown()
    print("PASS: %d route/viewport combinations, archive clicks, Research Desk, Library, Assistant, persisted theme." % len(verified),flush=True)

if __name__ == "__main__":
    main()
