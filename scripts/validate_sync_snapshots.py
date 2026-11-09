#!/usr/bin/env python3
"""Protect published archive snapshots from regressions and unnecessary commits.

Runs after independent source harvesters. Never publish an empty/malformed
snapshot, a previously completed announcement day as an incomplete day, or an
older announcement batch. Timestamp-only refreshes do not trigger deployments.
"""
from __future__ import annotations
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs/data"
FILES = ("announcements.json", "feed.json", "oai-recent.json",
         "biorxiv.json", "chemrxiv.json", "eprint.json")
TEMPORAL = {"checked_at", "generated_at"}

def read_old(path: str):
    # The checkout can lag another running harvester. Prefer the freshly
    # fetched remote main so a late job cannot roll back a newer snapshot.
    result = subprocess.run(["git", "show", f"origin/main:docs/data/{path}"],
                            cwd=ROOT, capture_output=True, check=False)
    if result.returncode:
        result = subprocess.run(["git", "show", f"HEAD:docs/data/{path}"],
                                cwd=ROOT, capture_output=True, check=False)
    if result.returncode:
        return None, None
    try:
        return json.loads(result.stdout), result.stdout
    except (ValueError, UnicodeDecodeError):
        raise RuntimeError(f"Committed source snapshot invalid: {path}")

def equivalent(previous, updated):
    if not isinstance(previous, dict) or not isinstance(updated, dict):
        return previous == updated
    a = {k: v for k, v in previous.items() if k not in TEMPORAL}
    b = {k: v for k, v in updated.items() if k not in TEMPORAL}
    return a == b

def acceptable(name, older, newer):
    papers = newer.get("papers")
    if not isinstance(papers, list) or not papers:
        return False, "No valid paper collection"
    if name == "announcements.json":
        day = str(newer.get("announcement_date") or "")
        if len(day) != 10 or newer.get("count") != len(papers):
            return False, "Invalid announcement date or paper count"
        if len({p.get("id") for p in papers if isinstance(p, dict)}) != len(papers):
            return False, "Duplicate or malformed arXiv identifiers"
        if isinstance(older, dict):
            prior_day = str(older.get("announcement_date") or "")
            if day < prior_day:
                return False, "Older arXiv announcement date"
            if day == prior_day and older.get("complete") is True and newer.get("complete") is not True:
                return False, "Completeness regression on same announcement day"
            # RSS is the authoritative complete daily listing. A provisional
            # catch-up HTML batch may contain extra or duplicated records;
            # permit a complete RSS reconciliation even when its count differs.
            final_rss = newer.get("complete") is True and older.get("early_release") is True
            if day == prior_day and len(papers) < len(older.get("papers") or []) and not final_rss:
                return False, "Missing records from an existing announcement batch"
    elif name == "feed.json":
        if newer.get("paper_count") != len(papers):
            return False, "Rolling feed count mismatch"
    elif name == "biorxiv.json":
        if newer.get("count") != len(papers):
            return False, "bioRxiv count mismatch"
        if isinstance(older, dict) and older.get("complete_window") and not newer.get("complete_window"):
            return False, "Previously verified bioRxiv window became incomplete"
    elif name == "chemrxiv.json":
        if newer.get("count") != len(papers):
            return False, "ChemRxiv count mismatch"
    elif name == "eprint.json":
        if newer.get("known_records") != len(papers):
            return False, "ePrint count mismatch"
        if isinstance(older, dict) and len(papers) < len(older.get("papers") or []):
            return False, "ePrint metadata unexpectedly lost previously indexed records"
    return True, "verified"

def validate():
    changed = []
    for name in FILES:
        path = DATA / name
        old, raw = read_old(name)
        if not path.is_file():
            if raw is not None:
                path.write_bytes(raw)
            print(f"WARNING {name}: file absent; prior snapshot retained")
            continue
        try:
            new = json.loads(path.read_text(encoding="utf8"))
            if not isinstance(new, dict):
                raise ValueError("Expected metadata object")
            ok, reason = acceptable(name, old, new)
        except (OSError, ValueError, TypeError, AttributeError) as error:
            ok, reason = False, str(error)
        if not ok or equivalent(old, new):
            if raw is not None:
                path.write_bytes(raw)
            else:
                path.unlink(missing_ok=True)
            print(f"{name}: {'unchanged' if ok else 'REJECTED: '+reason}")
        else:
            changed.append(name)
            print(f"{name}: accepted validated metadata update")
    print("Accepted source changes:", ", ".join(changed) or "none")
    return changed

if __name__ == "__main__":
    validate()
