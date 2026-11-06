"""Generate a static, read-only paper lookup index from verified v2 shards.

This is not a dynamic /api/search endpoint. No private browser data is read.
"""
from __future__ import annotations

from collections import defaultdict
import hashlib
import json
import os
from pathlib import Path
import tempfile

from scripts.build_source_v2 import verify_index, encode

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "data" / "index" / "v2"
TARGET = ROOT / "docs" / "data" / "api" / "v1"


def build(source=SOURCE, output=TARGET):
    source, output = Path(source), Path(output)
    validated = verify_index(source)
    entries = defaultdict(list)
    for item in validated["shards"]:
        shard = json.loads((source / item["path"]).read_text("utf8"))
        for paper in shard["papers"]:
            identity = str(paper["id"])
            if paper["validation"]["identity_verified"] is not True:
                raise ValueError("Unverified paper in static API")
            entries[paper["source"]].append({
                "id": identity, "version": paper["version"],
                "source_id": paper["source_id"], "title": paper["title"],
                "landing_url": paper["landing_url"],
                "shard": item["path"]
            })
    output.mkdir(parents=True, exist_ok=True)
    files = []
    for provider in ("arxiv", "biorxiv", "chemrxiv"):
        rows = sorted(entries[provider], key=lambda x:(x["id"],x["version"] or 0))
        payload = {"schema_version":1,"source":provider,
                   "coverage":"verified-partial-source-index",
                   "record_count":len(rows),"records":rows}
        body = encode(payload)
        dest = output / (provider+".json")
        with tempfile.NamedTemporaryFile("wb", dir=output, delete=False) as fp:
            fp.write(body);temporary=Path(fp.name)
        os.replace(temporary,dest)
        files.append({"path":provider+".json","count":len(rows),
                      "sha256":hashlib.sha256(body).hexdigest()})
    manifest = {"schema_version":1,"coverage":"partial-not-complete",
                "source_manifest":"../../index/v2/manifest.json",
                "record_count":sum(row["count"] for row in files),"shards":files,
                "warning":"Static lookup index only; no full-archive search guarantee and no private user data."}
    (output/"manifest.json").write_bytes(encode(manifest))
    verify(output)
    return manifest


def verify(output=TARGET):
    output=Path(output)
    manifest=json.loads((output/"manifest.json").read_text("utf8"))
    if manifest["coverage"]!="partial-not-complete":
        raise ValueError("Unsupported completeness claim")
    total=0
    for shard in manifest["shards"]:
        path=output/shard["path"]
        if path.parent != output or not path.is_file():
            raise ValueError("Invalid API file")
        raw=path.read_bytes()
        if hashlib.sha256(raw).hexdigest()!=shard["sha256"]:
            raise ValueError("API checksum mismatch")
        data=json.loads(raw)
        if data["record_count"]!=shard["count"]:
            raise ValueError("API count mismatch")
        if any("private" in r for r in data["records"]):
            raise ValueError("Private field leaked")
        total+=shard["count"]
    if total!=manifest["record_count"]:
        raise ValueError("API manifest count mismatch")
    return manifest


if __name__=="__main__":
    m=build()
    print("Axiovo static public lookup:",m["record_count"],"verified version-specific entries")
