#!/usr/bin/env python3
"""Build Axiovo's homepage tour from screenshots of the ACTUAL current site.

A local HTTP server hosts docs/; Playwright opens and interacts with the real
HTML/CSS/JS, rather than drawing a fictitious interface. Only instructional
labels/progress are overlaid. External APIs are not mocked: unavailable data
stays unavailable in the recording. No login, uploads or user secrets.
"""
from __future__ import annotations

import array
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
    ("Axiovo today", "Discover original research and keep it organized.",
     "This is Axiovo's current homepage, captured directly from the running website."),
    ("Latest arXiv", "Browse and filter the real indexed research feed.",
     "Browse the latest available arXiv records, choose categories and verify papers at their source."),
    ("Explore literature", "Select a field, search articles, and filter by date.",
     "Use Explore Literature for field-aware discovery, publication filters and in-page results."),
    ("Paper actions", "Read the source, save a paper, and open research tools.",
     "Paper cards provide direct arXiv links, reading-list controls and a research assistant."),
    ("My Library & questions", "Organize reading and research questions in one workspace.",
     "Switch to your library, manage saved references and develop research questions."),
    ("Research Assistant", "Inspect research evidence and work with paper identifiers.",
     "The Research Assistant opens a dedicated workspace for source-linked paper analysis."),
    ("Research Tools", "Explore PDF reading, comparisons, citations and alerts.",
     "Research Tools brings together archive search, document reading, comparisons and alerts."),
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
    page = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
    page.set_default_timeout(6000)
    screenshots = []
    def snap(name):
        # Render the actual page; the only additions to the video happen later.
        image = Image.open(io.BytesIO(page.screenshot(type="png", animations="disabled")))
        screenshots.append(image.convert("RGB").resize((W, H), Image.Resampling.LANCZOS))
        print("Captured Axiovo:", name, "|", page.url, flush=True)

    open_page(page, base)
    snap("homepage")

    open_page(page, base + "#discover")
    safe_click(page, "#rl-source-arxiv")
    safe_scroll(page, "#local-feed-view")
    snap("latest arXiv")

    safe_click(page, "#rl-source-scholarly")
    safe_scroll(page, "#scholarly-discovery")
    snap("explore literature")

    # Capture the real cards and action buttons, without inventing results.
    safe_click(page, "#rl-source-arxiv")
    safe_scroll(page, "#papers .paper")
    if not page.locator("#papers .paper").count():
        safe_scroll(page, "#local-feed-view")
    snap("paper actions")

    open_page(page, base + "#workspace")
    try:
        page.locator("#workspace-panel .rl-workspace").first.wait_for(timeout=9000)
    except Exception:
        pass
    safe_scroll(page, "#workspace-panel")
    snap("library and questions")

    open_page(page, base + "copilot.html")
    safe_scroll(page, "main")
    snap("research assistant")

    open_page(page, base + "lab.html")
    safe_scroll(page, ".lab-tabs")
    snap("research tools")

    page.close()
    if len(screenshots) != len(SCENES):
        raise RuntimeError("Incomplete live-page capture")
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
    exe = shutil.which("espeak-ng") or shutil.which("espeak")
    if not exe:
        return None
    samplerate = 22050
    total = len(SCENES) * DURATION
    mix = array.array("h", [0]) * (total * samplerate)
    for i, (_, _, words) in enumerate(SCENES):
        path = Path(folder) / f"speech{i}.wav"
        subprocess.run([exe, "-v", "en-us", "-s", "155", "-a", "115", "-w", str(path), words],
                       check=True, stdout=subprocess.DEVNULL)
        with wave.open(str(path), "rb") as wav:
            if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) != (1, 2, samplerate):
                raise RuntimeError("Unexpected narration format")
            samples = array.array("h")
            samples.frombytes(wav.readframes(wav.getnframes()))
        begin = int((i * DURATION + 0.3) * samplerate)
        end = min(int(((i + 1) * DURATION - 0.12) * samplerate), len(mix))
        for j, val in enumerate(samples[:max(0, end - begin)]):
            mix[begin + j] = val
    path = Path(folder) / "narration.wav"
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(samplerate)
        wav.writeframes(mix.tobytes())
    return path


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
