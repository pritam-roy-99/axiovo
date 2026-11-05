#!/usr/bin/env python3
"""Record an offline, reproducible Axiovo how-to tutorial from its actual pages.

The video captures a real Chromium session with the current Axiovo interface.
No stock slides, invented screenshots, third-party video services, or AI claims.
Run after installing playwright/Chromium, Pillow, ffmpeg and espeak-ng.
"""
from __future__ import annotations

import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import subprocess
import tempfile
import wave

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/"docs"
OUT=DOCS/"assets"
W,H=960,540

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def font(size,bold=False):
    name="DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/"+name,size)

def focus(page,selector):
    try:
        el=page.locator(selector).first
        if not el.count():return None
        el.evaluate("""el=>{el.style.outline='4px solid #16c8dd';el.style.outlineOffset='4px'}""")
        return el.bounding_box()
    except Exception:
        return None

def stamp(png,title,instruction,number,target=None):
    pic=Image.open(png).convert("RGB").resize((W,H))
    draw=ImageDraw.Draw(pic,"RGBA")
    draw.rounded_rectangle((10,12,440,51),radius=11,fill=(9,30,51,235))
    draw.text((23,22),f"STEP {number:02}  {title}",font=font(19,True),fill=(242,251,255,255))
    draw.rectangle((0,426,W,H),fill=(7,23,42,237))
    draw.text((26,443),instruction,font=font(20,True),fill=(245,250,255,255))
    draw.text((26,488),"AXIOVO  |  HOW TO USE THE RESEARCH PLATFORM",font=font(13),fill=(160,211,236,255))
    if target:
        x=target["x"]*W/1280;y=target["y"]*H/720
        x2=(target["x"]+target["width"])*W/1280
        y2=(target["y"]+target["height"])*H/720
        if y2<425:
            draw.rounded_rectangle((x-5,y-5,x2+5,y2+5),radius=9,outline=(31,232,222,255),width=5)
    pic.save(png)

def cue(t):
    ms=round(t*1000)
    return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}"

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(DOCS)))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f"http://127.0.0.1:{server.server_address[1]}/"
    steps=[
        ("Welcome to Axiovo","Choose an archive or open the Research Desk.",
         "Welcome to Axiovo. On the homepage, choose the archive you want to explore, or open Research Desk to search all three preprint servers together.",
         "",".axiovo-archive-grid",None),
        ("Explore arXiv","Pick a subject and then a research subtopic.",
         "To explore arXiv, open its dedicated Discover page. Select an official subject, then narrow the research topic and subtopic. Axiovo keeps each archive separate.",
         "arxiv.html?category=math-ph&topic=quantum-many-body-theory&subtopic=lieb-robinson-bounds","#archive-subfield",None),
        ("Find a paper","Enter a title, research term, DOI or arXiv ID.",
         "Use the paper search box for keywords, an exact paper title, or an arXiv identifier. Read the original title and abstract and use the source link to verify the record.",
         "arxiv.html?category=math-ph&topic=quantum-many-body-theory&subtopic=lieb-robinson-bounds","#archive-query",("archive-query","Lieb-Robinson bounds")),
        ("Research Desk","Run one query across arXiv, bioRxiv and ChemRxiv.",
         "In Research Desk, enter your research question and choose which of the three archives to search. Results stay grouped by their original source.",
         "desk.html","#rd-query",("rd-query","graph neural networks")),
        ("Filter precisely","Expand Author, dates and sorting.",
         "Expand Author, dates and sorting. Enter a date range or an author to narrow your search. Verify whether the displayed records are a complete date batch or only an available source snapshot.",
         "desk.html","#rd-advanced",("open","rd-advanced")),
        ("Save and organize","Open Library to revisit papers and authors.",
         "Save useful papers to My Library. From the Library you can filter saved records, create collections, keep reading notes and follow authors for later reading.",
         "workspace.html","#library-list",None),
        ("Research Assistant","Ask a research question and check the evidence.",
         "Open Research Assistant to find related literature or inspect the evidence for a paper. Enter a precise question, then check the original cited source before trusting any conclusion.",
         "copilot.html","#question",("question","What are Lieb-Robinson bounds?")),
        ("Customize Axiovo","Use Settings and Night mode from any page.",
         "Finally, use Settings for your preferences and the Night button for dark appearance. Your personal saved data is stored on this device unless you configure a separate synchronization service.",
         "profiles.html",".axiovo-header-appearance",None),
    ]
    try:
        with tempfile.TemporaryDirectory() as temp:
            work=Path(temp)
            video_entries=[]
            audio_entries=[]
            captions=["WEBVTT",""]
            elapsed=0.0
            with sync_playwright() as p:
                browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
                context=browser.new_context(viewport={"width":1280,"height":720},device_scale_factor=1,service_workers="block",reduced_motion="reduce")
                context.route("https://**",lambda route:route.abort())
                page=context.new_page()
                for index,(title,hint,narration,path,selector,action) in enumerate(steps,1):
                    page.goto(base+path,wait_until="domcontentloaded",timeout=25000)
                    if action:
                        if action[0]=="open":
                            page.locator("#"+action[1]).evaluate("el=>el.open=true")
                        else:
                            page.locator("#"+action[0]).fill(action[1])
                            if path.startswith("arxiv.html"):
                                page.locator("#archive-search-form").evaluate("form=>form.requestSubmit()")
                    page.wait_for_timeout(550)
                    target=focus(page,selector)
                    shot=work/f"{index:02d}.png"
                    page.screenshot(path=str(shot))
                    stamp(shot,title,hint,index,target)
                    sound=work/f"{index:02d}.wav"
                    subprocess.run(["espeak-ng","-s","140","-w",str(sound),narration],check=True)
                    with wave.open(str(sound),"rb") as file:
                        duration=file.getnframes()/file.getframerate()+1.2
                    video_entries.extend([f"file '{shot.as_posix()}'",f"duration {duration:.3f}"])
                    audio_entries.append(f"file '{sound.as_posix()}'")
                    captions.extend([f"{cue(elapsed)} --> {cue(elapsed+duration-0.2)}",narration,""])
                    elapsed+=duration
                browser.close()
            video_entries.append(f"file '{shot.as_posix()}'")
            video_list=work/"frames.txt";video_list.write_text("\n".join(video_entries)+"\n")
            audio_list=work/"audio.txt";audio_list.write_text("\n".join(audio_entries)+"\n")
            output=OUT/"axiovo-tour.mp4"
            subprocess.run([
                "ffmpeg","-y","-hide_banner","-loglevel","error",
                "-f","concat","-safe","0","-i",str(video_list),
                "-f","concat","-safe","0","-i",str(audio_list),
                "-map","0:v:0","-map","1:a:0",
                "-c:v","libx264","-preset","veryfast","-crf","27",
                "-pix_fmt","yuv420p","-r","12","-c:a","aac","-b:a","96k",
                "-af","apad","-shortest","-movflags","+faststart",str(output)
            ],check=True)
            (OUT/"axiovo-tour.vtt").write_text("\n".join(captions)+"\n",encoding="utf-8")
            print(f"Axiovo tutorial recorded from actual pages: {len(steps)} steps, ~{elapsed:.0f} seconds, {output.stat().st_size} bytes",flush=True)
    finally:
        server.shutdown()

if __name__=="__main__":
    main()
