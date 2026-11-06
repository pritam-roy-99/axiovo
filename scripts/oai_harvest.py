#!/usr/bin/env python3
"""Incremental, bounded arXiv OAI-PMH mirror for ResearchLens.

Not a full historical archive. Harvests a rolling window, handles continuation
tokens within one run, and keeps a bounded deduplicated source-linked snapshot.
The official OAI datestamp is a metadata modification time, NOT arXiv v1.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import tempfile
import time
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = "https://oaipmh.arxiv.org/oai"
ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "docs" / "data" / "oai-recent.json"
OAI = "{http://www.openarchives.org/OAI/2.0/}"
ARXIV = "{http://arxiv.org/OAI/arXiv/}"
IDENTIFIER = re.compile(r"^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?/\d{7})$", re.I)


def compact(value: str | None) -> str:
    return " ".join((value or "").split())


def parse_page(xml: bytes) -> tuple[list[dict], str, list[str]]:
    root = ET.fromstring(xml)
    errors = [compact(x.text) or x.get("code", "unknown") for x in root.findall(OAI + "error")]
    if errors:
        return [], "", errors
    records = []
    for record in root.findall(".//" + OAI + "record"):
        header = record.find(OAI + "header")
        if header is None or header.get("status") == "deleted":
            continue  # deleted items require separate tombstone tracking for full mirrors
        metadata = record.find(OAI + "metadata")
        item = metadata.find(ARXIV + "arXiv") if metadata is not None else None
        if item is None:
            continue
        identifier = compact(item.findtext(ARXIV + "id"))
        if not IDENTIFIER.fullmatch(identifier):
            continue
        title = compact(item.findtext(ARXIV + "title"))
        if not title:
            continue
        authors = []
        for author in item.findall(".//" + ARXIV + "author"):
            parts = [compact(author.findtext(ARXIV + p)) for p in ("forenames", "keyname")]
            name = " ".join(x for x in parts if x)
            if name:
                authors.append(name)
        category = compact(item.findtext(ARXIV + "categories"))
        records.append({
            "id": identifier,
            "title": title,
            "authors": authors,
            "abstract": compact(item.findtext(ARXIV + "abstract")),
            "categories": category.split(),
            "created": compact(item.findtext(ARXIV + "created")),
            "updated": compact(item.findtext(ARXIV + "updated")),
            "oai_datestamp": compact(header.findtext(OAI + "datestamp")),
            "doi": compact(item.findtext(ARXIV + "doi")),
            "link": "https://arxiv.org/abs/" + identifier
        })
    token = root.find(".//" + OAI + "resumptionToken")
    return records, (compact(token.text) if token is not None else ""), []


def merge(old: list[dict], incoming: list[dict], cap: int = 4000) -> list[dict]:
    index = {p["id"]: p for p in old if p.get("id")}
    for p in incoming:
        prior = index.get(p["id"])
        if prior is None or p.get("oai_datestamp", "") >= prior.get("oai_datestamp", ""):
            index[p["id"]] = p
    return sorted(index.values(),
                  key=lambda p: (p.get("oai_datestamp", ""), p["id"]),
                  reverse=True)[:cap]


def fetch(params: dict[str, str]) -> bytes:
    query = urllib.parse.urlencode(params)
    req = urllib.request.Request(BASE + "?" + query, headers={
        "User-Agent": os.getenv("ARXIV_USER_AGENT",
            "ResearchLens/0.5 (https://github.com/pritam-roy-99/researchlens; metadata discovery)")
    })
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=55) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
        time.sleep(8 * (attempt + 1))
    raise RuntimeError("OAI source unavailable")


def harvest(from_date: str, max_pages: int = 6) -> tuple[list[dict], bool]:
    """Returns (records, completed). Partial pages aren't mistaken for a full crawl."""
    collected = []
    token = ""
    seen_tokens = set()
    for page in range(max_pages):
        params = {"verb": "ListRecords", "resumptionToken": token} if token else {
            "verb": "ListRecords", "metadataPrefix": "arXiv", "from": from_date
        }
        records, token, errors = parse_page(fetch(params))
        if errors:
            raise RuntimeError("OAI error: " + "; ".join(errors))
        collected.extend(records)
        if not token:
            return collected, True
        if len(token) > 4096 or token in seen_tokens:
            raise RuntimeError("Repeated or invalid OAI continuation token; verified snapshot preserved")
        seen_tokens.add(token)
        time.sleep(3.5)
    return collected, False


def main() -> None:
    now = dt.datetime.now(dt.timezone.utc)
    # The mirror intentionally uses a recent lookback, not a claimed full archive.
    days = max(1, min(30, int(os.getenv("OAI_LOOKBACK_DAYS", "2"))))
    from_date = (now - dt.timedelta(days=days)).date().isoformat()
    pages = max(1, min(20, int(os.getenv("OAI_MAX_PAGES", "20"))))
    existing = {}
    try:
        existing = json.loads(TARGET.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        pass
    harvested, complete = harvest(from_date, pages)
    records = merge(existing.get("papers", []), harvested)
    if not harvested and not records:
        raise RuntimeError("OAI returned no records; preserving previous snapshot")
    payload = {
        "source": BASE,
        "source_format": "arXiv",
        "generated_at": now.isoformat(),
        "from_oai_datestamp": from_date,
        "complete_window": complete,
        "note": "Rolling metadata mirror. OAI datestamp is modification time, not announcement or initial submission time.",
        "paper_count": len(records), "papers": records
    }
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=TARGET.parent,
                                     prefix=".oai-", suffix=".json", delete=False) as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")
        tmp = Path(handle.name)
    tmp.replace(TARGET)
    print(f"Harvested {len(harvested)} records from {from_date}; retained {len(records)}; completed={complete}")
    if not complete:
        print("WARNING: OAI window truncated by page cap; full coverage is not claimed.")


if __name__ == "__main__":
    main()
