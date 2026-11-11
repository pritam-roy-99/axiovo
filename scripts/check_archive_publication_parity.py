#!/usr/bin/env python3
"""Compare a locally built archive report to a published Pages report.

Use in post-deployment checks. A mismatch means the published release is not
the verified local release; no destructive updates are performed.
"""
from __future__ import annotations
import json
import time
import urllib.request
import urllib.error
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
    attempts=6
    for attempt in range(attempts):
        try:
            req=urllib.request.Request(url+"?check="+str(attempt),headers={
                "User-Agent":"Axiovo-publication-parity/2",
                "Cache-Control":"no-cache"})
            with urllib.request.urlopen(req,timeout=20) as response:
                published=json.load(response)
            errors=compare(expected,published)
        except (OSError,ValueError,urllib.error.URLError) as exc:
            errors=["Published report unavailable: "+str(exc)]
        if not errors:
            print("Published archive reliability counts match local validated snapshot.")
            return
        print("Parity attempt",attempt+1,"/",attempts,":","; ".join(errors[:8]))
        if attempt+1<attempts:
            time.sleep(15)
    raise SystemExit("Live archive parity remains inconsistent after propagation retries.")

if __name__=="__main__":
    main()
