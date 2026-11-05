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

def fetch():
    # DOI-prefix endpoint retrieves ChemRxiv's historic family reliably even
    # when newer platform migration metadata lacks the word in title/publisher.
    params=urllib.parse.urlencode({"sort":"published","order":"desc","rows":300})
    urls=[
      "https://api.crossref.org/prefixes/10.26434/works?"+params,
      "https://api.crossref.org/works?"+urllib.parse.urlencode({
       "query.bibliographic":"ChemRxiv","filter":"type:posted-content",
       "sort":"published","order":"desc","rows":300})
    ]
    items=[]
    for url in urls:
      try:
        request=urllib.request.Request(url,headers={
          "User-Agent":"Axiovo/1.0 (research metadata; https://github.com/pritam-roy-99/axiovo)",
          "Accept":"application/json"})
        with urllib.request.urlopen(request,timeout=35) as response:
          value=json.load(response)
        items.extend((value.get("message") or {}).get("items") or [])
      except (OSError,ValueError) as error:
        print("WARNING: ChemRxiv discovery endpoint unavailable:",str(error)[:120])
    return items

def main():
    previous={}
    try:previous=json.loads(TARGET.read_text(encoding="utf-8"))
    except (ValueError,OSError):pass
    records=fetch()
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
    papers=sorted(index.values(),key=lambda p:(p.get("date",""),p["doi"]),reverse=True)[:750]
    payload={"generated_at":dt.datetime.now(dt.timezone.utc).isoformat(),
       "source":"Crossref records explicitly identifying ChemRxiv",
       "coverage":"Partial DOI-indexed metadata. Not a complete ChemRxiv catalogue.",
       "count":len(papers),"papers":papers}
    TARGET.parent.mkdir(parents=True,exist_ok=True)
    TARGET.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("ChemRxiv indexed",len(papers),"verified DOI records; new matched",fresh)

if __name__=="__main__":main()
