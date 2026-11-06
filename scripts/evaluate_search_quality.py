"""Evaluate independently labeled ranked search results, never invented judgments.

Schema: {"queries":[{"id":"q1","discipline":"physics","split":"held-out",
"relevant":["arxiv:..."],"retrieved":["arxiv:..."]}]}
Labeled corpus recall is NOT full historical archive recall.
"""
from __future__ import annotations
from collections import defaultdict
import json
import math
from pathlib import Path

def score(queries):
    report={}
    by=defaultdict(list)
    for row in queries:
        relevant=set(row.get("relevant") or [])
        ranking=list(dict.fromkeys(row.get("retrieved") or []))
        if not relevant:continue
        p10=sum(x in relevant for x in ranking[:10])/10
        recall50=sum(x in relevant for x in ranking[:50])/len(relevant)
        dcg=sum((1/math.log2(i+2)) for i,x in enumerate(ranking[:10]) if x in relevant)
        ideal=sum(1/math.log2(i+2) for i in range(min(10,len(relevant))))
        ndcg=dcg/ideal if ideal else 0
        rank=next((1/(i+1) for i,x in enumerate(ranking) if x in relevant),0)
        by[(row.get("split","unknown"),row.get("discipline","unknown"))].append(
            {"p10":p10,"recall50":recall50,"ndcg10":ndcg,"mrr":rank})
    for (split,discipline),values in sorted(by.items()):
        n=len(values)
        report[split+"|"+discipline]={"queries":n,
            **{k:round(sum(v[k] for v in values)/n,5) for k in ("p10","recall50","ndcg10","mrr")}}
    return report

def evaluate(filename,min_queries=100):
    data=json.loads(Path(filename).read_text("utf8"))
    rows=data.get("queries")
    if not isinstance(rows,list) or len(rows)<min_queries:
        raise ValueError("At least "+str(min_queries)+" independently judged queries required")
    if len({q.get("id") for q in rows})!=len(rows):
        raise ValueError("Query identifiers must be unique")
    if not any(q.get("split")=="held-out" for q in rows):
        raise ValueError("Missing held-out judgments")
    if not all(isinstance(q.get("relevant"),list) and isinstance(q.get("retrieved"),list) for q in rows):
        raise ValueError("Missing source-grounded relevance labels or retrieval outputs")
    return score(rows)

if __name__=="__main__":
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument("judgments",help="Expert-labeled query judgments JSON")
    args=parser.parse_args()
    print(json.dumps(evaluate(args.judgments),indent=2))
