#!/usr/bin/env python3
"""Capture PUBLIC, unmodified Axiovo pages on desktop and Android-sized Chromium.
No login, credentials, local device storage, or repository publishing.
"""
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
from playwright.sync_api import sync_playwright
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader

ROOT = Path("ui_capture")
SHOTS = ROOT / "screenshots"
BASE = "https://pritam-roy-99.github.io/axiovo/"
ROUTES = [
 ("Home", "index.html"),
 ("arXiv archive", "arxiv.html"),
 ("bioRxiv archive", "biorxiv.html"),
 ("ChemRxiv archive", "chemrxiv.html"),
 ("Cryptology ePrint", "crypto.html"),
 ("Research Desk", "desk.html"),
 ("My Feed", "feed.html"),
 ("Library", "workspace.html"),
 ("Research Assistant", "copilot.html"),
 ("ProofLab", "prooflab.html"),
 ("Research Tools", "lab.html"),
 ("Paper reader", "paper.html"),
 ("Compare papers", "compare.html"),
 ("Community", "community.html"),
 ("Settings", "profiles.html"),
 ("Installation guide", "install.html"),
 ("Tutorial", "tutorial.html"),
 ("Methodology", "methodology.html"),
 ("Privacy", "privacy.html"),
 ("Why Axiovo", "why-axiovo.html"),
 ("Discover legacy redirect", "discover.html"),
 ("Search legacy redirect", "search.html"),
 ("Fields legacy redirect", "fields.html"),
 ("AI legacy redirect", "ai.html"),
]
VIEWPORTS = [
 ("Desktop", 1440, 900, False, 5),
 ("Android", 390, 844, True, 7),
]
def safe(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")

def write_screen_pdf(records):
    path=ROOT/"Axiovo_Actual_Live_UI_All_Pages.pdf"
    pdf=canvas.Canvas(str(path),pageCompression=1)
    moment=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    page_count=0
    for entry in records:
        is_phone=entry["mode"]=="Android"
        W,H=(530,825) if is_phone else (1190,790)
        for k,screenshot in enumerate(entry["screenshots"]):
            pdf.setPageSize((W,H))
            pdf.setFillColor(HexColor("#F4F8FC")); pdf.rect(0,0,W,H,stroke=0,fill=1)
            pdf.setFillColor(HexColor("#102D49"));pdf.rect(0,H-67,W,67,stroke=0,fill=1)
            pdf.setFillColor(HexColor("#FFFFFF"));pdf.setFont("Helvetica-Bold",15 if is_phone else 19)
            label=entry["label"]+" | "+entry["mode"]+" | Scroll "+str(k+1)+"/"+str(len(entry["screenshots"]))
            pdf.drawString(21,H-29,label[:90])
            pdf.setFont("Helvetica",9);pdf.drawString(21,H-47,"Actual public-site browser capture | "+moment)
            if entry["redirect"]:
                pdf.setFillColor(HexColor("#B85C0B"));pdf.setFont("Helvetica-Bold",10)
                pdf.drawString(21,H-81,"This legacy URL redirected to a different page.")
            px,py,spacew,spaceh=16,47,W-32,H-142
            from PIL import Image
            with Image.open(screenshot) as im: iw,ih=im.size
            scale=min(spacew/iw,spaceh/ih)
            dw,dh=iw*scale,ih*scale
            pdf.drawImage(ImageReader(screenshot),(W-dw)/2,py+(spaceh-dh)/2,dw,dh,mask="auto")
            pdf.setFillColor(HexColor("#3C586D"));pdf.setFont("Helvetica",8)
            pdf.drawString(21,31,("Requested: "+entry["route"]+" | Loaded: "+entry["loaded_url"])[:180])
            pdf.drawString(21,18,"Screenshots preserve current public UI. Paper content and transient network results may change.")
            pdf.showPage();page_count+=1
        if not entry["screenshots"]:
            pdf.setPageSize((1190,790))
            pdf.setFillColor(HexColor("#FFFFFF"));pdf.rect(0,0,1190,790,stroke=0,fill=1)
            pdf.setFillColor(HexColor("#102D49"));pdf.setFont("Helvetica-Bold",23)
            pdf.drawString(40,700,entry["label"]+" | "+entry["mode"])
            pdf.setFillColor(HexColor("#A03B32"));pdf.setFont("Helvetica",14)
            pdf.drawString(40,655,"Capture could not be completed. No replacement UI was fabricated.")
            pdf.drawString(40,620,entry["error"][:170])
            pdf.showPage();page_count+=1
    pdf.setTitle("Axiovo exact public UI: all pages, desktop and Android")
    pdf.save()
    return str(path),page_count

def main():
    ROOT.mkdir(exist_ok=True);SHOTS.mkdir(exist_ok=True)
    entries=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--disable-dev-shm-usage"])
        for mode,w,h,mobile,max_segments in VIEWPORTS:
            context=browser.new_context(viewport={"width":w,"height":h},
                device_scale_factor=1,is_mobile=mobile,has_touch=mobile,
                reduced_motion="reduce",locale="en-US",
                service_workers="block")
            for idx,(label,route) in enumerate(ROUTES):
                page=context.new_page()
                requested=urljoin(BASE,route)
                result={"label":label,"route":route,"mode":mode,
                    "requested_url":requested,"loaded_url":requested,
                    "screenshots":[],"redirect":False,
                    "status":None,"title":"","error":"","document_height":None}
                try:
                    response=page.goto(requested,wait_until="domcontentloaded",timeout=45000)
                    page.wait_for_timeout(2300)
                    result["status"]=response.status if response else None
                    result["loaded_url"]=page.url
                    result["redirect"]=urlparse(page.url).path!=urlparse(requested).path
                    result["title"]=page.title()
                    height=page.evaluate("""() => Math.max(document.body.scrollHeight,
                        document.documentElement.scrollHeight)""")
                    result["document_height"]=height
                    # Screenshots scroll by almost one viewport, preserving context.
                    cap=min(max(height-h,0), (max_segments-1)*h)
                    offsets=list(range(0,int(cap)+1,h))
                    if not offsets: offsets=[0]
                    if offsets[-1]!=int(cap) and len(offsets)<max_segments: offsets.append(int(cap))
                    for part,off in enumerate(offsets):
                        page.evaluate("(v) => window.scrollTo(0,v)",off)
                        page.wait_for_timeout(180)
                        fn=SHOTS / ("%02d_%s_%s_%02d.png"%(idx+1,safe(label),mode.lower(),part+1))
                        page.screenshot(path=str(fn),full_page=False,animations="disabled",
                            timeout=25000)
                        result["screenshots"].append(str(fn))
                    print("CAPTURED",mode,label,len(result["screenshots"]),
                        "url",result["loaded_url"],"height",height,flush=True)
                except Exception as e:
                    result["error"]=str(e).replace("\n"," ")[:230]
                    print("FAILED",mode,label,result["error"],flush=True)
                finally:
                    entries.append(result)
                    page.close()
            context.close()
        browser.close()
    metadata=ROOT/"capture_manifest.json"
    metadata.write_text(json.dumps({"timestamp_utc":datetime.now(timezone.utc).isoformat(),
        "source":BASE,"entries":entries},indent=2),encoding="utf-8")
    pdf,pages=write_screen_pdf(entries)
    ok=sum(bool(x["screenshots"]) for x in entries)
    print("FINAL",pdf,pages,"PDF pages;",ok,"/",len(entries),"route/viewport captures",flush=True)
    if ok<40:
        raise SystemExit("Insufficient successful captures: "+str(ok))

if __name__=="__main__":
    main()
