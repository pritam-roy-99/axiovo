#!/usr/bin/env python3
"""Build Axiovo's homepage tour from screenshots of the ACTUAL current site.

A local HTTP server hosts docs/; Playwright opens and interacts with the real
HTML/CSS/JS, rather than drawing a fictitious interface. Only instructional
labels/progress are overlaid. External APIs are not mocked: unavailable data
stays unavailable in the recording. No login, uploads or user secrets.
"""
from __future__ import annotations

import array
import asyncio
import functools
import http.server
import io
import shutil
import subprocess
import tempfile
import threading
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
OUT = DOCS / "assets"
W, H, FPS, DURATION = 960, 540, 8, 7

SCENES = [
    ("Axiovo", "A clear place to start your research.",
     "Welcome to Axiovo, where research discovery begins with a simple choice."),
    ("Choose a discipline", "Select your broad research field.",
     "Choose a broad research field, then enter Discover to refine your interests."),
    ("Discover your subfield", "Research areas and specialized topics.",
     "Inside Discover, narrow your field to research areas and specific subtopics."),
    ("Latest arXiv", "Find recent papers with the right source information.",
     "Browse the indexed arXiv feed and check the source of each paper."),
    ("Explore literature", "Search beyond the daily feed.",
     "Explore wider literature and filter results by your research question."),
    ("Paper details", "Abstracts, version links and related research.",
     "Open a paper workspace for its abstract, version links and research connections."),
    ("Private notes", "Keep your research questions alongside each paper.",
     "Write private notes and track which papers you have reviewed."),
    ("Compare papers", "Source-linked side-by-side research review.",
     "Compare two papers and your notes, then inspect their original sources."),
    ("My Library", "Projects, collections and reading progress.",
     "Organize saved papers into collections, and keep your research projects together."),
    ("Research Assistant", "Ask questions in the context of a paper.",
     "Use Research Assistant to examine a selected paper and its cited evidence."),
    ("Research Tools", "Additional tools when you need them.",
     "Explore PDF reading, citations and focused research tools."),
]
BG = (9, 30, 52)
FOREGROUND = (243, 248, 253)
SECONDARY = (197, 219, 234)
ACCENT = (77, 176, 232)


def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/" + name, size)


FONT_TITLE = font(19, True)
FONT_SUB = font(12)
FONT_SMALL = font(10, True)


class SilentHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        return


def start_server():
    handler = functools.partial(SilentHandler, directory=str(DOCS))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, "http://127.0.0.1:" + str(server.server_address[1]) + "/"


def safe_scroll(page, selector):
    try:
        node = page.locator(selector).first
        if node.count():
            node.scroll_into_view_if_needed(timeout=4000)
            page.wait_for_timeout(450)
    except Exception:
        pass


def safe_click(page, selector):
    try:
        target = page.locator(selector).first
        if target.count():
            target.click(timeout=5500)
            page.wait_for_timeout(750)
            return True
    except Exception:
        pass
    return False


def open_page(page, url):
    page.goto(url, wait_until="domcontentloaded", timeout=25000)
    page.wait_for_timeout(1100)


def capture(browser, base):
    page=browser.new_page(viewport={"width":1280,"height":720},device_scale_factor=1)
    page.set_default_timeout(11000)
    screenshots=[]
    def snap(name):
        shot=Image.open(io.BytesIO(page.screenshot(type="png",animations="disabled")))
        screenshots.append(shot.convert("RGB").resize((W,H),Image.Resampling.LANCZOS))
        print("Captured Axiovo:",name,"|",page.url,flush=True)

    open_page(page,base)
    page.locator("#axiovo-entry-form").wait_for(state="visible")
    snap("homepage")

    page.select_option("#axiovo-entry-field","quantum")
    snap("broad field")
    page.locator("#axiovo-entry-form button[type=submit]").click()
    page.wait_for_url("**/discover.html#discover",timeout=16000)
    safe_scroll(page,"#rl-focus-bar")
    snap("subfields in Discover")

    safe_click(page,"#rl-source-arxiv")
    safe_scroll(page,"#local-feed-view")
    snap("arxiv discovery")

    safe_click(page,"#rl-source-scholarly")
    safe_scroll(page,"#scholarly-discovery")
    snap("literature search")

    safe_click(page,"#rl-source-arxiv")
    paper_id=""
    try:
        paper=page.locator("#papers .paper").first
        paper.wait_for(timeout=13000)
        paper_id=paper.get_attribute("data-paper-id") or ""
        paper.locator('a.axiovo-paper-detail-action').click(timeout=7000)
        page.wait_for_url("**/paper.html?*",timeout=13000)
    except Exception as e:
        if not paper_id:
            raise RuntimeError("Cannot capture paper detail without a real indexed paper") from e
        open_page(page,base+"paper.html?id="+paper_id)
    page.locator("#axiovo-versions").wait_for(timeout=12000)
    safe_scroll(page,"#axiovo-versions")
    snap("paper research details")

    safe_scroll(page,"#axiovo-paper-notes")
    snap("private research notes")

    # Compare the exact captured paper with a distinct saved or indexed identifier;
    # do not claim both metadata records are fully indexed when they are not.
    open_page(page,base+"compare.html?ids="+paper_id+",2501.01234")
    page.locator(".axiovo-compare-paper").first.wait_for(timeout=11000)
    snap("source-linked comparison")

    open_page(page,base+"discover.html#workspace")
    page.locator("#workspace-panel #library-list").wait_for(timeout=15000)
    safe_scroll(page,"#library-heading")
    snap("Library and collections")

    open_page(page,base+"copilot.html?id="+paper_id)
    safe_scroll(page,"main")
    snap("paper research assistant")

    open_page(page,base+"lab.html")
    safe_scroll(page,"main")
    snap("research tools")

    page.close()
    if len(screenshots)!=len(SCENES):
        raise RuntimeError("Incomplete tour: "+str(len(screenshots))+" of "+str(len(SCENES)))
    return screenshots

