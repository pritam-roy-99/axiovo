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
                assert page.locator(".rl-global-header").is_visible()
                assert page.locator(".theme-toggle").is_visible()
                assert page.locator(".pl-app-shell").count() == 0
                assert page.locator("#prooflab-settings").is_visible()
                assert page.locator("#prooflab-provider").is_visible()
                assert page.locator("#prooflab-composer-model").is_visible()
                cols = page.locator(".prooflab-studio").evaluate("(el) => getComputedStyle(el).gridTemplateColumns.split(' ').length")
                assert cols == (2 if width == 1280 else 1), (width, cols)
                assert page.locator("#prooflab-settings").get_attribute("open") is None
                page.locator("#prooflab-settings summary").click()
                assert page.locator("#ollama-detect").is_visible()
                page.locator("#prooflab-settings summary").click()
                page.locator("#prooflab-file-input").set_input_files({
                    "name": "notes.tex",
                    "mimeType": "text/plain",
                    "buffer": b"\\\\[S^2 = 4I - [A_0,A_1] \\\\otimes [B_0,B_1]\\\\]"
                })
                page.wait_for_function("document.querySelector(\'#prooflab-attachment-list\').textContent.includes(\'notes.tex\')")
                assert page.evaluate("window.AxiovoProofLabAttachments.approvedText()") == ""
                page.locator("#prooflab-send-files").check()
                assert "S^2" in page.evaluate("window.AxiovoProofLabAttachments.approvedText()")
                page.get_by_role("button", name="Remove notes.tex").click()
                assert page.evaluate("window.AxiovoProofLabAttachments.approvedText()") == ""
                page.locator("#prooflab-settings summary").click()
                page.locator("#create").click()
                page.locator("#prooflab-settings summary").click()
                assert page.locator("#workspace").is_visible()
                assert "Unverified draft" in page.locator("#project-status").inner_text()
                page.locator("#prooflab-prompt").fill("Derive a CHSH bound.")
                page.locator("#ollama-suggest").click()
                assert "No model selected" in page.locator("#prooflab-thread").inner_text()
                assert "Derive a CHSH bound." in page.locator("#prooflab-prompt").input_value()
                # Math-aware output must remain safe and preserve actual TeX for typesetting.
                math_check = page.evaluate("""() => {
                    const node = document.createElement('div');
                    document.body.append(node);
                    window.AxiovoProofLabMath.render(node, String.raw`The CHSH identity is:
\\[
S^2 = 4I - [A_0,A_1] \\otimes [B_0,B_1]
\\]

\\frac{1}{\\sqrt{2}} + \\sigma_z

<script>window.axiovoMathXss = 1</script>`);
                    return {
                        equations: node.querySelectorAll('.prooflab-equation').length,
                        tex: node.textContent.includes('\\\\frac') && node.textContent.includes('S^2'),
                        unsafe: !!node.querySelector('script') || window.axiovoMathXss === 1,
                    };
                }""")
                assert math_check["equations"] >= 2, math_check
                assert math_check["tex"] and not math_check["unsafe"], math_check
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
