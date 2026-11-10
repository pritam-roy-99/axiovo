#!/usr/bin/env python3
"""Stage a smaller GitHub Pages release without removing any committed archive data.

Historical arXiv daily JSON remains in the public GitHub repository and is
read by the browser through the explicit GitHub-raw fallback in
docs/arxiv-daily-archive.js. The recent daily snapshots, manifest, all other
archives, application assets, and every HTML/JS/CSS feature remain on Pages.
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs"


def stage(destination: Path, keep_days: int = 7) -> dict:
    if keep_days < 7:
        raise ValueError("keep_days must retain at least a week")
    manifest_path = SOURCE / "data/arxiv-days/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    complete = [
        date.fromisoformat(day)
        for day, item in manifest.get("days", {}).items()
        if item.get("complete") is True and item.get("count", 0) > 0
    ]
    if not complete:
        raise ValueError("Cannot stage: no verified arXiv daily archive manifest")
    cutoff = max(complete) - timedelta(days=keep_days - 1)
    source_shards = SOURCE / "data/arxiv-days"
    before = sorted(source_shards.glob("????-??-??.json"))
    valid_names = set(manifest["days"])
    for shard in before:
        if shard.stem not in valid_names:
            raise ValueError(f"Unlisted daily shard, refusing to hide it: {shard}")

    destination = destination.resolve()
    if destination == SOURCE.resolve() or SOURCE.resolve() in destination.parents:
        raise ValueError("Staging must never write into the source website directory")
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(SOURCE, destination)
    staged_days = destination / "data/arxiv-days"
    removed = []
    for shard in sorted(staged_days.glob("????-??-??.json")):
        if date.fromisoformat(shard.stem) < cutoff:
            shard.unlink()
            removed.append(shard.name)

    # Large source-verified monthly JSON is preserved in GitHub rather than
    # duplicated in the Pages artifact. The current browser application uses
    # the published manifests, compact feed and live/snapshot providers, not
    # these archived monthly materializations.
    archived_monthly = 0
    for subdir in ("data/index/v1", "data/records"):
        root = destination / subdir
        if root.exists():
            for item in root.rglob("*.json"):
                if item.name == "manifest.json":
                    continue
                # Remove only month-formatted materializations, not coverage
                # reports or control metadata.
                if not __import__("re").fullmatch(r"\d{4}-\d{2}", item.stem):
                    continue
                item.unlink()
                archived_monthly += 1

    # The full ePrint snapshot remains accessible from the same public repo
    # through the existing source-verified reader's GitHub raw fallback.
    eprint_path = destination / "data/eprint.json"
    raw_eprint = SOURCE / "data/eprint.json"
    if not raw_eprint.is_file() or raw_eprint.stat().st_size == 0:
        raise ValueError("Missing original ePrint snapshot")
    if eprint_path.is_file():
        eprint_path.unlink()

    # The authoritative index, original files and all other datasets stay intact.
    assert manifest_path.exists()
    assert (destination / "data/arxiv-days/manifest.json").is_file()
    assert (SOURCE / "data/eprint.json").is_file()
    assert (destination / "data/index/v1/manifest.json").is_file()
    assert (destination / "data/records/manifest.json").is_file()
    assert (destination / "data/biorxiv.json").is_file()
    assert (destination / "data/chemrxiv.json").is_file()
    assert (destination / "data/feed.json").is_file()
    assert (destination / "arxiv-daily-archive.js").is_file()
    assert len(before) == len(list(staged_days.glob("????-??-??.json"))) + len(removed)
    source_size = sum(p.stat().st_size for p in SOURCE.rglob("*") if p.is_file())
    stage_size = sum(p.stat().st_size for p in destination.rglob("*") if p.is_file())
    if stage_size >= source_size:
        raise ValueError("No staging size reduction: refusing ineffective release")
    result = {
        "source_bytes": source_size, "staged_bytes": stage_size,
        "published_file_count": sum(1 for p in destination.rglob("*") if p.is_file()),
        "saved_bytes": source_size - stage_size,
        "source_daily_shards": len(before),
        "published_daily_shards": len(before) - len(removed),
        "github_raw_daily_shards": len(removed),
        "monthly_records_retained_in_git": archived_monthly,
        "eprint_snapshots_retained_in_git": 1,
        "recent_day_cutoff": cutoff.isoformat(),
        "data_retained_in_repository": True,
    }
    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/stage_pages.py OUTPUT_DIRECTORY")
    stage(Path(sys.argv[1]))
