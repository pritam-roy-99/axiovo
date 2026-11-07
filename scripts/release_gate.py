#!/usr/bin/env python3
"""Axiovo static publication gate: links, source files and deployment metadata."""
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
PAGES = ("index.html", "arxiv.html", "biorxiv.html", "chemrxiv.html",
         "crypto.html", "desk.html", "feed.html", "workspace.html",
         "copilot.html", "methodology.html")
SKIP_SCHEMES = {"http", "https", "mailto", "tel", "data", "javascript"}
ISSUES = []

class References(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if d.get("id"):
            self.ids.add(d["id"])
        for attr in ("href", "src", "poster"):
            if d.get(attr):
                self.refs.append((attr, d[attr]))

def check_pages():
    parsed = {}
    for name in PAGES:
        path = DOCS / name
        if not path.is_file():
            ISSUES.append(f"Missing required page: {name}")
            continue
        parser = References()
        parser.feed(path.read_text(encoding="utf-8"))
        parsed[name] = parser

    # Validate local assets and destination fragments. Do not assume the
    # network or third-party services are reachable at build time.
    for name, parser in parsed.items():
        for attr, raw in parser.refs:
            u = urlsplit(raw.strip())
            if u.scheme.lower() in SKIP_SCHEMES or u.netloc:
                continue
            if raw.startswith(("blob:", "//")):
                continue
            relative = unquote(u.path)
            target = (DOCS / name).parent / relative if relative else DOCS / name
            if relative.endswith("/") or not relative:
                if relative.endswith("/"):
                    target = target / "index.html"
            try:
                resolved = target.resolve()
                resolved.relative_to(DOCS.resolve())
            except ValueError:
                ISSUES.append(f"{name}: {attr} escapes docs/: {raw}")
                continue
            if not resolved.is_file():
                ISSUES.append(f"{name}: missing {attr} target: {raw}")
                continue
            # Fragment links to required HTML pages can be checked locally.
            if u.fragment and resolved.suffix == ".html":
                tname = resolved.name
                if tname in parsed and unquote(u.fragment) not in parsed[tname].ids:
                    ISSUES.append(f"{name}: missing anchor in {tname}: #{u.fragment}")

def check_release_assets():
    sw = (DOCS / "sw.js").read_text(encoding="utf-8")
    if "verified2-verified2" in sw:
        ISSUES.append("Service worker contains malformed citation asset version")
    refs = re.findall(r'"(\\./[^"\\n]+)"', sw)
    for raw in refs:
        if raw.startswith("./data/"):
            continue  # harvested data may be generated independently
        u = urlsplit(raw)
        p = DOCS / unquote(u.path.removeprefix("./"))
        if not p.is_file():
            ISSUES.append(f"Service-worker asset missing: {raw}")
    home = (DOCS / "index.html").read_text(encoding="utf-8")
    if 'id="axiovo-tour"' not in home or 'home-tour.js' not in home:
        ISSUES.append("Homepage interactive onboarding is absent")
    # Never publish an HTML media reference unless its source file exists.
    for asset in ("assets/axiovo-tour.mp4", "assets/axiovo-tour.vtt"):
        if asset in home and not (DOCS / asset).is_file():
            ISSUES.append(f"Homepage references missing tutorial asset: {asset}")

def check_coverage():
    m = DOCS / "data/arxiv-days/manifest.json"
    if not m.exists():
        ISSUES.append("Missing arXiv day-coverage manifest")
        return
    data = json.loads(m.read_text(encoding="utf-8"))
    if not isinstance(data.get("days"), dict):
        ISSUES.append("Invalid arXiv day manifest")
        return
    for day, info in data["days"].items():
        if info.get("complete") and (not isinstance(info.get("count"), int) or info["count"] <= 0):
            ISSUES.append(f"Unsubstantiated complete arXiv day: {day}")

if __name__ == "__main__":
    check_pages()
    check_release_assets()
    check_coverage()
    if ISSUES:
        print("Axiovo release gate FAILED:")
        for issue in ISSUES:
            print(" -", issue)
        sys.exit(1)
    print(f"Axiovo release gate PASSED: {len(PAGES)} routes, local assets, coverage metadata")
