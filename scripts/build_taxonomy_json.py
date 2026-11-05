#!/usr/bin/env python3
"""Compile Axiovo's existing curated TSV taxonomy into a versioned JSON tree.

Never infer examples or paper classifications. Curated nodes carry no measured
semantic confidence until a separately tested classifier produces one.
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from .build_normalized_index import output_json

ROOT = Path(__file__).resolve().parents[1]
TOPICS = ROOT / "docs" / "data" / "topics"
DEST = ROOT / "docs" / "data" / "taxonomy" / "v1.json"


def slug(label):
    return re.sub(r"[^a-z0-9]+", "-", label.casefold()).strip("-")


def build(taxonomy_dir=TOPICS, output=DEST):
    nodes=[]
    for source in ("arxiv", "biorxiv", "chemrxiv"):
        path=taxonomy_dir / (source+".tsv")
        if not path.exists():
            raise FileNotFoundError(path)
        known=set()
        root=source+":root"
        nodes.append({"id":root, "label":source, "parent":None,
                      "level":"archive", "description":"",
                      "keywords":[], "example_papers":[]})
        for raw in path.read_text(encoding="utf-8").splitlines():
            if not raw.strip() or raw.startswith("#"):
                continue
            code,separator,branches=raw.partition("\t")
            if not separator or not branches:
                raise ValueError("Malformed taxonomy row: "+raw[:70])
            subject=source+":"+code
            if subject in known:
                raise ValueError("Duplicate taxonomy subject "+code)
            known.add(subject)
            nodes.append({"id":subject, "label":code, "parent":root,
                          "level":"subject", "description":"",
                          "keywords":[code], "example_papers":[]})
            for branch in branches.split("|"):
                label,sep,children=branch.partition(">")
                if not sep or not label or not children:
                    raise ValueError("Malformed topic in "+code)
                topic_id=subject+"/"+slug(label)
                if topic_id in known:
                    raise ValueError("Duplicate topic "+topic_id)
                known.add(topic_id)
                nodes.append({"id":topic_id, "label":label, "parent":subject,
                              "level":"subfield", "description":"",
                              "keywords":[label], "example_papers":[]})
                for child in children.split(";"):
                    parts=[x.strip() for x in child.split("~") if x.strip()]
                    if not parts:
                        raise ValueError("Empty sub-subtopic in "+topic_id)
                    leaf_id=topic_id+"/"+slug(parts[0])
                    if leaf_id in known:
                        raise ValueError("Duplicate sub-subtopic "+leaf_id)
                    known.add(leaf_id)
                    nodes.append({"id":leaf_id, "label":parts[0], "parent":topic_id,
                                  "level":"subtopic", "description":"",
                                  "keywords":list(dict.fromkeys(parts)), "example_papers":[]})
    node_ids={node["id"] for node in nodes}
    if len(node_ids)!=len(nodes):
        raise ValueError("Taxonomy node IDs are not unique")
    if any(node["parent"] not in node_ids for node in nodes if node["parent"] is not None):
        raise ValueError("Taxonomy has an orphaned node")
    result={"schema_version":1,"source":"Axiovo manually curated topic TSV catalogs",
            "status":"curated-navigation-not-validated-ML-tags","nodes":nodes}
    output_json(output,result)
    return result


if __name__=="__main__":
    data=build()
    print("Built",len(data["nodes"]),"curated taxonomy nodes with parent links.")
