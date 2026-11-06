#!/usr/bin/env python3
"""Cache verified ChemRxiv DOI records without requiring a commercial API key.

ChemRxiv moved its hosting platform in 2026. Crossref is used for source
metadata discovery; only DOI records explicitly identifying ChemRxiv survive.
A failed harvest preserves any previous verified snapshot. Do not manufacture
papers or claim full-archive coverage.
"""
from __future__ import annotations
import datetime as dt
import json
import pathlib
import re
import urllib.parse
import urllib.request
import urllib.error
import time
import tempfile
import os

TARGET=pathlib.Path(__file__).resolve().parents[1]/"docs/data/chemrxiv.json"
DOI=re.compile(r"^10\.\d{4,9}/[^\s]+$", re.I)

def is_chemrxiv(item):
    doi=str(item.get("DOI") or "").lower()
    # ChemRxiv's registered DOI families; accept explicit journal/container
    # attribution as an alternative for hosting-platform migrations.
    text=" ".join(str(item.get(k) or "") for k in ("publisher","institution","group-title","container-title")).lower()
    return bool(DOI.fullmatch(doi)) and ("chemrxiv" in doi or "chemrxiv" in text)

def normalize(item):
    if not is_chemrxiv(item):return None
    doi=item["DOI"]
    title=item.get("title") or []
    if not isinstance(title,list):title=[str(title)]
    title=" ".join(str(title[0] if title else "").split())
    if not title:return None
    dateparts=((item.get("published") or item.get("posted") or {}).get("date-parts") or [[]])[0]
    day="-".join(str(p).zfill(2) for p in dateparts[:3]) if len(dateparts)>=3 else ""
    author=item.get("author") or []
    names=[(" ".join(str(a.get(k,"")).strip() for k in ("given","family"))).strip() for a in author if isinstance(a,dict)]
    raw_abstract=re.sub(r"<[^>]+>"," ",str(item.get("abstract") or ""))
    subjects=item.get("subject") or []
    if not isinstance(subjects,list):subjects=[]
    return {"doi":doi,"title":title,"authors":[n for n in names if n][:75],
      "abstract":" ".join(raw_abstract.split())[:10000],"date":day,
      "category":", ".join(map(str,subjects[:4]))[:180],"source":"ChemRxiv",
      "url":"https://doi.org/"+doi}

def get_json(url, opener=None, sleep=time.sleep):
    opener = opener or urllib.request.urlopen
    req = urllib.request.Request(url,headers={
        "User-Agent":os.getenv("AXIOVO_CROSSREF_USER_AGENT",
          "Axiovo/1.2 (https://github.com/pritam-roy-99/axiovo; scholarly metadata)"),
        "Accept":"application/json"})
    for attempt in range(4):
        try:
            with opener(req,timeout=50) as response:
                return json.load(response)
        except (OSError, ValueError) as error:
            if isinstance(error, urllib.error.HTTPError) and error.code not in (429,500,502,503,504):
                raise
            if attempt==3: raise
            sleep((6,15,35)[attempt])
    raise RuntimeError("Crossref unavailable")

def fetch(fetcher=get_json,sleep=time.sleep,max_pages=8):
    """Cursor-paginate the ChemRxiv DOI prefix, then check recent labelled records."""
    index={}
    checks=[]
    cursor="*"
    prefix_exhausted=False
    for page in range(max_pages):
        url="https://api.crossref.org/prefixes/10.26434/works?"+urllib.parse.urlencode({
            "cursor":cursor,"rows":250,"select":"DOI,title,author,publisher,institution,group-title,container-title,published,posted,subject,abstract"})
        try:
            payload=fetcher(url)
            message=payload.get("message") or {}
            rows=message.get("items") or []
            if not isinstance(rows,list):raise ValueError("Crossref items malformed")
            for row in rows:
                if isinstance(row,dict) and is_chemrxiv(row):
                    index[row["DOI"].lower()]=row
            checks.append({"provider":"Crossref ChemRxiv DOI prefix","page":page+1,"returned":len(rows)})
            if len(rows)<250:
                prefix_exhausted=True
                break
            new_cursor=message.get("next-cursor")
            if not new_cursor or new_cursor==cursor:
                break
            cursor=new_cursor
            sleep(1.1)
        except (OSError,ValueError) as error:
            checks.append({"provider":"Crossref ChemRxiv DOI prefix","error":str(error)[:150]})
            break
    # Secondary recent search catches publisher/hosting changes outside prefix.
    url="https://api.crossref.org/works?"+urllib.parse.urlencode({
        "query.bibliographic":"ChemRxiv","filter":"type:posted-content",
        "sort":"published","order":"desc","rows":300})
    try:
        message=(fetcher(url).get("message") or {})
        rows=message.get("items") or []
        for row in rows:
            if isinstance(row,dict) and is_chemrxiv(row):
                index[row["DOI"].lower()]=row
        checks.append({"provider":"Crossref labelled preprints","returned":len(rows)})
    except (OSError,ValueError) as error:
        checks.append({"provider":"Crossref labelled preprints","error":str(error)[:150]})
    return list(index.values()), {"prefix_pages_checked":len([x for x in checks if x.get("page")]),
        "prefix_exhausted":prefix_exhausted, "checks":checks}


def main():
    previous={}
    try:previous=json.loads(TARGET.read_text(encoding="utf-8"))
    except (ValueError,OSError):pass
    records, status=fetch()
    index={p["doi"].lower():p for p in previous.get("papers",[]) if isinstance(p,dict) and p.get("doi")}
    fresh=0
    for row in records:
       item=normalize(row)
       if item:
          index[item["doi"].lower()]=item
          fresh+=1
    if not fresh:
       if previous.get("papers"):
          print("WARNING: no newly verified ChemRxiv metadata, preserving snapshot")
          return
       raise RuntimeError("No verified ChemRxiv DOI records returned from Crossref; leave feed unavailable")
    papers=sorted(index.values(),key=lambda p:(p.get("date",""),p["doi"]),reverse=True)[:3000]
    payload={"generated_at":dt.datetime.now(dt.timezone.utc).isoformat(),
       "source":"Crossref records explicitly identifying ChemRxiv",
       "coverage":"Crossref DOI-indexed metadata; prefix pagination status is reported and full ChemRxiv recall is not guaranteed.",
       "count":len(papers),"papers":papers,**status}
    TARGET.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile("w",dir=TARGET.parent,encoding="utf-8",delete=False) as stream:
       json.dump(payload,stream,ensure_ascii=False,separators=(",",":"))
       stream.write("\n")
       temp=pathlib.Path(stream.name)
    temp.replace(TARGET)
    print("ChemRxiv indexed",len(papers),"verified DOI records; new matched",fresh)

if __name__=="__main__":main()
