"""Reproducible bounded BM25 postings built only from verified v2 source shards."""
from __future__ import annotations
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import re
import tempfile
import os
from scripts.build_source_v2 import verify_index, encode

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs/data/index/v2"
OUT=ROOT/"docs/data/search-index/v1"
TOKEN=re.compile(r"[\w]+(?:[.-][\w]+)*",re.UNICODE)
STOP={"a","an","the","and","or","in","with","for","by","to","from","as","at","of","on","is","be"}

def terms(s):
    return [w for w in TOKEN.findall(str(s or "").casefold()) if len(w)>1 and w not in STOP][:1200]

def build(source=SOURCE,out=OUT):
    source,out=Path(source),Path(out)
    catalog=verify_index(source)
    out.mkdir(parents=True,exist_ok=True)
    shards=[]
    for input_shard in catalog["shards"]:
        data=json.loads((source/input_shard["path"]).read_text("utf-8"))
        entries=[]
        for p in data["papers"]:
            if not p.get("validation",{}).get("identity_verified"):
                raise ValueError("Unverified paper in search postings")
            if not p.get("landing_url"):
                raise ValueError("Missing original source link")
            fields={
                "title":terms(p["title"]),"abstract":terms(p.get("abstract")),
                "authors":terms(" ".join(a.get("name","") for a in p.get("authors",[]))),
                "categories":terms(" ".join(p.get("categories",[]))),
                "identifier":terms(p.get("source_id"))
            }
            posting=defaultdict(dict)
            for field,words in fields.items():
                for word in words:
                    posting[word][field]=posting[word].get(field,0)+1
            entries.append({"id":p["id"],"version":p["version"],
                            "source":p["source"],"landing_url":p["landing_url"],
                            "document_length":sum(map(len,fields.values())),
                            "terms":dict(sorted(posting.items()))})
        relative=input_shard["path"]
        output=out/relative
        output.parent.mkdir(parents=True,exist_ok=True)
        raw=encode({"schema_version":1,"source_shard":relative,
                    "source_sha256":input_shard["sha256"],
                    "count":len(entries),"documents":entries})
        with tempfile.NamedTemporaryFile("wb",dir=output.parent,delete=False) as fp:
            fp.write(raw);tmp=Path(fp.name)
        os.replace(tmp,output)
        shards.append({"path":relative,"count":len(entries),
                       "sha256":hashlib.sha256(raw).hexdigest(),
                       "source_sha256":input_shard["sha256"]})
    manifest={"schema_version":1,"coverage":"partial-source-snapshots",
              "documents":sum(x["count"] for x in shards),"shards":shards,
              "note":"Terms are lexical index entries for source-verified records only; no semantic model is claimed."}
    (out/"manifest.json").write_bytes(encode(manifest))
    verify(out,source)
    return manifest

def verify(out=OUT,source=SOURCE):
    out,source=Path(out),Path(source)
    manifest=json.loads((out/"manifest.json").read_text("utf-8"))
    records=verify_index(source)
    originals={x["path"]:x for x in records["shards"]}
    if manifest["coverage"]!="partial-source-snapshots":raise ValueError("Invalid coverage")
    counted=0
    for item in manifest["shards"]:
        if item["path"] not in originals or originals[item["path"]]["sha256"]!=item["source_sha256"]:
            raise ValueError("Source manifest mismatch")
        raw=(out/item["path"]).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=item["sha256"]:raise ValueError("Search index checksum mismatch")
        page=json.loads(raw)
        if page["source_sha256"]!=item["source_sha256"] or len(page["documents"])!=item["count"]:
            raise ValueError("Postings count mismatch")
        counted+=item["count"]
    if counted!=manifest["documents"] or counted!=records["record_count"]:
        raise ValueError("Indexed document count mismatch")
    return manifest

if __name__=="__main__":
    report=build()
    print("Indexed",report["documents"],"verified source revisions in",len(report["shards"]),"lexical shards")
