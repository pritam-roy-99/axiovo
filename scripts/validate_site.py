"""Fail CI before deployment if the static website contains invalid inline JS.

Uses Node's built-in syntax checker (available on GitHub hosted runners).
"""
from __future__ import annotations
import re
import subprocess
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/"docs"

def main():
    pages=["index.html","ai.html","search.html","methodology.html","paper.html","profiles.html","copilot.html"]
    checks=0
    for name in pages:
        html=(DOCS/name).read_text(encoding="utf-8")
        if "<title>" not in html:
            raise RuntimeError(name+" has no title")
        for code in re.findall(r"<script(?:\s[^>]*)?>([\s\S]*?)</script>",html):
            if not code.strip():continue
            with tempfile.NamedTemporaryFile(mode="w",suffix=".js",encoding="utf-8") as tmp:
                tmp.write(code);tmp.flush()
                subprocess.run(["node","--check",tmp.name],check=True)
            checks+=1
    external=["ai.js","paper.js","profiles.js","theme.js","social-config.js","social.js","profiles-social.js","copilot.js"]
    for name in external:
        subprocess.run(["node","--check",str(DOCS/name)],check=True)
    print(f"Validated {len(pages)} pages and {checks+len(external)} JS program blocks")

if __name__=="__main__":main()
