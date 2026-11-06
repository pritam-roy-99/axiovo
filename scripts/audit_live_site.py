#!/usr/bin/env python3
"""Browser audit of the DEPLOYED Axiovo Pages site, not merely its source.
Run: python scripts/audit_live_site.py
The audit visits each main page, follows every local href discovered there,
tests archive selectors, and reports JavaScript, HTTP, and layout failures.
"""
from __future__ import annotations
import os
from urllib.parse import urljoin, urlsplit
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

BASE=os.environ.get("AXIOVO_BASE_URL","https://pritam-roy-99.github.io/axiovo/").rstrip("/")+"/"
PAGES=("","arxiv.html","biorxiv.html","chemrxiv.html","discover.html#discover",
       "discover.html#workspace","workspace.html","paper.html","compare.html",
       "copilot.html","desk.html","lab.html","profiles.html","community.html",
       "methodology.html","privacy.html","fields.html","search.html","ai.html")
failures=[]
visited=set()
def note(message):
    print(message,flush=True)
def check(page,path):
    url=urljoin(BASE,path)
    try:
        response=page.goto(url,wait_until="domcontentloaded",timeout=35000)
        page.wait_for_timeout(350)
        # Playwright returns None for same-document fragment navigation; that is
        # normal browser behavior, not HTTP 0 or a missing page.
        if response is None:
            if urlsplit(page.url)._replace(fragment="") != urlsplit(url)._replace(fragment=""):
                failures.append(f"Unexpected same-document navigation {url} -> {page.url}")
            status="same-document"
        else:
            status=response.status
            if status>=400:failures.append(f"HTTP {status} {url}")
        title=page.title()
        if not title:failures.append(f"Missing title {url}")
        if page.locator("body").count()==0:failures.append(f"Missing body {url}")
        width=page.evaluate("document.documentElement.scrollWidth-window.innerWidth")
        if width>8:failures.append(f"Horizontal overflow {path}: {width}px")
        if path in ("","arxiv.html","biorxiv.html","chemrxiv.html","workspace.html","copilot.html"):
            shell=page.evaluate("""() => {
              const logo=document.querySelector("header.rl-global-header .rl-logo-mark");
              const back=document.querySelector("header.rl-global-header .axiovo-back-button");
              const home=document.querySelector("header.rl-global-header .axiovo-home-link");
              const style=e=>e?getComputedStyle(e):null;
              return {
                logoBackground:style(logo)?.backgroundColor||"",
                logoSize:logo?.getBoundingClientRect().width||0,
                backBackground:style(back)?.backgroundColor||"",
                homeBackground:style(home)?.backgroundColor||"",
                backRadius:style(back)?.borderRadius||"",
                homeRadius:style(home)?.borderRadius||""
              }
            }""")
            if shell["logoSize"]<30 or shell["logoBackground"] in ("","rgba(0, 0, 0, 0)","transparent"):
                failures.append(f"Unstyled Axiovo logo {path}: {shell}")
            if path and (shell["backBackground"]!=shell["homeBackground"] or shell["backRadius"]!=shell["homeRadius"]):
                failures.append(f"Back and Home have inconsistent styles on {path}: {shell}")
        if path in ("arxiv.html","biorxiv.html","chemrxiv.html"):
            css=page.evaluate("""() => ({
                font:getComputedStyle(document.body).fontFamily,
                margin:getComputedStyle(document.body).marginLeft,
                header:getComputedStyle(document.querySelector('header')).backgroundColor,
                archive:document.querySelector('#archive-field')?.options?.length||0
            })""")
            if "serif" in css["font"].lower() and "sans-serif" not in css["font"].lower():
                failures.append(f"Archive browser-default serif font {path}: {css['font']}")
            if css["margin"]!="0px":
                failures.append(f"Archive body default margin {path}: {css['margin']}")
            if css["archive"]<2:failures.append(f"Archive taxonomy not initialized {path}")
        note(f"PAGE {path or 'home'} HTTP={status} title={title[:65]}")
        return True
    except Exception as exc:
        failures.append(f"Visit {path}: {str(exc)[:210]}")
        return False

