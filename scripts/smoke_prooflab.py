#!/usr/bin/env python3
"""ProofLab browser acceptance checks, without network AI or Lean execution."""
from __future__ import annotations
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "docs"

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        base = f"http://127.0.0.1:{server.server_address[1]}/"
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            for width in (320, 390, 1280):
                context = browser.new_context(viewport={"width": width, "height": 850}, accept_downloads=True, service_workers="block")
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(base + "copilot.html", wait_until="domcontentloaded")
                assert page.get_by_role("link", name="Open ProofLab").count() == 1
                page.get_by_role("link", name="Open ProofLab").click()
                page.wait_for_url("**/prooflab.html")
                assert page.get_by_role("heading", name="Axiovo ProofLab").is_visible()
                page.locator("#create").click()
                assert page.locator("#workspace").is_visible()
                assert "Unverified draft" in page.locator("#project-status").inner_text()
                page.locator("#prooflab-prompt").fill("Derive a CHSH bound.")
                page.locator("#ollama-suggest").click()
                assert "No model selected" in page.locator("#prooflab-thread").inner_text()
                assert "Derive a CHSH bound." in page.locator("#prooflab-prompt").input_value()
                page.locator("#obligation").fill("Show that the CHSH operator squared is bounded by 8I.")
                page.locator("#add").click()
                assert page.locator("#obligations li").count() == 1
                page.locator("#lean").fill("import Mathlib\\n\\n-- draft only")
                assert "Unverified draft" in page.locator("#project-status").inner_text()
                with page.expect_download() as info:
                    page.locator("#download-json").click()
                assert info.value.suggested_filename.endswith(".json")
                with page.expect_download() as info:
                    page.locator("#download-lean").click()
                assert info.value.suggested_filename.endswith(".lean")
                assert not errors, (width, errors)
                overflow = page.evaluate("document.documentElement.scrollWidth - innerWidth")
                assert overflow <= 7, (width, overflow)
                context.close()
            browser.close()
        print("PASS: ProofLab links, projects, obligations, exports, unverified status, and mobile layouts")
    finally:
        server.shutdown()

if __name__ == "__main__":
    main()
