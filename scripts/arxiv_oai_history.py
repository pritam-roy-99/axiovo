#!/usr/bin/env python3
"""Resumable arXiv OAI-PMH history harvester. Never labels a partial harvest complete.

State and JSONL output must live on persistent storage. Do not commit millions
of records or resumption tokens to GitHub Pages.
"""
import argparse
import json
import os
from pathlib import Path
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = "https://oaipmh.arxiv.org/oai"
NS = "{http://www.openarchives.org/OAI/2.0/}"
PREFIX = "{http://arxiv.org/OAI/arXiv/}"

def parse(xml):
    root = ET.fromstring(xml)
    errors = root.findall(NS + "error")
    if errors:
        raise RuntimeError("OAI-PMH: " + "; ".join((e.get("code") or "") + ": " + (e.text or "") for e in errors))
    records = []
    for record in root.findall(".//" + NS + "record"):
        header = record.find(NS + "header")
        if header is None:
            continue
        identifier = header.findtext(NS + "identifier")
        if not identifier:
            continue
        if header.get("status") == "deleted":
            records.append({"oai_identifier": identifier, "deleted": True})
            continue
        metadata = record.find(NS + "metadata")
        item = metadata.find(PREFIX + "arXiv") if metadata is not None else None
        if item is None:
            continue
        paper_id = item.findtext(PREFIX + "id")
        if not paper_id:
            continue
        records.append({
            "id": paper_id, "oai_identifier": identifier, "deleted": False,
            "title": " ".join((item.findtext(PREFIX + "title") or "").split()),
            "abstract": " ".join((item.findtext(PREFIX + "abstract") or "").split()),
            "created": item.findtext(PREFIX + "created"),
            "updated": item.findtext(PREFIX + "updated"),
            "categories": (item.findtext(PREFIX + "categories") or "").split(),
            "oai_datestamp": header.findtext(NS + "datestamp"),
        })
    token_element = root.find(".//" + NS + "resumptionToken")
    return records, (token_element.text or "").strip() if token_element is not None else ""

def request_page(token):
    params = {"verb": "ListRecords", "resumptionToken": token} if token else {
        "verb": "ListRecords", "metadataPrefix": "arXiv"
    }
    url = BASE + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "User-Agent": os.getenv("ARXIV_USER_AGENT", "Axiovo/0.8 (https://github.com/pritam-roy-99/axiovo; historical metadata)")
    })
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                return response.read()
        except Exception:
            if attempt == 3:
                raise
            time.sleep(10 * (attempt + 1))

def harvest(directory, max_pages=5, fetch=request_page):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    state_file = directory / "checkpoint.json"
    state = json.loads(state_file.read_text()) if state_file.exists() else {"next_token": "", "pages": 0, "complete": False}
    if state["complete"]:
        return state
    if state.get("recovery_required"):
        raise RuntimeError("Expired OAI token: recovery required; checkpoint preserved")
    for _ in range(max_pages):
        try:
            records, next_token = parse(fetch(state["next_token"]))
        except RuntimeError as error:
            # Tokens may expire between scheduled jobs. Preserve checkpoint.
            if "badResumptionToken" in str(error):
                state["recovery_required"] = True
                state["recovery_reason"] = "expired_oai_token"
                temporary_state = state_file.with_suffix(".tmp")
                temporary_state.write_text(json.dumps(state) + "\n", encoding="utf8")
                os.replace(temporary_state, state_file)
            raise
        # One immutable page per token transition; checkpoint advances only after
        # the complete page is durably written. Replays overwrite the same page.
        page_no = state["pages"]
        target = directory / f"page-{page_no:08d}.jsonl"
        temp = target.with_suffix(".tmp")
        with temp.open("w", encoding="utf8") as output:
            for record in records:
                output.write(json.dumps(record, ensure_ascii=False) + "\n")
            output.flush()
            os.fsync(output.fileno())
        os.replace(temp, target)
        state = {"next_token": next_token, "pages": page_no + 1, "complete": not bool(next_token)}
        temporary_state = state_file.with_suffix(".tmp")
        temporary_state.write_text(json.dumps(state) + "\n", encoding="utf8")
        os.replace(temporary_state, state_file)
        if state["complete"]:
            break
        time.sleep(4)
    return state

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, help="Persistent directory for checkpoint and page shards")
    parser.add_argument("--max-pages", type=int, default=5)
    args = parser.parse_args()
    if args.max_pages < 1 or args.max_pages > 100:
        parser.error("--max-pages must be 1..100")
    print(json.dumps(harvest(args.output, args.max_pages)))
