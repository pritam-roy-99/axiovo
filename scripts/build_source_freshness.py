#!/usr/bin/env python3
"""Tiny, source-transparent freshness manifest for all four archives.

This never reinterprets source record dates as sync timestamps and never
claims that a cached snapshot represents complete archive history.
"""
from __future__ import annotations
from datetime import datetime,timezone
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]/"docs/data"
SOURCES={
    "arxiv":("arXiv","announcements.json"),
    "biorxiv":("bioRxiv","biorxiv.json"),
    "chemrxiv":("ChemRxiv","chemrxiv.json"),
    "eprint":("Cryptology ePrint","eprint.json"),
}
def generate(root=ROOT):
    root=Path(root)
    payload={"schema_version":1,"generated_at":datetime.now(timezone.utc).isoformat(),
             "meaning":"Snapshot timestamps and coverage, NOT live availability or complete historical indexing",
             "sources":{}}
    for key,(name,file) in SOURCES.items():
        state={"name":name,"available":False,"checked_at":None,
               "indexed_records":None,"coverage":"unknown"}
        path=root/file
        if path.is_file():
            try:
                raw=json.loads(path.read_text("utf8"))
                records=raw.get("papers")
                if isinstance(records,list):
                    stamp=raw.get("checked_at") or raw.get("generated_at")
                    if stamp and isinstance(stamp,str):
                        dt=datetime.fromisoformat(stamp.replace("Z","+00:00"))
                        if dt.tzinfo is None:dt=dt.replace(tzinfo=timezone.utc)
                        stamp=dt.astimezone(timezone.utc).isoformat()
                    else:stamp=None
                    state.update(available=True,checked_at=stamp,
                                 indexed_records=len(records))
                    if key=="arxiv":
                        state["coverage"]="announcement-batch" if raw.get("complete") is True else "partial-or-unverified-announcements"
                    elif key=="biorxiv":
                        state["coverage"]="bounded-recent-window" if raw.get("complete_window") is True else "partial-window"
                    elif key=="chemrxiv":
                        state["coverage"]="DOI-prefix-window" if raw.get("prefix_exhausted") is True else "partial-DOI-discovery"
                    else:
                        state["coverage"]="available-OAI-history-traversed" if raw.get("historical_oai_traversal_complete") is True else "partial-OAI-history"
            except (ValueError,TypeError,OSError):
                state["coverage"]="invalid-or-unavailable"
        payload["sources"][key]=state
    out=root/"source-freshness.json"
    out.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
    print("Source freshness summary:",{k:{"available":v["available"],"coverage":v["coverage"]} for k,v in payload["sources"].items()})
    return payload
if __name__=="__main__":generate()
