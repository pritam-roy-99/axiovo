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
 ("Three equal archives","Start with arXiv, bioRxiv or ChemRxiv.","Choose one of three equal research preprint archives."),
 ("arXiv","Explore physical sciences, mathematics and computing.","Open arXiv for its own indexed scientific papers."),
 ("Research focus","Choose your field, research area and subtopic.","Refine your field and specialized research interests inside Discover."),
 ("arXiv papers","Read and save source-linked original papers.","Browse real arXiv records and check their original versions."),
 ("bioRxiv","A dedicated home for biology preprints.","Switch to bioRxiv for its independent life science preprints."),
 ("bioRxiv topics","Refine your biological interests.","Choose a biology topic and look through verified metadata."),
 ("ChemRxiv","An equal home for chemistry preprints.","Explore ChemRxiv through verified preprint DOI records."),
 ("ChemRxiv coverage","Honest record availability, without invented papers.","Check the ChemRxiv data source and coverage information."),
 ("Wider search","Optional literature search beyond source feeds.","Search wider literature separately from the three archives."),
 ("Paper details","Read abstracts and original version links.","Open a full research workspace for a selected paper."),
 ("Paper comparison","Examine two indexed papers side by side.","Compare indexed papers and check the original sources."),
 ("My Library","Organize reading, notes, and collections.","Save papers and research projects in your private library."),
 ("Research Assistant","Ask questions grounded in paper sources.","Use Research Assistant for careful evidence linked questions."),
 ("Research Tools","Extra tools for advanced research.","Access PDF reading, citation tools, and comparisons.")
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
    page.set_default_timeout(13000)
    screenshots=[]
    def snap(name):
        shot=Image.open(io.BytesIO(page.screenshot(type="png",animations="disabled")))
        screenshots.append(shot.convert("RGB").resize((W,H),Image.Resampling.LANCZOS))
        print("Captured Axiovo:",name,"|",page.url,flush=True)
    def switch(archive):
        page.locator("#rl-source-"+archive).click(timeout=11000)
        page.wait_for_url(lambda url:"archive="+archive in url,timeout=16000)
    open_page(page,base)
    page.locator(".axiovo-archive-card").first.wait_for()
    snap("three archive homepage")
    page.locator('[data-archive="arxiv"]').click()
    page.wait_for_url("**/discover.html?archive=arxiv#discover")
    snap("arxiv")
    safe_scroll(page,"#rl-focus-bar")
    snap("field area subtopic")
    safe_scroll(page,"#local-feed-view")
    snap("arxiv papers")
    switch("biorxiv")
    safe_scroll(page,"#biorxiv-discovery")
    snap("biorxiv")
    safe_scroll(page,"#rl-focus-bar")
    snap("biology research areas")
    switch("chemrxiv")
    safe_scroll(page,"#chemrxiv-discovery")
    snap("chemrxiv")
    safe_scroll(page,"#axiovo-chemrxiv-status")
    snap("chemrxiv coverage")
    switch("arxiv")
    safe_click(page,"#rl-source-scholarly")
    page.locator("#scholarly-discovery").wait_for(state="visible")
    safe_scroll(page,"#scholarly-discovery")
    snap("wider literature")
    safe_click(page,"#rl-source-arxiv")
    page.locator("#papers .paper").first.wait_for(timeout=14000)
    first=page.locator("#papers .paper").first.get_attribute("data-paper-id")
    second=page.locator("#papers .paper").nth(1).get_attribute("data-paper-id")
    if not first or not second or first==second:raise RuntimeError("Need two source-indexed papers for the demo")
    open_page(page,base+"paper.html?id="+first)
    page.locator("#axiovo-versions").wait_for()
    snap("paper details")
    open_page(page,base+"compare.html?ids="+first+","+second)
    page.locator(".axiovo-compare-paper").first.wait_for()
    snap("comparison")
    open_page(page,base+"discover.html#workspace")
    page.locator("#workspace-panel #library-list").wait_for(timeout=15000)
    snap("library")
    open_page(page,base+"copilot.html?ids="+first+","+second)
    snap("research assistant")
    open_page(page,base+"lab.html")
    snap("research tools")
    page.close()
    if len(screenshots)!=len(SCENES):raise RuntimeError("Incomplete capture")
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