def main():
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        page=browser.new_page(viewport={"width":1360,"height":900})
        page.set_default_timeout(12000)
        def on_error(error):
            msg=str(error)
            if any(x in msg.lower() for x in ("failed to fetch","networkerror","cors")):
                note("EXTERNAL NETWORK WARNING: "+msg[:140])
            else:failures.append("JS: "+msg[:210])
        page.on("pageerror",on_error)
        for path in PAGES:
            check(page,path)
        # The old combined Discover interface must never appear again.
        for old,new_suffix in (
            ("discover.html#discover","/axiovo/"),
            ("discover.html#workspace","/axiovo/workspace.html"),
            ("discover.html?archive=arxiv#discover","/axiovo/arxiv.html"),
            ("discover.html?archive=biorxiv#discover","/axiovo/biorxiv.html"),
            ("discover.html?archive=chemrxiv#discover","/axiovo/chemrxiv.html"),
        ):
            check(page,old)
            if urlsplit(page.url).path != new_suffix:
                failures.append(f"Legacy route {old} reached {page.url} instead of {new_suffix}")
            if page.locator("#discover-shell").count():
                failures.append(f"Legacy combined Discover UI still visible on {old}")
        if check(page,"workspace.html"):
            if page.locator("#library-list").count()!=1:
                failures.append("Standalone Library missing saved-paper interface")
            if page.locator("#quick-search").count()!=1:
                failures.append("Standalone Library missing research question search")
        # Crawl every first-party anchor reachable from the main navigation pages.
        targets=set()
        for path in ("","arxiv.html","biorxiv.html","chemrxiv.html",
                     "discover.html","workspace.html","copilot.html","desk.html","lab.html",
                     "profiles.html","paper.html","compare.html"):
            if not check(page,path):continue
            for href in page.locator('a[href]').evaluate_all("(els)=>els.map(a=>a.href)"):
                parts=urlsplit(href)
                if parts.scheme not in ("http","https"):continue
                if parts.netloc!=urlsplit(BASE).netloc:continue
                if not parts.path.startswith(urlsplit(BASE).path):continue
                if parts.path.endswith((".mp4",".vtt",".xml",".pdf",".json")):continue
                targets.add(href)
        for url in sorted(targets):
            if url in visited:continue
            visited.add(url)
            try:
                r=page.request.get(url.split("#",1)[0],timeout=20000)
                if r.status>=400:failures.append(f"BROKEN INTERNAL LINK HTTP {r.status} {url}")
                note(f"LINK {r.status} {url}")
            except Exception as exc:failures.append(f"BROKEN LINK {url} {str(exc)[:140]}")
        # Real click navigation from homepage to each independent archive.
        for src in ("arxiv","biorxiv","chemrxiv"):
            if not check(page,""):continue
            page.locator(f'[data-archive="{src}"]').click(timeout=12000)
            page.wait_for_url(f"**/{src}.html",timeout=12000)
            picker=page.get_by_role("combobox",name="Archive subject",exact=True)
            if picker.count()!=1:failures.append(f"Searchable archive subject missing on {src}")
            note("CLICK homepage -> "+src)
            details=page.locator(".ex-personal")
            if details.count():
                details.locator("summary").click()
                if not page.locator("#archive-custom").is_visible():
                    failures.append(f"Custom subfield editor still hidden on {src}")
            home=page.locator(".axiovo-home-link")
            if home.count():
                home.click()
                page.wait_for_url(lambda u: urlsplit(u).path.rstrip("/")==urlsplit(BASE).path.rstrip("/"),timeout=12000)
                note("CLICK "+src+" -> Home")
        # Verify homepage's actual video URL and playback metadata.
        if check(page,""):
            media=page.locator("video source").get_attribute("src")
            video=urljoin(BASE,media)
            try:
                r=page.request.get(video,timeout=35000)
                contenttype=r.headers.get("content-type","")
                if r.status!=200 or "video" not in contenttype:
                    failures.append(f"VIDEO HTTP {r.status} content-type {contenttype}: {video}")
                note(f"VIDEO status={r.status} type={contenttype}")
            except Exception as exc:failures.append(f"Video unavailable: {str(exc)[:180]}")
        browser.close()
    note(f"Audited {len(PAGES)} entry routes, {len(visited)} distinct local links and three archive round trips.")
    for error in failures:note("FAIL "+error)
    if failures:raise SystemExit(f"{len(failures)} deployed-site failures")
    note("PASS: deployed Axiovo navigation and asset audit.")

if __name__=="__main__":
    main()
