#!/usr/bin/env python3
"""arXiv OAI-PMH incremental metadata feed, inspired by SciRate's arxivsync.

OAI datestamps are *record modification times*, not the initial arXiv
submission dates. This index is a useful rate-limit fallback, but OAI
update-window snapshots must NEVER be labeled complete submission days.
"""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path
import re
import tempfile
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "docs" / "data" / "arxiv-oai"
MANIFEST = TARGET / "manifest.json"
BASE = "https://oaipmh.arxiv.org/oai"
OAI = "{http://www.openarchives.org/OAI/2.0/}"
AX = "{http://arxiv.org/OAI/arXiv/}"
MAX_PAGES = 60
REQUEST_DELAY = 5.2


def normalize(value):
    return " ".join(str(value or "").split())


def parse_oai(raw):
    root = ET.fromstring(raw)
    if root.tag != OAI + "OAI-PMH":
        raise ValueError("Expected OAI-PMH XML")
    errors = root.findall(OAI + "error")
    if errors:
        raise RuntimeError("OAI server: " + "; ".join(normalize(e.text)[:130] for e in errors))
    response = root.find(OAI + "ListRecords")
    if response is None:
        raise ValueError("Missing ListRecords result")
    token = normalize(response.findtext(OAI + "resumptionToken"))
    papers = []
    for record in response.findall(OAI + "record"):
        header = record.find(OAI + "header")
        if header is None or header.get("status") == "deleted":
            continue
        meta = record.find(OAI + "metadata")
        payload = meta.find(AX + "arXiv") if meta is not None else None
        if payload is None:
            continue
        identifier = normalize(payload.findtext(AX + "id"))
        if not re.fullmatch(r"(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Za-z]{2})?/\d{7})", identifier):
            continue
        created = normalize(payload.findtext(AX + "created"))
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", created):
            continue
        updated = normalize(payload.findtext(AX + "updated")) or created
        title = normalize(payload.findtext(AX + "title"))
        if not title:
            continue
        names = []
        for author in payload.findall(".//" + AX + "author"):
            given = normalize(author.findtext(AX + "forenames"))
            family = normalize(author.findtext(AX + "keyname"))
            full = normalize(given + " " + family)
            if full:
                names.append(full)
        categories = normalize(payload.findtext(AX + "categories")).split()
        papers.append({
            "id": identifier, "version": 1, "title": title,
            "abstract": normalize(payload.findtext(AX + "abstract")),
            "authors": names, "categories": categories,
            "primary_category": categories[0] if categories else "",
            "published": created + "T00:00:00Z", "updated": updated,
            "link": "https://arxiv.org/abs/" + identifier,
            "doi": normalize(payload.findtext(AX + "doi")), "topics": [],
            "oai_datestamp": normalize(header.findtext(OAI + "datestamp")),
        })
    return papers, token


def fetch_window(first: dt.date, last: dt.date, opener=None, sleep=time.sleep):
    if opener is None:
        opener = urllib.request.urlopen
    if last < first:
        raise ValueError("Invalid update window")
    query = urllib.parse.urlencode({
        "verb": "ListRecords", "metadataPrefix": "arXiv",
        "from": first.isoformat(), "until": last.isoformat(),
    })
    url = BASE + "?" + query
    by_id = {}
    pages = 0
    while url and pages < MAX_PAGES:
        req = urllib.request.Request(url, headers={
            "User-Agent": os.environ.get("ARXIV_USER_AGENT",
                "Axiovo/0.7 (https://github.com/pritam-roy-99/axiovo; arXiv OAI metadata synchronizer)"),
            "Accept": "application/xml",
        })
        with opener(req, timeout=90) as response:
            rows, token = parse_oai(response.read())
        pages += 1
        for paper in rows:
            prior = by_id.get(paper["id"])
            if not prior or paper["updated"] >= prior["updated"]:
                by_id[paper["id"]] = paper
        if token:
            url = BASE + "?" + urllib.parse.urlencode({"verb": "ListRecords", "resumptionToken": token})
            if pages >= MAX_PAGES:
                raise RuntimeError("OAI resumptionToken chain exceeded bound; refusing partial harvest")
            sleep(REQUEST_DELAY)
        else:
            url = ""
    if url:
        raise RuntimeError("OAI harvest did not exhaust continuation tokens")
    return list(by_id.values()), pages


def atomic_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=path.parent, encoding="utf8", delete=False) as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
        name = f.name
    os.replace(name, path)


def harvest(today=None, lookback=7, fetcher=fetch_window):
    today = today or dt.datetime.now(dt.timezone.utc).date()
    from_day = today - dt.timedelta(days=lookback)
    papers, pages = fetcher(from_day, today)
    # Keep recent first-submission dates; administrative changes to decades-old
    # papers can have a current OAI datestamp, but are not new submissions.
    oldest = today - dt.timedelta(days=365)
    grouped = {}
    for p in papers:
        day = p["published"][:10]
        if day < oldest.isoformat() or day > today.isoformat():
            continue
        grouped.setdefault(day, []).append(p)
    manifest = {"schema": 1,
        "source": "arXiv official OAI-PMH arXiv ListRecords",
        "coverage": "PARTIAL submission-date sets; complete OAI update-window harvest only",
        "complete_submission_dates": False,
        "update_from": from_day.isoformat(), "update_until": today.isoformat(),
        "last_harvested_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "pages_fetched": pages, "records_seen": len(papers),
        "days": {}}
    for day, rows in grouped.items():
        shard = {"date": day, "complete": False, "coverage": "OAI changed records, not complete first-submission set",
             "source": "OAI-PMH update window", "paper_count": len(rows),
             "papers": sorted(rows, key=lambda p: (p["published"], p["id"]))}
        atomic_json(TARGET / (day + ".json"), shard)
        manifest["days"][day] = {"count": len(rows), "complete": False}
    atomic_json(MANIFEST, manifest)
    print("arXiv OAI-PMH: fetched", len(papers), "updated records over", pages, "page(s);",
          sum(map(len, grouped.values())), "recent-date records retained;", len(grouped), "partial day shard(s)")
    return manifest


if __name__ == "__main__":
    harvest()
