#!/usr/bin/env python3
"""Audit published literature snapshots without claiming global archive recall.

Compare each arXiv UTC submission shard against its official Atom totalResults
stored by the harvester. Check every local paper identity/date and report
missing closed dates as a repair queue. bioRxiv checks the official date-window
total; ChemRxiv exposes only the verified Crossref prefix-query state.

An unavailable or empty source count is NOT proof of zero papers.
"""
from __future__ import annotations
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "docs" / "data"
REPORT = ROOT / "literature-health.json"

def load(path):
    try:
        return json.loads(path.read_text(encoding="utf8"))
    except (OSError, ValueError, TypeError):
        return None

def audit_arxiv(folder, today, recent_days=21):
    manifest=load(folder/"manifest.json") or {}
    indexed=manifest.get("days") if isinstance(manifest.get("days"),dict) else {}
    errors=[]
    certified=[]
    uncertain=[]
    for day, metadata in sorted(indexed.items()):
        if not isinstance(metadata,dict):
            errors.append({"date":day,"issue":"invalid_manifest_entry"})
            continue
        batch=load(folder/(day+".json"))
        valid=bool(batch and metadata.get("complete") is True
            and isinstance(metadata.get("count"),int) and metadata["count"]>0
            and batch.get("complete") is True and batch.get("date")==day
            and batch.get("paper_count")==metadata["count"]
            and batch.get("source_total")==metadata["count"]
            and isinstance(batch.get("papers"),list))
        if valid:
            records=batch["papers"]
            ids=[str(p.get("id","")) for p in records if isinstance(p,dict)]
            valid=len(records)==metadata["count"] and len(set(ids))==len(ids) and all(ids)
            valid=valid and all(str(p.get("published",""))[:10]==day for p in records)
        if valid:
            certified.append(day)
        else:
            errors.append({"date":day,"issue":"source_count_or_record_mismatch"})
            uncertain.append(day)
    # Audit only recent CLOSED UTC dates; older unharvested dates are explicitly outside scope.
    expected=[(today-dt.timedelta(days=n)).isoformat() for n in range(1,recent_days+1)]
    missing=[day for day in expected if day not in certified]
    repair=sorted(set(missing+uncertain),reverse=True)
    return {"status":"gaps_detected" if repair or errors else "recent_window_verified",
            "scope":"UTC submission dates; certified against arXiv Atom totalResults captured during harvesting",
            "verified_days":len(certified),"verified_latest":max(certified,default=None),
            "checked_recent_closed_days":recent_days,
            "missing_recent_dates":missing,"invalid_shards":errors,
            "repair_queue":repair[:50],"queue_total":len(repair),
            "not_a_full_archive":True}

def audit_bio(path):
    payload=load(path)
    if not isinstance(payload,dict):return {"status":"unavailable","not_a_full_archive":True}
    expected=payload.get("source_total")
    retrieved=payload.get("records_paginated")
    counted=len(payload.get("papers",[])) if isinstance(payload.get("papers"),list) else None
    sound=isinstance(expected,int) and expected>=0 and isinstance(retrieved,int) and retrieved>=expected
    sound=sound and payload.get("complete_window") is True
    return {"status":"window_verified" if sound else "window_incomplete",
            "official_window_total":expected,"paginated_records":retrieved,
            "cached_unique_records":counted,"requested_from":payload.get("requested_from"),
            "requested_through":payload.get("requested_through"),
            "last_success":payload.get("generated_at"),"not_a_full_archive":True}

def audit_chem(path):
    payload=load(path)
    if not isinstance(payload,dict):return {"status":"unavailable","not_a_full_archive":True}
    return {"status":"prefix_pages_exhausted" if payload.get("prefix_exhausted") is True else "prefix_incomplete",
            "cached_unique_records":len(payload.get("papers",[])) if isinstance(payload.get("papers"),list) else None,
            "prefix_pages_checked":payload.get("prefix_pages_checked"),
            "last_success":payload.get("generated_at"),
            "scope":"Crossref ChemRxiv DOI-prefix results; not official full ChemRxiv totals",
            "not_a_full_archive":True}

def build(root=ROOT,today=None,recent_days=21):
    today=today or dt.datetime.now(dt.timezone.utc).date()
    return {"schema":1,"checked_at":dt.datetime.now(dt.timezone.utc).isoformat(),
        "warning":"Completeness is proved only for named source windows. No source-wide recall is asserted.",
        "arxiv":audit_arxiv(root/"arxiv-days",today,recent_days),
        "biorxiv":audit_bio(root/"biorxiv.json"),
        "chemrxiv":audit_chem(root/"chemrxiv.json")}

def main():
    payload=build()
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    REPORT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    for source in ("arxiv","biorxiv","chemrxiv"):
        print(source, payload[source]["status"])
    print("arXiv repair queue:",", ".join(payload["arxiv"]["repair_queue"][:10]) or "none")
    return payload

if __name__=="__main__":
    main()
