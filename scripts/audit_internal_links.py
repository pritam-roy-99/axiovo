#!/usr/bin/env python3
"""Validate local navigation links and loadable assets in source HTML.

Generated build artifacts (Atom feeds and homepage video) are checked separately
during the Pages workflow after their generators run.
"""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1] / "docs"
GENERATED = ("feeds/", "assets/researchlens-tour")
SKIP_SCHEMES = ("mailto:", "tel:", "javascript:", "data:")

class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        for key in ("href", "src"):
            value = a.get(key)
            if value and not value.startswith(SKIP_SCHEMES):
                self.links.append((tag, key, value))

def main():
    errors = []
    documents = {p: p.read_text(encoding="utf-8") for p in ROOT.glob("*.html")}
    parsed = {}
    for p, content in documents.items():
        parser = Links()
        parser.feed(content)
        parsed[p.resolve()] = parser
    checked = 0
    for path, parsed_page in parsed.items():
        for tag, attr, raw in parsed_page.links:
            u = urlsplit(raw)
            if u.scheme or u.netloc or raw.startswith("//"):
                continue
            target = unquote(u.path).strip()
            if not target and not u.fragment:
                continue
            if target.startswith("/"):
                # Site-absolute paths are deployment dependent.
                continue
            dest = (path.parent / target).resolve() if target else path
            if dest.is_dir():
                dest /= "index.html"
            relative = dest.relative_to(ROOT.resolve()).as_posix() if dest.is_relative_to(ROOT.resolve()) else ""
            if target and relative.startswith(GENERATED):
                continue
            if target and not dest.is_file():
                errors.append(f"{path.name}: missing {attr}={raw!r}")
                continue
            if u.fragment and dest.suffix == ".html" and dest in parsed:
                # Some fragments are added dynamically; static IDs are only
                # mandatory for same-page fragment navigation.
                if (dest == path and u.fragment not in parsed_page.ids
                    and not u.fragment.startswith("paper-")):
                    errors.append(f"{path.name}: missing #fragment {u.fragment!r}")
            checked += 1
    print(f"Audited {len(parsed)} HTML pages and {checked} internal references.")
    if errors:
        print("\n".join(errors))
        return 1
    print("All checked internal references resolve in source.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
