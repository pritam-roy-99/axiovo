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
                assert page.get_by_role("heading", name="ProofLab", exact=True).is_visible()
                assert page.locator("header.rl-global-header").is_visible(), "Use shared Axiovo header"
                if width <= 760:
                    # The approved design uses a compact top bar and fixed
                    # five-destination bottom navigation, not the old two-row grid.
                    header = page.evaluate("""() => {
                        const box = selector => {const r=document.querySelector(selector)?.getBoundingClientRect();
                          return r && {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
                        return {display:getComputedStyle(document.querySelector("header.rl-global-header")).display,
                            logo:box("header .rl-logo"), menu:box("header .ax-mobile-menu"),
                            nav:box("header nav.rl-nav"),
                            overflow:document.documentElement.scrollWidth-innerWidth};
                    }""")
                    assert header["display"] == "flex", (width, "Expected compact mobile top bar", header)
                    assert header["logo"] and header["logo"]["width"] >= 44, (width, "Axiovo logo missing", header)
                    assert header["menu"] and header["menu"]["right"] <= width+2, (width, "More menu off screen", header)
                    assert header["nav"] and header["nav"]["x"] <= 2 and header["nav"]["right"] >= width-2, (width, "Fixed bottom navigation missing", header)
                    assert header["nav"]["y"] >= 750, (width, "Bottom nav not anchored", header)
                    assert header["overflow"] <= 7, (width, "Horizontal overflow", header)
                    page.locator(".ax-mobile-menu summary").click()
                    assert page.locator(".ax-menu-theme").is_visible(), "Theme control must be reachable on Android"
                    page.locator(".ax-mobile-menu summary").click()
                assert not page.locator(".pl-rail").count(), "Standalone ProofLab sidebar must be removed"
                assert page.locator(".pl-app-shell").count() == 1
                assert page.locator(".pl-topbar").is_visible()
                assert page.locator(".prooflab-studio").is_visible()
                assert page.locator("#pl-chat-settings > details.pl-aux-settings").count() == 1, "Ollama settings must appear immediately above the conversation"
                assert page.locator("#pl-chat-settings .prooflab-model-card").count() == 1
                assert page.locator(".prooflab-sidebar .prooflab-model-card").count() == 0
                top = page.locator("#pl-chat-settings").bounding_box()
                heading = page.locator(".prooflab-chat-heading").bounding_box()
                assert top and heading and top["y"] < heading["y"], "Model settings must precede the conversation heading"
                assert page.locator(".pl-section-nav a[href='./install.html']").count() == 1
                page.goto(base + "install.html", wait_until="domcontentloaded")
                for platform in ("windows", "ubuntu", "macos"):
                    assert page.locator("#" + platform).is_visible(), ("Missing public installation guide", platform)
                assert "not supported" in page.locator("#modes").inner_text().lower()
                page.goto(base + "prooflab.html", wait_until="domcontentloaded")

                if width >= 700:
                    page.locator("#pl-focus-prompt").click()
                    assert page.locator("#prooflab-prompt").evaluate("(el) => document.activeElement === el")
                cols = page.locator(".prooflab-studio").evaluate("(el) => getComputedStyle(el).gridTemplateColumns.split(' ').length")
                assert cols == (2 if width == 1280 else 1), (width, cols)
                # Native header and theme controls remain in place.
                if width <= 760:
                    assert page.locator(".ax-mobile-menu summary").is_visible()
                else:
                    assert page.locator("header.rl-global-header .theme-toggle").is_visible()
                assert page.locator("#pl-chat-provider").is_visible()
                assert page.locator("#pl-chat-model").is_visible()
                # Text attachments are extracted on-device; not transmitted by selecting.
                page.locator("#pl-chat-files").set_input_files({
                    "name": "lemma.tex",
                    "mimeType": "text/plain",
                    "buffer": b"\\\\[S^2 = 4I - [A_0,A_1]\\\\otimes[B_0,B_1]\\\\]"
                })
                page.wait_for_function("window.AxiovoProofLabAttachments?.metadata.length === 1")
                assert "lemma.tex" in page.locator("#pl-attachment-list").inner_text()
                assert "Attached research file" in page.evaluate("window.AxiovoProofLabAttachments.getApprovedText()")
                page.locator("#pl-include-files").uncheck()
                assert not page.evaluate("window.AxiovoProofLabAttachments.getApprovedText()")
                page.locator("#pl-include-files").check()
                page.get_by_role("button", name="Remove lemma.tex").click()
                assert not page.evaluate("window.AxiovoProofLabAttachments.getApprovedText()")
                page.locator("#create").click()
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
