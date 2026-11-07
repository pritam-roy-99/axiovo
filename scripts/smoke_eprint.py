#!/usr/bin/env python3
"""Fourth-archive acceptance: mobile + desktop, source provenance, Desk/Feed/Library.

Fixtures are synthetic, explicitly for testing, never published as research.
"""
from __future__ import annotations
import functools,json
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]/"docs"
ROWS=[
 {"id":"2026/1234","title":"Quantum Key Distribution with Cryptographic Authentication",
  "authors":["A. Verified Author"],"abstract":"Quantum cryptography with authenticated key distribution.",
  "date":"2026-11-05","categories":["Quantum cryptography"]},
 {"id":"2025/88","title":"Threshold Signatures for Secure Multiparty Computation",
  "authors":["B. Verified Author"],"abstract":"Threshold cryptography and multiparty computation.",
  "date":"2025-06-10","categories":["MPC"]},
 {"id":"2024/42","title":"Post-Quantum Cryptography for Lattice-Based Key Exchange",
  "authors":["C. Verified Author"],"abstract":"Lattice-based cryptography and secure key exchange.",
  "date":"2024-02-08","categories":["Post-quantum cryptography"]}
]
FIXTURE=json.dumps({"source":"eprint","coverage":"incremental-OAI-PMH-snapshot-not-full-history",
 "generated_at":"2026-11-07T00:00:00Z","papers":ROWS})
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def main():
 server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
 Thread(target=server.serve_forever,daemon=True).start()
 base=f"http://127.0.0.1:{server.server_address[1]}/"
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
   for width in (390,1366):
    context=browser.new_context(viewport={"width":width,"height":840},service_workers="block")
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.route("**/data/eprint.json",lambda route:route.fulfill(status=200,content_type="application/json",body=FIXTURE))
    for filename in ("feed.json","oai-recent.json","announcements.json","biorxiv.json","chemrxiv.json"):
     page.route("**/data/"+filename,lambda route:route.fulfill(status=200,content_type="application/json",body='{"papers":[]}'))
    page.route("**/data/feed-preview.json",lambda route:route.fulfill(status=404,body=""))
    page.goto(base,wait_until="domcontentloaded")
    assert page.locator('.axiovo-archive-card[data-archive="eprint"]').count()==1
    assert page.locator('.axiovo-archive-grid a').count()==4
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+7"),("homepage overflow",width)
    page.goto(base+"crypto.html",wait_until="domcontentloaded")
    # The three-stage topic selector must be fully initialized on mobile and desktop.
    page.locator("#crypto-field-input").wait_for(timeout=12000)
    assert page.locator("#crypto-field-input").is_visible()
    assert page.locator("#crypto-topic-input").is_disabled()
    page.locator("#crypto-field-input").click()
    page.locator("#crypto-field-input").fill("Quantum")
    page.get_by_role("option",name="Quantum and post-quantum security",exact=True).click()
    assert page.locator("#crypto-field").input_value()=="Quantum and post-quantum security"
    assert page.locator("#crypto-topic-input").is_enabled()
    page.locator("#crypto-topic-input").click()
    page.locator("#crypto-topic-input").fill("Quantum cryptography")
    page.get_by_role("option",name="Quantum cryptography",exact=True).click()
    assert page.locator("#crypto-subtopic-input").is_enabled()
    page.locator("#crypto-subtopic-input").click()
    page.locator("#crypto-subtopic-input").fill("Quantum key distribution")
    page.get_by_role("option",name="Quantum key distribution",exact=True).click()
    assert page.locator("#crypto-subtopic").input_value()=="quantum key distribution"
    assert "Quantum key distribution" in page.locator("#crypto-scope-label").inner_text()
    # Save a selected ePrint research path and restore it from local storage.
    page.locator("#crypto-personal summary").click()
    page.locator("#crypto-save-path").click()
    assert "Research path saved" in page.locator("#crypto-personal-status").inner_text()
    assert page.locator("#crypto-saved-paths .ex-personal-row").count()==1
    page.reload(wait_until="domcontentloaded")
    page.locator("#crypto-saved-paths .ex-personal-row").first.wait_for(timeout=10000)
    assert page.locator("#crypto-saved-paths .ex-personal-row").count()==1
    page.locator("#crypto-personal summary").click()
    page.locator("#crypto-custom-kind").select_option("subtopic")
    page.locator("#crypto-custom").fill("Quantum authentication protocols")
    page.locator("#crypto-custom-add").click()
    assert "Sub-subtopic added" in page.locator("#crypto-personal-status").inner_text()
    assert page.locator("#crypto-subtopic").input_value()=="Quantum authentication protocols"
    page.locator("#crypto-custom-kind").select_option("topic")
    page.locator("#crypto-custom").fill("Secure quantum protocols")
    page.locator("#crypto-custom-add").click()
    assert "Research subfield added" in page.locator("#crypto-personal-status").inner_text()
    assert page.locator("#crypto-topic").input_value()=="Secure quantum protocols"
    page.locator("#crypto-custom-kind").select_option("subject")
    page.locator("#crypto-custom").fill("Personal quantum security")
    page.locator("#crypto-custom-add").click()
    assert "Research subject added" in page.locator("#crypto-personal-status").inner_text()
    assert page.locator("#crypto-field").input_value()=="Personal quantum security"
    page.reload(wait_until="domcontentloaded")
    assert page.locator("#crypto-field").input_value()=="Personal quantum security"
    assert page.locator("#crypto-custom-kind option").count()==3
    # IACR historical search remains explicitly scoped to available verified records.
    page.locator("#crypto-history").click()
    assert page.locator("#crypto-sort").input_value()=="oldest"
    assert page.locator("#crypto-from").input_value()==""
    assert page.locator("#crypto-to").input_value()==""
    assert "not a complete IACR" in page.locator("#crypto-index-note").inner_text().lower()
    page.locator("#crypto-clear-path").click()
    assert page.locator("#crypto-field").input_value()==""
    assert page.locator("#crypto-topic-input").is_disabled()
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+7")
    page.locator(".crypto-paper").first.wait_for(timeout=15000)
    assert page.locator(".crypto-paper").count()==3
    assert all("eprint.iacr.org/" in href for href in page.locator(".crypto-paper h3 a").evaluate_all("(els)=>els.map(e=>e.href)"))
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+7"),("IACR overflow",width)
    page.locator("#crypto-query").fill("2026/1234")
    page.locator("#crypto-search-form").get_by_role("button",name="Search papers").click()
    assert page.locator(".crypto-paper").count()==1
    assert "Quantum Key Distribution" in page.locator(".crypto-paper h3").inner_text()
    page.locator(".crypto-paper").first.get_by_role("button",name="☆ Save").click()
    assert page.locator(".crypto-paper .rd-button[aria-pressed=true]").count()==1
    page.goto(base+"workspace.html",wait_until="domcontentloaded")
    page.get_by_text("Quantum Key Distribution with Cryptographic Authentication",exact=False).first.wait_for(timeout=12000)
    page.goto(base+"desk.html",wait_until="domcontentloaded")
    page.locator("#rd-query").fill("2026/1234")
    page.locator("#rd-search-form button[type=submit]").click()
    page.locator("#rd-source-eprint").wait_for(timeout=12000)
    page.locator("#rd-source-eprint").get_by_text("Quantum Key Distribution",exact=False).first.wait_for(timeout=16000)
    assert "Quantum Key Distribution" in page.locator("#rd-source-eprint").inner_text()
    page.goto(base+"feed.html",wait_until="domcontentloaded")
    page.evaluate("localStorage.setItem('axiovo-followed-topics',JSON.stringify(['quantum cryptography']))")
    page.reload(wait_until="domcontentloaded")
    page.locator(".feed-card h3").first.wait_for(timeout=20000)
    assert "Quantum Key Distribution" in page.locator(".feed-card h3").first.inner_text()
    page.locator("#feed-source").select_option("eprint")
    assert page.locator(".feed-card").count()>=1
    assert not errors,(width,errors[:5])
    context.close()
   browser.close()
  print("PASS: 4-source home, official IACR links, exact IDs, Library save, Research Desk, My Feed, and mobile/desktop compatibility")
 finally:server.shutdown()

if __name__=="__main__":main()
