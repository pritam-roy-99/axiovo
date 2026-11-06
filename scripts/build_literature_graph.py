"""Build a verified-edge-only literature graph. No inferred citations.

Input is an optional curated/provider-exported data/citation-edges.json with
explicit citations. Missing input results in an empty, honestly labeled graph.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import tempfile
import os
from scripts.build_source_v2 import encode,verify_index

ROOT=Path(__file__).resolve().parents[1]
INDEX=ROOT/"docs/data/index/v2"
INPUT=ROOT/"docs/data/citation-edges.json"
OUT=ROOT/"docs/data/graph/v1"
IDENTITY=re.compile(r"^(?:arxiv|biorxiv|chemrxiv):[^ ]+$",re.I)

def build(index=INDEX,source=INPUT,out=OUT):
    index,source,out=Path(index),Path(source),Path(out)
    manifest=verify_index(index)
    identifiers=set()
    for shard in manifest["shards"]:
        page=json.loads((index/shard["path"]).read_text("utf8"))
        identifiers.update(p["id"] for p in page["papers"])
    raw=json.loads(source.read_text("utf8")) if source.exists() else {"edges":[]}
    if not isinstance(raw,dict) or not isinstance(raw.get("edges"),list):
        raise ValueError("Malformed citation edge input")
    edges,invalid,seen=[],0,set()
    for e in raw["edges"]:
        if not isinstance(e,dict):
            invalid+=1;continue
        typ=e.get("type")
        start=e.get("from")
        end=e.get("to")
        provider=e.get("provider")
        origin=e.get("source_record")
        if typ not in {"cites","journal-version-of"} or start not in identifiers or end not in identifiers or start==end or not provider or not isinstance(origin,str) or not origin.startswith("https://"):
            invalid+=1;continue
        key=(typ,start,end,provider,origin)
        if key in seen:continue
        seen.add(key)
        edges.append({"type":typ,"from":start,"to":end,
                      "provider":provider,"source_record":origin,
                      "checked_at":e.get("checked_at")})
    edges.sort(key=lambda x:(x["from"],x["to"],x["type"],x["provider"]))
    payload={"schema_version":1,"coverage":"explicit-provider-edges-only",
             "edge_count":len(edges),"rejected_count":invalid,
             "note":"No citation is inferred from title similarity; missing edges do not mean no citations.",
             "edges":edges}
    out.mkdir(parents=True,exist_ok=True)
    body=encode(payload)
    with tempfile.NamedTemporaryFile("wb",dir=out,delete=False) as fp:
        fp.write(body);temporary=Path(fp.name)
    os.replace(temporary,out/"edges.json")
    (out/"manifest.json").write_bytes(encode({
        "schema_version":1,"coverage":"partial-provider-reference-snapshots",
        "count":len(edges),"sha256":hashlib.sha256(body).hexdigest(),
        "source_snapshot_present":source.is_file()}))
    return payload

if __name__=="__main__":
    data=build()
    print("Explicit scholarly citation relations:",data["edge_count"],"(unobserved references not implied absent)")
