#!/usr/bin/env python3
"""Record an offline, reproducible Axiovo how-to tutorial from its actual pages.

The video captures a real Chromium session with the current Axiovo interface.
No stock slides, invented screenshots, third-party video services, or AI claims.
Run after installing playwright/Chromium, Pillow, ffmpeg and espeak-ng.
"""
from __future__ import annotations

import functools
import asyncio
import json
import textwrap
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
        el.scroll_into_view_if_needed(timeout=3000)
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
    for line,chunk in enumerate(textwrap.wrap(instruction,width=76)[:2]):
        draw.text((26,438+line*29),chunk,font=font(19,True),fill=(245,250,255,255))
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


def voice_text(value):
    """Pronunciation hints for technical words in spoken text only."""
    return (value.replace("Axiovo","Ax-ee-oh-voh")
      .replace("bioRxiv","bio archive").replace("ChemRxiv","chem archive")
      .replace("arXiv","archive").replace("DOI","D O I")
      .replace("Ollama","Oh llama").replace("Qwen","Q wen")
      .replace("Kimi","Kee mee").replace("OpenRouter","Open Router")
      .replace("WebGPU","Web G P U"))

async def neural_speech(text,path):
    import edge_tts
    speaker=edge_tts.Communicate(voice_text(text),voice="en-IN-NeerjaNeural",rate="-7%",pitch="+4Hz")
    await speaker.save(str(path))

