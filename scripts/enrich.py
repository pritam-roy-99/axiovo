"""Optional, rate-limited OpenAlex citation metadata enrichment.

Requires OPENALEX_API_KEY (GitHub Actions secret or local environment). This script
does not claim theorem equivalence and does not change novelty assessments.
Unverified or ambiguous title matches are discarded.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request

from scripts.sync import TARGET

def normalize_title(text):
    return " ".join(re.findall(r"[a-z0-9]+", (text or "").lower()))

def title_match(a,b):
    return bool(a and b and normalize_title(a)==normalize_title(b))

def query_openalex(paper,api_key):
    params=urllib.parse.urlencode({"search":paper["title"],"per-page":3,"api_key":api_key,
                                   "select":"id,title,publication_year,cited_by_count,referenced_works,doi"})
    req=urllib.request.Request("https://api.openalex.org/works?"+params,
             headers={"User-Agent":"ResearchLens-MVP/0.2 (https://github.com/pritam-roy-99/researchlens)"})
    with urllib.request.urlopen(req,timeout=25) as response:
        payload=json.load(response)
    candidates=[x for x in payload.get("results",[]) if title_match(paper["title"],x.get("title",""))]
    year=int((paper.get("published") or "0000")[:4])
    candidates=[x for x in candidates if abs(int(x.get("publication_year") or 0)-year)<=2]
    if len(candidates)!=1:
        return None
    work=candidates[0]
    return {"openalex_id":work["id"],"citation_count":int(work.get("cited_by_count") or 0),
            "reference_count":len(work.get("referenced_works") or []),
            "openalex_checked":True}

def main():
    key=os.environ.get("OPENALEX_API_KEY","").strip()
    if not key:
        print("OPENALEX_API_KEY not set. Skipping optional citation enrichment.")
        return
    feed=json.loads(TARGET.read_text(encoding="utf-8"))
    papers=feed.get("papers",[])
    limit=min(25,max(1,int(os.getenv("OPENALEX_BATCH_SIZE","10"))))
    checked=0
    for paper in papers:
        if checked>=limit:
            break
        if paper.get("openalex_checked"):
            continue
        try:
            result=query_openalex(paper,key)
            if result:
                paper.update(result)
            else:
                paper["openalex_checked"]=True
            checked+=1
        except (OSError,ValueError,KeyError) as e:
            print("OpenAlex API unavailable:",str(e)[:180])
            break
        time.sleep(0.2)
    if checked:
        TARGET.write_text(json.dumps(feed,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print("OpenAlex records examined:",checked)

if __name__=="__main__":
    main()
