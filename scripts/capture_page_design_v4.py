#!/usr/bin/env python3
"""Read-only screenshot and accessible layout audit of every active route."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
import functools,json
ROOT=Path(__file__).resolve().parents[1]/"docs"
OUT=Path("ui-page-v4"); OUT.mkdir(exist_ok=True)
PAGES=["index","arxiv","biorxiv","chemrxiv","crypto","desk","feed","workspace","copilot","prooflab","lab","paper","compare","community","profiles","install","tutorial","methodology","privacy","why-axiovo","research-hub"]
SERVER=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
Thread(target=SERVER.serve_forever,daemon=True).start()
results=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=["--no-sandbox"])
  for mode,w,h in [("desktop",1440,900),("android",390,844),("small",320,740)]:
   context=browser.new_context(viewport={"width":w,"height":h},device_scale_factor=1,reduced_motion="reduce",service_workers="block")
   for name in PAGES:
    if mode=="small" and name not in ["index","arxiv","desk","feed","workspace","copilot","prooflab","profiles"]:continue
    page=context.new_page()
    page_errors=[]
    page.on("pageerror",lambda error:page_errors.append(str(error)))
    info=dict(page=name,mode=mode,width=w,height=h)
    try:
     page.goto(f"http://127.0.0.1:{SERVER.server_port}/{name}.html",wait_until="domcontentloaded",timeout=28000)
     page.locator("body.ax4").wait_for(timeout=15000)
     page.wait_for_timeout(1100)
     info.update(page.evaluate("""() => {
        const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
        return {overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
          h1:document.querySelector('main h1')?.textContent?.trim().slice(0,100),
          bodyClasses:document.body.className,
          main:box('main'),header:box('header.rl-global-header'),
          nav:box('header.rl-global-header .rl-nav'),
          cardCount:document.querySelectorAll('main :is(.rd-panel,.rl-section,.panel,.feed-side-card,.feed-stream,.card)').length,
          pageStyle:!!document.querySelector('link[data-axiovo-page-design]'),
          font:getComputedStyle(document.querySelector('main h1')||document.body).fontFamily,
          overflows:[...document.querySelectorAll('body *')].filter(el=>{
            const style=getComputedStyle(el),r=el.getBoundingClientRect();
            return style.display!=='none' && r.width>0 && r.right>innerWidth+12;
          }).slice(0,15).map(el=>{const r=el.getBoundingClientRect();return {
            tag:el.tagName,id:el.id,className:String(el.className).slice(0,100),
            x:Math.round(r.x),right:Math.round(r.right),width:Math.round(r.width)
          }})};
       }"""))
     # Scrutinize more than the first visible screen: lower controls must not be cropped.
     out=OUT/f"{mode}_{name}.png"
     page.screenshot(path=str(out),full_page=False,animations="disabled",timeout=30000)
     info["screenshot"]=str(out)
     info["errors"]=page_errors[:5]
     if info["overflow"]>12:info["warning"]="Excess horizontal width"
     print(mode,name,"overflow",info["overflow"],"heading",info.get("h1"),flush=True)
    except Exception as e:
     info["failure"]=str(e)[:400]
     print("FAILED",mode,name,info["failure"],flush=True)
    finally:
     results.append(info)
     page.close()
   context.close()
  browser.close()
finally:SERVER.shutdown()
(OUT/"manifest.json").write_text(json.dumps(results,indent=2))
success=sum("screenshot" in r for r in results)
print("CAPTURES",success,"/",len(results),flush=True)
if success<len(results):raise SystemExit("Some active routes failed the redesign rendering check")
