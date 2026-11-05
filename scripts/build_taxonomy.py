#!/usr/bin/env python3
"""Generate versioned hierarchical taxonomy without altering legacy TSV catalogs.

Every entry originates from an existing Axiovo TSV topic, not inferred papers.
Example paper IDs are intentionally empty until linked to verified records.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "data" / "topics"
DEST = ROOT / "docs" / "data" / "taxonomy.json"


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def compile_taxonomy():
    entries = []
    for archive in ("arxiv", "biorxiv", "chemrxiv"):
        file = SOURCE / (archive + ".tsv")
        for line in file.read_text(encoding="utf-8").splitlines():
            if not line.strip() or line.startswith("#"):
                continue
            code, branches = line.split("\t", 1)
            subject_id = archive + ":" + code
            entries.append({"id": subject_id, "source": archive,
                            "label": code, "parent": None,
                            "description": "Official archive subject " + code,
                            "keywords": [code], "example_papers": [],
                            "type": "archive_subject"})
            for branch in branches.split("|"):
                topic, children = branch.split(">", 1)
                topic = topic.strip()
                topic_id = subject_id + "/" + slug(topic)
                entries.append({"id": topic_id, "source": archive,
                                "label": topic, "parent": subject_id,
                                "description": "Research subfield within " + code + ": " + topic,
                                "keywords": [topic], "example_papers": [],
                                "type": "research_subfield"})
                for item in children.split(";"):
                    terms = [term.strip() for term in item.split("~") if term.strip()]
                    if not terms:
                        continue
                    leaf_id = topic_id + "/" + slug(terms[0])
                    entries.append({"id": leaf_id, "source": archive,
                                    "label": terms[0], "parent": topic_id,
                                    "description": terms[0] + " within " + topic,
                                    "keywords": terms, "example_papers": [],
                                    "type": "sub_subtopic"})
    ids = [row["id"] for row in entries]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate taxonomy IDs")
    payload = {"schema_version": 1,
               "description": "Versioned Axiovo topic hierarchy. Unreviewed categories are navigation labels, not ML certifications.",
               "entries": entries}
    DEST.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Compiled", len(entries), "taxonomy nodes")
    return payload


if __name__ == "__main__":
    compile_taxonomy()