def media_duration(path):
    return float(subprocess.check_output([
        "ffprobe","-v","error","-show_entries","format=duration",
        "-of","default=noprint_wrappers=1:nokey=1",str(path)
    ],text=True).strip())

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(DOCS)))
    Thread(target=server.serve_forever,daemon=True).start()
    base=f"http://127.0.0.1:{server.server_address[1]}/"
    # Every frame is captured from the real Axiovo HTML/CSS/JS, not a mockup.
    # Each scene points to a real page and a meaningful control or feature.
    steps=[
        ("Axiovo: From knowledge to discovery", "Connect your questions, original papers and evidence.", "Namaste, and welcome to Axiovo. Axiovo means from knowledge to discovery. It helps researchers connect questions with original papers and source evidence, then save and revisit the work that matters. Let me show you how.", "", ".axiovo-brand-meaning", None),
        ("Three preprint archives", "Select arXiv, bioRxiv or ChemRxiv.", "The homepage offers three independent preprint archives. Choose the one that matches your research discipline.", "", ".axiovo-archive-grid", None),
        ("arXiv subject directory", "Choose the official arXiv category.", "On arXiv Discover, first select an official subject category, such as mathematical physics.", "arxiv.html?category=math-ph", "#archive-field", None),
        ("Linked research topics", "Refine a subject to a topic and subtopic.", "Then refine your subject into a research topic and subtopic. The selected path controls the paper search.", "arxiv.html?category=math-ph&topic=quantum-many-body-theory&subtopic=lieb-robinson-bounds", "#archive-subfield", None),
        ("Search by paper title", "Type keywords, a title, DOI or arXiv ID.", "Use the search field to enter the exact title, an author, or an arXiv identifier. Results link to their original paper record.", "arxiv.html?category=math-ph&topic=quantum-many-body-theory&subtopic=lieb-robinson-bounds", "#archive-query", ("archive-query", "Lieb-Robinson bounds")),
        ("Date-aware search", "Use first-submission dates and verify completeness.", "Expand the advanced search settings. Specify a date or date range. Axiovo distinguishes verified complete date batches from partial source snapshots.", "arxiv.html", "#archive-advanced", ("open", "archive-advanced")),
        ("Cross-listed categories", "Filter arXiv primary and cross-listed records.", "For arXiv, the cross-list option can narrow results to records appearing in more than one subject category.", "arxiv.html", "#archive-crosslisted", ("open", "archive-advanced")),
        ("Find an author", "Apply author and affiliation filters.", "Use author and affiliation fields to make a more precise query and read the source evidence before using a result.", "arxiv.html", "#archive-author", ("open", "archive-advanced")),
        ("Save your research path", "Create, follow and restore personal topics.", "You can add personal topics and subtopics, save frequently used research paths, and restore defaults when needed.", "arxiv.html?category=math-ph&topic=quantum-many-body-theory", "#archive-custom-form", ("openclass", ".ex-personal")),
        ("bioRxiv Discover", "Browse independent biology subject areas.", "The bioRxiv Discover page has its own biology taxonomy, topic selectors, and preprint search.", "biorxiv.html?category=Genomics&topic=transcriptomics&subtopic=spatial-transcriptomics", "#archive-topic", None),
        ("ChemRxiv Discover", "Browse independent chemistry subject areas.", "ChemRxiv provides chemistry subject and topic browsing, while keeping the source of each paper visible.", "chemrxiv.html?category=Catalysis&topic=electrocatalysis&subtopic=electrochemical-co2-reduction", "#archive-topic", None),
        ("Cross-archive Research Desk", "Choose one or more sources.", "Open Research Desk to search all three preprint servers in one place. Results remain separated by their original archive.", "desk.html", "#rd-search-form", None),
        ("Search across sources", "Enter a query once for all selected archives.", "Enter research keywords in Research Desk, then click Search preprints to check arXiv, bioRxiv and ChemRxiv together.", "desk.html", "#rd-query", ("rd-query", "graph neural networks")),
        ("Research Desk filters", "Apply author, date range and sorting.", "Expand Author, dates and sorting to narrow the cross-archive search before reviewing each source's coverage.", "desk.html", "#rd-advanced", ("open", "rd-advanced")),
        ("Saved searches", "Rerun frequently used research queries.", "Save a useful Research Desk search to repeat it later from the saved search list.", "desk.html", "#rd-watches", None),
        ("Paper comparison", "Build a shortlist and compare abstracts.", "Add papers to the comparison shortlist. Compare available metadata and abstracts side by side, then verify the originals.", "desk.html", "#rd-queue", None),
        ("Your Library", "Keep saved papers across all archives.", "The Library gathers papers you saved from the different archives, with source and collection filters.", "workspace.html", "#library-list", None),
        ("Organize collections", "Create collections and add private notes.", "Use the Library controls to create collections, filter saved papers, and organize your reading notes on this device.", "workspace.html", "#library-filter", None),
        ("Follow researchers", "Track authors you choose.", "Select Following authors to review researchers you've saved, and inspect their available paper records.", "workspace.html#following", "#library-tab-following", None),
        ("Research projects", "Group papers around research questions.", "Library also contains project tools to organize research questions, keywords and associated references.", "workspace.html", "#research-project-form", None),
        ("Research recommendations", "Check relevant recommendations and evidence.", "Explore research recommendations based on your saved projects and interests. Always check the original source paper.", "workspace.html", "#research-recommendations", None),
        ("Research Assistant", "Ask a specific literature question.", "Open Research Assistant and ask a focused question to retrieve source-linked evidence from indexed literature.", "copilot.html", "#question", ("question", "What are Lieb-Robinson bounds?")),
        ("Inspect paper claims", "Choose Inspect a paper to examine its abstract.", "Choose Inspect a paper and provide an arXiv ID or original link. The assistant distinguishes abstract claims from what still needs proof verification.", "copilot.html", ".assistant-task-row", None),
        ("Choose AI options", "Use source evidence, local models or provider APIs.", "Under Optional text and local model, choose evidence-only analysis, an on-device model, Ollama, or your own hosted API provider.", "copilot.html", "#engine", ("openclass", ".assistant-advanced")),
        ("Optional hosted AI", "Hosted AI is disabled until a secure server is configured.", "For privacy, Axiovo does not ask for provider API keys in your browser. Hosted models require an administrator configured server. Until then, use source evidence or local models.", "copilot.html", "#engine", ("hosted", "hosted")),
        ("Evidence and export", "Inspect original citations and export the report.", "Use the Sources panel to open original records, verify citations, and export a research session or evidence report.", "copilot.html", "#evidence-list", None),
        ("PDF Research Tools", "Read a PDF and use the research utilities.", "Open Research Tools to read local PDFs, use available annotations and explore research utilities.", "lab.html", "#lab-local-pdf", None),
        ("Paper workspace", "Inspect arXiv versions and private notes.", "The paper workspace preserves version-exact arXiv links and supports personal research notes.", "paper.html?id=2608.13942v2", "#axiovo-paper-notes", None),
        ("Settings and themes", "Choose appearance and research preferences.", "Use Settings for preferences. Switch Night and Day appearance with the same accessible controls on every page.", "profiles.html", ".axiovo-header-appearance", None),
        ("Explore Axiovo", "Return home, browse, search and organize.", "You've now seen the main Axiovo workflows. Search broadly, save carefully, and always open the original research record to verify technical claims.", "", ".rd-home-hero", None),
    ]
    try:
        with tempfile.TemporaryDirectory() as temp:
            work=Path(temp)
            video_entries=[]
            audio_entries=[]
            captions=["WEBVTT",""]
            voices_used=set()
            neural_available=True
            chapters=[]
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
                        elif action[0]=="openclass":
                            page.locator(action[1]).first.evaluate("el=>el.open=true")
                        elif action[0]=="hosted":
                            page.locator(".assistant-advanced").first.evaluate("el=>el.open=true")
                            if page.locator("#engine option[value=hosted]").is_enabled():
                                page.locator("#engine").select_option("hosted")
                            # Otherwise show the genuine disabled option instead
                            # of staging an unavailable API integration.
                        else:
                            page.locator("#"+action[0]).fill(action[1])
                            if path.startswith("arxiv.html"):
                                page.locator("#archive-search-form").evaluate("form=>form.requestSubmit()")
                    page.wait_for_timeout(550)
                    target=focus(page,selector)
                    shot=work/f"{index:02d}.png"
                    page.screenshot(path=str(shot))
                    stamp(shot,title,hint,index,target)
                    sound=work/f"{index:02d}.mp3"
                    if neural_available:
                        try:
                            # Separate process because Playwright's sync API
                            # already owns the event loop. One failed network
                            # attempt disables neural TTS for all later scenes.
                            subprocess.run([
                                "python","-c",
                                "import asyncio,edge_tts,sys; asyncio.run(edge_tts.Communicate(sys.argv[1],voice='en-IN-NeerjaNeural',rate='-7%',pitch='+4Hz').save(sys.argv[2]))",
                                voice_text(narration),str(sound)
                            ],check=True,timeout=9,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
                            if not sound.is_file() or sound.stat().st_size < 1000:
                                raise RuntimeError("Neural narration output was empty")
                            voice="Neerja neural Indian English"
                        except Exception as exc:
                            neural_available=False
                            print(f"WARNING: Indian neural voice unavailable; using labeled female offline fallback: {str(exc)[:120]}",flush=True)
                    if not neural_available:
                        sound=work/f"{index:02d}.wav"
                        subprocess.run(["espeak-ng","-v","en+f3","-s","138","-w",str(sound),voice_text(narration)],check=True)
                        voice="eSpeak female fallback"
                    voices_used.add(voice)
                    # Convert every clip to one PCM format before ffmpeg concatenation.
                    pcm=work/f"{index:02d}-pcm.wav"
                    subprocess.run(["ffmpeg","-y","-v","error","-i",str(sound),"-ar","24000","-ac","1","-af","apad=pad_dur=1.2","-c:a","pcm_s16le",str(pcm)],check=True)
                    sound=pcm
                    duration=media_duration(sound)
                    video_entries.extend([f"file '{shot.as_posix()}'",f"duration {duration:.3f}"])
                    audio_entries.append(f"file '{sound.as_posix()}'")
                    chapters.append({"step":index,"title":title,"instruction":hint,"start_seconds":round(elapsed,2),"duration_seconds":round(duration,2)})
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
            (OUT/"axiovo-tour-build.json").write_text(json.dumps({
                "scenes":len(steps),"duration_seconds":round(elapsed,1),"voices":sorted(voices_used),
                "chapters":chapters,
                "source":"Real Chromium page captures","pronunciation":"Spoken-word technical corrections"
            },indent=2),encoding="utf-8")
            print(f"Axiovo tutorial recorded from actual pages: {len(steps)} steps, ~{elapsed:.0f} seconds, {output.stat().st_size} bytes",flush=True)
    finally:
        server.shutdown()

if __name__=="__main__":
    main()
