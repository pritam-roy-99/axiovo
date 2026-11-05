#!/usr/bin/env python3
"""Check Axiovo source links; with --built, verify its published video bundle.

Source mode intentionally allows generated MP4/VTT/Atom files that are produced
after checkout. Built mode is a hard gate for critical homepage assets.
"""
from __future__ import annotations
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

DOCS = Path(__file__).resolve().parents[1] / "docs"
GENERATED = {"assets/axiovo-tour.mp4", "assets/axiovo-tour.vtt"}
BUILD_MODE = "--built" in sys.argv


class References(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.ids = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.append(a["id"])
        for key in ("href", "src", "poster"):
            if a.get(key):
                self.links.append((key, a[key], self.getpos()[0]))


def audit():
    errors = []
    visited = 0
    pages = list(DOCS.glob("*.html"))
    for html in pages:
        doc = References()
        doc.feed(html.read_text(encoding="utf-8"))
        duplicate = {x for x in doc.ids if doc.ids.count(x) > 1}
        if duplicate:
            errors.append(f"{html.name}: duplicate HTML IDs: {sorted(duplicate)}")
        for attr, raw, line in doc.links:
            url = urlsplit(raw)
            if url.scheme or url.netloc or raw.startswith("//"):
                continue
            if not url.path or raw.startswith(("data:", "mailto:", "tel:", "javascript:")):
                continue
            path = unquote(url.path)
            if path.startswith("/"):
                continue
            resolved = (html.parent / path).resolve()
            if not resolved.is_relative_to(DOCS.resolve()):
                errors.append(f"{html.name}:{line}: unsafe local path {raw}")
                continue
            if resolved.is_dir():
                resolved = resolved / "index.html"
            rel = resolved.relative_to(DOCS.resolve()).as_posix()
            if rel.startswith("feeds/") or (rel in GENERATED and not BUILD_MODE):
                continue
            visited += 1
            if not resolved.is_file():
                errors.append(f"{html.name}:{line}: missing {attr} {raw}")
    home = (DOCS / "index.html").read_text(encoding="utf-8")
    archives = re.findall(r'data-archive="(arxiv|biorxiv|chemrxiv)"\s+href="([^"]+)"', home)
    if archives != [("arxiv", "./arxiv.html"), ("biorxiv", "./biorxiv.html"), ("chemrxiv", "./chemrxiv.html")]:
        errors.append("Homepage must contain exactly three correctly linked archive choices")
    if "<video" not in home or home.find("<video") > home.find('class="axiovo-archive-grid"'):
        errors.append("Homepage video must precede the three archive choices")
    if BUILD_MODE:
        video = DOCS / "assets" / "axiovo-tour.mp4"
        vtt = DOCS / "assets" / "axiovo-tour.vtt"
        poster = DOCS / "assets" / "axiovo-tour-poster.svg"
        for p in (video, vtt, poster):
            if not p.is_file() or p.stat().st_size < 100:
                errors.append(f"Missing or empty published asset: {p.relative_to(DOCS)}")
        if video.exists() and video.stat().st_size >= 15000:
            try:
                inspect = subprocess.run(
                    ["ffprobe", "-v", "error", "-show_entries",
                     "stream=codec_name,codec_type", "-of", "csv=p=0", str(video)],
                    check=True, capture_output=True, text=True
                ).stdout.lower()
                if "h264" not in inspect or "video" not in inspect:
                    errors.append("Homepage MP4 has no supported H.264 video stream")
            except (OSError, subprocess.CalledProcessError) as exc:
                errors.append(f"ffprobe failed: {exc}")
        if vtt.exists() and not vtt.read_text(encoding="utf-8").startswith("WEBVTT"):
            errors.append("Homepage captions are not valid WebVTT")
    print(f"Audited {len(pages)} HTML pages and {visited} local asset references.")
    for error in errors:
        print("ERROR:", error)
    if errors:
        return 1
    print("Axiovo source" + (" and generated video" if BUILD_MODE else "") + " checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(audit())
