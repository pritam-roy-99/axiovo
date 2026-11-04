"""Security invariants checked before publishing Axiovo to GitHub Pages.

This is a targeted baseline, not an exhaustive vulnerability scanner.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

def main():
    problems = []
    def ensure(ok, why):
        if not ok:
            problems.append(why)

    privacy = (DOCS / "privacy.html").read_text(encoding="utf-8")
    settings = (DOCS / "profiles.html").read_text(encoding="utf-8")
    backup = (DOCS / "local-backup.js").read_text(encoding="utf-8")
    sw = (DOCS / "sw.js").read_text(encoding="utf-8")
    manifest = json.loads((DOCS / "manifest.webmanifest").read_text(encoding="utf-8"))
    ensure('href="./privacy.html"' in settings or 'href="./privacy.html"' in (DOCS / "navigation.js").read_text(), "Privacy policy not discoverable")
    ensure('id="axiovo-full-export"' in settings and 'id="axiovo-full-import"' in settings, "Backup controls absent")
    ensure('src="./local-backup.js"' in settings, "Backup module missing")
    ensure('researchlens-reading-list' in backup and 'researchlens-library-metadata-v1' in backup and 'researchlens-research-projects-v1' in backup, "Legacy data not covered")
    ensure('data.payload' not in backup and "localStorage.clear()" not in backup, "Risky bulk storage operation")
    ensure('researchlens-shell-' in sw and 'axiovo-shell-' in sw, "Old caches not migrated")
    ensure("openalex.org" not in sw and "api.biorxiv.org" not in sw and "api.github.com" not in sw, "Remote API response should not be precached")
    ensure(manifest.get("display") == "standalone", "PWA standalone support missing")
    ensure(manifest.get("scope") == "./", "PWA scope unexpectedly broadened")

    # Explicit secret patterns in deployable frontend files. Avoid inspecting unrelated keys
    # such as an intentionally public Supabase anon project key.
    secrets = re.compile(r"(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk_live_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)")
    for path in DOCS.rglob("*"):
        if path.suffix not in {".js", ".html", ".json", ".css", ".webmanifest"}:
            continue
        if path.stat().st_size > 4_000_000:
            continue
        content = path.read_text(encoding="utf-8", errors="replace")
        if secrets.search(content):
            problems.append("Possible embedded secret in deployed asset: " + str(path.relative_to(ROOT)))
    if problems:
        for p in problems: print("SECURITY CHECK FAILED:", p)
        raise SystemExit(1)
    print("Security baseline passed: privacy, backup compatibility, app scope, remote API caching, and secret patterns")

if __name__ == "__main__":
    main()