def timecode(seconds):
    ms = round(seconds * 1000)
    return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}"


def compose(image, index, progress):
    im = image.copy()
    draw = ImageDraw.Draw(im, "RGBA")
    draw.rectangle((0, 425, W, H), fill=(BG[0], BG[1], BG[2], 229))
    draw.text((24, 442), SCENES[index][0], font=FONT_TITLE, fill=FOREGROUND)
    draw.text((25, 475), SCENES[index][1], font=FONT_SUB, fill=SECONDARY)
    draw.text((25, 511), "ACTUAL AXIOVO INTERFACE  •  " + str(index + 1) + "/" + str(len(SCENES)),
              font=FONT_SMALL, fill=ACCENT)
    draw.rounded_rectangle((0, H-5, W, H), radius=2, fill=(42, 83, 112, 255))
    draw.rounded_rectangle((0, H-5, int(W * progress), H), radius=2, fill=(66, 182, 232, 255))
    return im.convert("RGB")


def audio_narration(folder):
    """Prefer a warm, expressive adult female neural voice.

    If an external synthesis provider is unavailable during the build,
    synthesize a female-variant local voice instead. Never create silent
    videos or mislabel the local fallback as a neural voice.
    """
    exe=shutil.which("espeak-ng") or shutil.which("espeak")
    ffmpeg=shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg required for narrated Axiovo video")
    samplerate=22050
    outputs=[]
    engine="local feminine voice"
    try:
        import edge_tts
        async def synthesize_all():
            for i,(_,_,words) in enumerate(SCENES):
                path=Path(folder)/f"neural{i}.mp3"
                voice=edge_tts.Communicate(words,voice="en-US-JennyNeural",
                                           rate="-8%",pitch="-3Hz")
                await asyncio.wait_for(voice.save(str(path)),timeout=27)
                if not path.exists() or path.stat().st_size<500:
                    raise RuntimeError("Empty neural narration")
                outputs.append(path)
        asyncio.run(synthesize_all())
        engine="Jenny neural voice"
    except Exception as exc:
        print("Neural voice not available; using local feminine voice:",str(exc)[:180],flush=True)
        outputs.clear()
        if not exe:
            raise RuntimeError("No audio narration engine available") from exc
        for i,(_,_,words) in enumerate(SCENES):
            path=Path(folder)/f"speech{i}.wav"
            subprocess.run([exe,"-v","en-us+f3","-s","145","-p","57",
                            "-a","120","-w",str(path),words],check=True,
                            stdout=subprocess.DEVNULL)
            outputs.append(path)
    total=len(SCENES)*DURATION
    mix=array.array("h",[0])*(total*samplerate)
    for i,source in enumerate(outputs):
        wav_path=Path(folder)/f"standard{i}.wav"
        subprocess.run([ffmpeg,"-y","-hide_banner","-loglevel","error",
                        "-i",str(source),"-ac","1","-ar",str(samplerate),
                        "-c:a","pcm_s16le",str(wav_path)],check=True)
        with wave.open(str(wav_path),"rb") as wav:
            if (wav.getnchannels(),wav.getsampwidth(),wav.getframerate())!=(1,2,samplerate):
                raise RuntimeError("Unexpected voice sample format")
            samples=array.array("h")
            samples.frombytes(wav.readframes(wav.getnframes()))
        begin=int((i*DURATION+.25)*samplerate)
        end=min(int(((i+1)*DURATION-.08)*samplerate),len(mix))
        for j,value in enumerate(samples[:max(0,end-begin)]):
            mix[begin+j]=value
    target=Path(folder)/"narration.wav"
    with wave.open(str(target),"wb") as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(samplerate)
        wav.writeframes(mix.tobytes())
    print("Narration engine:",engine,flush=True)
    return target

def build_video(images):
    OUT.mkdir(parents=True, exist_ok=True)
    compose(images[0], 0, 0.0).save(OUT / "researchlens-tour-poster.jpg", quality=88, optimize=True)
    captions = ["WEBVTT", ""]
    for i, (_, _, narration) in enumerate(SCENES):
        captions += [timecode(i * DURATION) + " --> " + timecode((i + 1) * DURATION - 0.08),
                     narration, ""]
    (OUT / "researchlens-tour.vtt").write_text("\n".join(captions), encoding="utf-8")
    with tempfile.TemporaryDirectory() as folder:
        audio = audio_narration(folder)
        cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "rawvideo",
               "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
        if audio:
            cmd += ["-i", str(audio)]
        cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart"]
        if audio:
            cmd += ["-c:a", "aac", "-b:a", "64k", "-shortest"]
        cmd.append(str(OUT / "researchlens-tour.mp4"))
        process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
        for i, screenshot in enumerate(images):
            for t in range(FPS * DURATION):
                progress = (i + t / (FPS * DURATION)) / len(images)
                frame = compose(screenshot, i, progress)
                try:
                    process.stdin.write(frame.tobytes())
                except BrokenPipeError:
                    break
        process.stdin.close()
        err = process.stderr.read().decode(errors="replace")
        if process.wait() != 0:
            raise RuntimeError("ffmpeg video generation failed: " + err[-900:])
    if (OUT / "researchlens-tour.mp4").stat().st_size < 15000:
        raise RuntimeError("Video asset is unexpectedly small")


def main():
    server, base = start_server()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            try:
                images = capture(browser, base)
            finally:
                browser.close()
        build_video(images)
    finally:
        server.shutdown()
    print("Built verified UI-based Axiovo MP4, poster and captions", flush=True)


if __name__ == "__main__":
    main()
