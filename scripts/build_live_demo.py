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
 ("Welcome to Axiovo","A video-first home for open scientific research.","Welcome to Axiovo, a free research discovery platform for three independent preprint archives."),
 ("Choose one of three","arXiv · bioRxiv · ChemRxiv, equal starting points.","Choose arXiv, bioRxiv or ChemRxiv, all presented equally on the homepage."),
 ("Explore arXiv","The full arXiv archive taxonomy.","Browse physics, mathematics, computer science and the other arXiv research fields."),
 ("Customize subfields","Topic, field and editable subfield.","Choose an area, select specialized topics, and save your own research interests."),
 ("Search arXiv","Source-linked papers and relevance controls.","Search arXiv papers and verify the original preprint records."),
 ("Explore bioRxiv","Biological preprints and subject areas.","Open the dedicated bioRxiv page to browse its biological research subjects."),
 ("Search bioRxiv","Independent life science search.","Search bioRxiv metadata, filter by author, topic and date."),
 ("Explore ChemRxiv","Chemistry and molecular science categories.","ChemRxiv has its own dedicated page for chemistry preprint discovery."),
 ("Search ChemRxiv","DOI-verified results and clear coverage.","Inspect DOI verified ChemRxiv papers, with honest coverage information."),
 ("My Library","Save and organize your research.","Keep paper reading lists, research notes and collections in your private library."),
 ("Research Assistant","Ask questions using original sources.","Use Research Assistant for careful, source linked research comparisons."),
 ("Research Tools","Specialized utilities when you need them.","Explore additional research tools, including PDF reading and citations.")
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
    page.set_default_timeout(14000)
    screenshots=[]
    def snap(label):
        img=Image.open(io.BytesIO(page.screenshot(type="png",animations="disabled")))
        screenshots.append(img.convert("RGB").resize((W,H),Image.Resampling.LANCZOS))
        print("Captured Axiovo:",label,"|",page.url,flush=True)
    open_page(page,base)
    page.locator(".axiovo-archive-grid").wait_for()
    safe_scroll(page,".axiovo-video-top")
    snap("video first")
    safe_scroll(page,".axiovo-archive-grid")
    snap("three equal cards")
    open_page(page,base+"arxiv.html")
    page.locator("#archive-topic").wait_for()
    snap("arxiv taxonomy")
    safe_scroll(page,"#archive-custom-form")
    snap("customizable subfields")
    safe_scroll(page,"#archive-search-form")
    snap("arxiv search")
    open_page(page,base+"biorxiv.html")
    page.locator("#archive-field").wait_for()
    snap("biorxiv subjects")
    safe_scroll(page,"#archive-search-form")
    snap("biorxiv search")
    open_page(page,base+"chemrxiv.html")
    page.locator("#archive-field").wait_for()
    snap("chemrxiv subjects")
    safe_scroll(page,"#archive-results")
    snap("chemrxiv coverage and results")
    open_page(page,base+"discover.html#workspace")
    page.locator("#workspace-panel #library-list").wait_for(timeout=15000)
    safe_scroll(page,"#library-heading")
    snap("library")
    open_page(page,base+"copilot.html")
    safe_scroll(page,"main")
    snap("research assistant")
    open_page(page,base+"lab.html")
    safe_scroll(page,"main")
    snap("research tools")
    page.close()
    if len(screenshots)!=len(SCENES):raise RuntimeError("Incomplete live website tour: "+str(len(screenshots)))
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
    compose(images[0], 0, 0.0).save(OUT / "axiovo-tour-poster.jpg", quality=88, optimize=True)
    captions = ["WEBVTT", ""]
    for i, (_, _, narration) in enumerate(SCENES):
        captions += [timecode(i * DURATION) + " --> " + timecode((i + 1) * DURATION - 0.08),
                     narration, ""]
    (OUT / "axiovo-tour.vtt").write_text("\n".join(captions), encoding="utf-8")
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
        cmd.append(str(OUT / "axiovo-tour.mp4"))
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
    if (OUT / "axiovo-tour.mp4").stat().st_size < 15000:
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
