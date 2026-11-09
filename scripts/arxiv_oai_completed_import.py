"""Import only completed arXiv OAI date windows into a SQLite index.

A window is eligible only when its checkpoint declares completion and its
numbered page shards are contiguous. Partial or replaying windows are skipped.
"""
import argparse
import json
from pathlib import Path
from scripts.arxiv_oai_sqlite import import_pages


def import_completed_windows(root, database):
    root = Path(root)
    imported = {}
    skipped = {}
    for directory in sorted(p for p in root.iterdir() if p.is_dir()):
        checkpoint = directory / "checkpoint.json"
        if not checkpoint.exists():
            skipped[directory.name] = "missing checkpoint"
            continue
        state = json.loads(checkpoint.read_text(encoding="utf8"))
        pages = int(state.get("pages", 0))
        if (not state.get("complete") or state.get("replay_pending") or
                state.get("next_token") or pages < 1):
            skipped[directory.name] = "incomplete or replaying"
            continue
        expected = [directory / f"page-{i:08d}.jsonl" for i in range(pages)]
        actual = sorted(directory.glob("page-*.jsonl"))
        if actual != expected:
            skipped[directory.name] = "missing or unexpected page shards"
            continue
        # SQLite importer uses page names as keys. Prefix the window name to
        # avoid collisions between windows, and stage into a temporary folder.
        import tempfile
        import shutil
        with tempfile.TemporaryDirectory() as tmp:
            stage = Path(tmp)
            for page in expected:
                shutil.copyfile(page, stage / f"page-{directory.name}-{page.stem[5:]}.jsonl")
            imported[directory.name] = import_pages(stage, database)
    return {"imported": imported, "skipped": skipped}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--database", required=True)
    args = parser.parse_args()
    print(json.dumps(import_completed_windows(args.source, args.database)))
