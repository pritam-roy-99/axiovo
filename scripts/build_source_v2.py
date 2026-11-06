"""Additive, integrity-checked v2 metadata index; v1 and local Library untouched.

Source snapshots may be incomplete. A successful fetch or index build cannot
certify full archive or complete date coverage. v2 always reports partial.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import tempfile

try:
    from scripts.record_contract import InvalidRecord, normalize_record, revision_key, choose_same_revision
except ModuleNotFoundError:
    from record_contract import InvalidRecord, normalize_record, revision_key, choose_same_revision

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data"
OUTPUT = DATA / "index" / "v2"
INPUTS = (
    ("arxiv", "feed.json"), ("arxiv", "oai-recent.json"),
    ("arxiv", "announcements.json"), ("biorxiv", "biorxiv.json"),
    ("chemrxiv", "chemrxiv.json"),
)


def encode(document):
    return (json.dumps(document, sort_keys=True, ensure_ascii=False,
                       separators=(",", ":")) + "\n").encode("utf-8")


def verified_write(path, document):
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = encode(document)
    path.write_bytes(payload)
    return hashlib.sha256(payload).hexdigest(), len(payload)


def _valid_relative(rel):
    path = PurePosixPath(rel)
    return (not path.is_absolute() and
            ".." not in path.parts and path.suffix == ".json" and
            len(path.parts) == 2)


def verify_index(folder):
    folder = Path(folder)
    manifest = json.loads((folder / "manifest.json").read_text("utf-8"))
    if manifest.get("schema_version") != 2:
        raise ValueError("manifest_schema_mismatch")
    if manifest.get("coverage_status") != "partial-snapshots-not-full-archives":
        raise ValueError("unsubstantiated_completeness")
    total = 0
    counted = Counter()
    seen = set()
    for shard in manifest.get("shards", []):
        rel = shard["path"]
        if not _valid_relative(rel) or rel in seen:
            raise ValueError("invalid_or_duplicate_shard_path")
        seen.add(rel)
        raw = (folder / rel).read_bytes()
        if hashlib.sha256(raw).hexdigest() != shard["sha256"]:
            raise ValueError("shard_sha256_mismatch:" + rel)
        if len(raw) != shard["bytes"]:
            raise ValueError("shard_byte_count_mismatch:" + rel)
        document = json.loads(raw)
        papers = document.get("papers")
        if document.get("schema_version") != 2 or not isinstance(papers, list):
            raise ValueError("invalid_shard:" + rel)
        if len(papers) != shard["count"]:
            raise ValueError("shard_record_count_mismatch:" + rel)
        if document.get("coverage") != "partial-source-snapshot":
            raise ValueError("shard_claims_complete:" + rel)
        for paper in papers:
            if paper.get("schema_version") != 2:
                raise ValueError("invalid_record_schema")
            if not paper.get("validation", {}).get("identity_verified"):
                raise ValueError("unverified_record")
            key = revision_key(paper)
            if key in counted:
                raise ValueError("duplicate_pinned_revision")
            counted[key] += 1
        total += len(papers)
    if total != manifest.get("record_count") or total != sum(manifest.get("by_source", {}).values()):
        raise ValueError("manifest_total_mismatch")
    if manifest.get("complete_dates"):
        raise ValueError("unsupported_complete_date_claim")
    return manifest


def build(data_dir=DATA, out_dir=OUTPUT):
    data_dir, out_dir = Path(data_dir), Path(out_dir)
    records = {}
    source_counts = {}
    last_success = {}
    missing = []
    rejected = Counter()
    rejection_reasons = Counter()
    for source, name in INPUTS:
        path = data_dir / name
        if not path.exists():
            missing.append(name)
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict) or not isinstance(payload.get("papers"), list):
                raise ValueError("invalid_snapshot_schema")
        except (OSError, ValueError, UnicodeError):
            missing.append(name)
            continue
        source_counts[name] = len(payload["papers"])
        checked_at = payload.get("checked_at") or payload.get("generated_at")
        if checked_at:
            last_success[name] = checked_at
        for raw in payload["papers"]:
            try:
                item = normalize_record(source, raw, provider=name,
                        checked_at=checked_at, source_record=name)
            except InvalidRecord as error:
                rejected[name] += 1
                rejection_reasons[str(error)] += 1
                continue
            key = revision_key(item)
            records[key] = choose_same_revision(records[key], item) if key in records else item
    # A missing upstream API must never publish a replacement empty index.
    if not records:
        raise ValueError("No valid source records; previous verified index preserved")

    groups = defaultdict(list)
    by_source = Counter()
    by_day = defaultdict(Counter)
    for item in records.values():
        source = item["source"]
        month = (item["submitted_date"] or item["announced_date"] or "undated")[:7]
        groups[(source, month)].append(item)
        by_source[source] += 1
        if item["submitted_date"]:
            by_day[source][item["submitted_date"]] += 1

    out_dir.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="axiovo-v2-stage-", dir=out_dir.parent) as stage:
        stage = Path(stage)
        shards = []
        for (source, month), papers in sorted(groups.items()):
            papers.sort(key=lambda p: (p["id"], p["version"] or 0))
            rel = f"{source}/{month}.json"
            digest, nbytes = verified_write(stage / rel, {
                "schema_version": 2, "source": source, "month": month,
                "coverage": "partial-source-snapshot", "count": len(papers),
                "papers": papers
            })
            shards.append({"path": rel, "source": source, "month": month,
                           "count": len(papers), "sha256": digest, "bytes": nbytes})
        manifest = {
            "schema_version": 2,
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "coverage_status": "partial-snapshots-not-full-archives",
            "completeness": "not-certified",
            "complete_dates": [],
            "record_count": len(records),
            "by_source": dict(sorted(by_source.items())),
            "source_input_counts": source_counts,
            "last_success_by_snapshot": last_success,
            "missing_inputs": missing,
            "rejected_records_by_snapshot": dict(rejected),
            "rejection_reasons": dict(rejection_reasons),
            "daily_counts_observed_not_complete": {key: dict(sorted(value.items()))
                        for key, value in sorted(by_day.items())},
            "shards": shards,
            "note": "Only available official-source snapshots are indexed. Observed daily counts are not complete archive counts."
        }
        verified_write(stage / "manifest.json", manifest)
        verify_index(stage)
        # The previous v2 remains intact until a complete staging validation.
        # Atomic per-file replacement prevents partial JSON writes. The manifest
        # is replaced last, so readers always have a consistent published view
        # after this function returns; deployment uploads only after completion.
        out_dir.mkdir(parents=True, exist_ok=True)
        for shard in shards:
            dest = out_dir / shard["path"]
            dest.parent.mkdir(parents=True, exist_ok=True)
            os.replace(stage / shard["path"], dest)
        os.replace(stage / "manifest.json", out_dir / "manifest.json")
    return verify_index(out_dir)


if __name__ == "__main__":
    report = build()
    print(f"Axiovo v2: {report['record_count']} validated revision records; "
          f"{len(report['shards'])} checked shards; coverage is partial.")
