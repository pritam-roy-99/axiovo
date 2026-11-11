#!/usr/bin/env python3
"""Compare a locally built archive report to a published Pages report.

Use in post-deployment checks. A mismatch means the published release is not
the verified local release; no destructive updates are performed.
"""
from __future__ import annotations
import json
import urllib.request
from pathlib import Path

FIELDS=("status","complete","scope","indexed_unique","announcement_date","source_reported_count")
def compare(expected, published):
    errors=[]
    if expected.get("schema_version") != published.get("schema_version"):
        errors.append("schema_version differs")
    for key in ("arxiv","biorxiv","chemrxiv","eprint"):
        a=expected.get("sources",{}).get(key,{})
        b=published.get("sources",{}).get(key,{})
        for field in FIELDS:
            if a.get(field) != b.get(field):
                errors.append(f"{key}.{field}: expected {a.get(field)!r}, published {b.get(field)!r}")
        if key=="arxiv" and a.get("categories") != b.get("categories"):
            errors.append("arxiv.categories differ")
    return errors

def main():
    local=Path("docs/data/archive-reliability.json")
    expected=json.loads(local.read_text(encoding="utf8"))
    url="https://pritam-roy-99.github.io/axiovo/data/archive-reliability.json"
    req=urllib.request.Request(url,headers={"User-Agent":"Axiovo-publication-parity/2"})
    with urllib.request.urlopen(req,timeout=20) as response:
        published=json.load(response)
    errors=compare(expected,published)
    if errors:
        for error in errors: print("PARITY MISMATCH:",error)
        raise SystemExit(1)
    print("Published archive reliability counts match local validated snapshot.")

if __name__=="__main__":
    main()
