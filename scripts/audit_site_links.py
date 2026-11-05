#!/usr/bin/env python3
"""Audit Axiovo's first-party HTML links and assets, using only stdlib.

Usage: python scripts/audit_site_links.py
Run AFTER the GitHub Pages build has generated feeds and video assets.
"""
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1] / "docs"
PAGES = [
    "index.html", "discover.html", "arxiv.html", "biorxiv.html",
    "chemrxiv.html", "workspace.html", "copilot.html", "lab.html",
    "paper.html", "compare.html", "fields.html", "profiles.html",
    "community.html", "methodology.html", "privacy.html"
]
ATTRS = {"a": ("href",), "link": ("href",), "script": ("src",),
         "img": ("src",), "source": ("src",), "video": ("poster",),
         "track": ("src",), "form": ("action",)}


class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.ids = set()

    def handle_starttag(self, tag, raw_attrs):
        attrs = dict(raw_attrs)
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        if tag == "a" and attrs.get("name"):
            self.ids.add(attrs["name"])
        for key in ATTRS.get(tag, ()):
            if attrs.get(key):
                self.links.append((tag, key, attrs[key], self.getpos()[0]))


def parse(path):
    doc = Links()
    doc.feed(path.read_text(encoding="utf-8"))
    return doc


def main():
    errors = []
    tested = 0
    for page in PAGES:
        origin = ROOT / page
        if not origin.is_file():
            errors.append(f"{page}: HTML page is missing")
            continue
        parsed = parse(origin)
        for tag, attr, raw, lineno in parsed.links:
            url = raw.strip()
            if not url or url.startswith(("mailto:", "tel:", "data:", "javascript:", "//")):
                continue
            parts = urlsplit(url)
            if parts.scheme or parts.netloc:
                continue
            # A hash without a path refers to the current document.
            path_part = unquote(parts.path)
            target = (origin.parent / path_part).resolve() if path_part else origin
            try:
                target.relative_to(ROOT.resolve())
            except ValueError:
                errors.append(f"{page}:{lineno}: unsafe local path {url}")
                continue
            if target.is_dir():
                target = target / "index.html"
            tested += 1
            if not target.is_file():
                errors.append(f"{page}:{lineno}: missing {attr} target {url}")
                continue
            if parts.fragment and target.suffix.lower() in (".html", ".htm"):
                target_doc = parse(target)
                if unquote(parts.fragment) not in target_doc.ids:
                    errors.append(f"{page}:{lineno}: missing anchor #{parts.fragment} in {target.relative_to(ROOT)}")
    print(f"Checked {tested} first-party static references across {len(PAGES)} entry pages.")
    for issue in errors:
        print("BROKEN:", issue)
    if errors:
        raise SystemExit(f"{len(errors)} broken first-party references found")
    print("PASS: no missing first-party static references or fragment anchors.")


if __name__ == "__main__":
    main()
