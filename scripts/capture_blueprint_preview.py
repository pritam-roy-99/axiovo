#!/usr/bin/env python3
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
import functools,json
root=Path(__file__).resolve().parents[1]/"docs"
out=Path("ui-preview");out.mkdir(exist_ok=True)
server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
urls=["index.html","arxiv.html","desk.html","feed.html","workspace.html","copilot.html","prooflab.html"]
records=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=["--no-sandbox"])
  for mode,w,h in [("desktop",1440,900),("android",390,844)]:
   context=browser.new_context(viewport={"width":w,"height":h},device_scale_factor=1,reduced_motion="reduce",service_workers="block")
   for path in urls:
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda x:errors.append(str(x)))
    try:
     page.goto("http://127.0.0.1:%d/%s"%(server.server_port,path),wait_until="domcontentloaded",timeout=25000)
     page.wait_for_selector("body.axiovo-reference-ui",timeout=10000)
     page.wait_for_timeout(1300)
     filename=out/(mode+"_"+path.replace(".html","")+".png")
     page.screenshot(path=str(filename),full_page=False,animations="disabled")
     bounds=page.evaluate("""() => {
      const box=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
      return {header:box('header.rl-global-header'),nav:box('.rl-nav'),sidebar:box('.ax-sidebar'),
      hero:box('.axiovo-welcome-header'),video:box('#axiovo-home-video'),guide:box('.ax-home-guide'),
      overflow:document.documentElement.scrollWidth-innerWidth};
     }""")
     records.append(dict(mode=mode,page=path,errors=errors,bounds=bounds))
     print(mode,path,bounds,errors,flush=True)
    except Exception as exc:records.append(dict(mode=mode,page=path,error=str(exc)))
    finally:page.close()
   context.close()
  browser.close()
finally:server.shutdown()
(out/"manifest.json").write_text(json.dumps(records,indent=2))
