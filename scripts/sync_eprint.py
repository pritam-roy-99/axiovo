#!/usr/bin/env python3
"""IACR Cryptology ePrint OAI-PMH metadata harvester.

Metadata ONLY, from https://eprint.iacr.org/oai (oai_dc).
Paper PDFs are licensed individually and are never copied.
Revisions are not invented: OAI-PMH supplies current metadata, not all versions.
The metadata update datestamp is NOT the initial preprint posting date.

The harvest is transactional: network errors, exhausted budgets and malformed
XML preserve the last snapshot; incomplete windows are labeled partial.
"""
from __future__ import annotations

from datetime import date,datetime,timedelta,timezone
from email.utils import parsedate_to_datetime
import json,os,re,time
from pathlib import Path
import tempfile
from urllib.error import HTTPError,URLError
from urllib.parse import urlencode
from urllib.request import Request,urlopen
from xml.etree import ElementTree as ET

BASE="https://eprint.iacr.org/oai"
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"docs/data/eprint.json"
NAMESPACE={"o":"http://www.openarchives.org/OAI/2.0/",
           "d":"http://purl.org/dc/elements/1.1/"}
ID=re.compile(r"(?:^|/|:)((?:19|20)\d{2})/([1-9]\d{0,5})(?:$|[?#])")
USER_AGENT="AxiovoPublicMetadataHarvester/1.0 (github.com/pritam-roy-99/axiovo; contact via repository issues)"
RETRYABLE={429,500,502,503,504}

def canonical(raw):
    if not isinstance(raw,str):return None
    value=raw.strip()
    if value.startswith("https://eprint.iacr.org/"):
        value=value.removeprefix("https://eprint.iacr.org/")
    elif value.startswith("oai:eprint.iacr.org:"):
        value=value.removeprefix("oai:eprint.iacr.org:")
    elif value.startswith("eprint:"):
        value=value.removeprefix("eprint:")
    match=re.fullmatch(r"((?:19|20)\d{2})/([1-9]\d{0,5})",value)
    return f"{match[1]}/{int(match[2])}" if match else None

def date_only(value):
    value=str(value or "").strip()
    try:return date.fromisoformat(value[:10]).isoformat()
    except ValueError:return None

def parse_record(node):
    header=node.find("o:header",NAMESPACE)
    if header is None:return None
    identifiers=[header.findtext("o:identifier",default="",namespaces=NAMESPACE)]
    metadata=node.find("o:metadata",NAMESPACE)
    if metadata is not None:
        identifiers.extend(metadata.findall(".//d:identifier",NAMESPACE))
        identifiers=[x.text if isinstance(x,ET.Element) else x for x in identifiers]
    paper_id=next((c for x in identifiers if (c:=canonical(x))),None)
    if not paper_id:return None
    if header.get("status")=="deleted":return {"id":paper_id,"deleted":True}
    if metadata is None:return None
    def values(field):
        return [" ".join((elem.text or "").split())
                for elem in metadata.findall(".//d:"+field,NAMESPACE)
                if (elem.text or "").strip()]
    titles=values("title")
    if not titles:return None
    descriptions=values("description")
    dates=[v for v in values("date") if date_only(v)]
    categories=values("subject")
    stamp=date_only(header.findtext("o:datestamp",default="",namespaces=NAMESPACE))
    return {"id":paper_id,"title":titles[0],"authors":values("creator"),
            "abstract":descriptions[0] if descriptions else "",
            "categories":categories,
            "date":date_only(dates[0]) if dates else None,
            "metadata_updated":stamp,"provenance":"IACR ePrint OAI-PMH",
            "url":"https://eprint.iacr.org/"+paper_id}

def parse_page(raw):
    if len(raw)>12_000_000:raise ValueError("OAI response exceeds safety limit")
    root=ET.fromstring(raw)
    errors=root.findall("o:error",NAMESPACE)
    if errors:
        error=errors[0]
        raise ValueError("OAI-PMH error "+str(error.get("code"))+": "+str(error.text)[:160])
    records=[parse_record(x) for x in root.findall(".//o:ListRecords/o:record",NAMESPACE)]
    token=root.find(".//o:ListRecords/o:resumptionToken",NAMESPACE)
    next_token=(token.text or "").strip() if token is not None else ""
    if len(next_token)>4096:raise ValueError("Invalid OAI resumption token length")
    return [p for p in records if p],next_token

def request(params,retries=3):
    url=BASE+"?"+urlencode(params)
    for attempt in range(retries):
        try:
            with urlopen(Request(url,headers={"User-Agent":USER_AGENT,
                    "Accept":"application/xml,text/xml"}),timeout=25) as response:
                return response.read(12_000_001)
        except HTTPError as error:
            if error.code not in RETRYABLE or attempt==retries-1:raise
            wait=min(35,2**attempt*4)
            if error.headers.get("Retry-After"):
                try:wait=min(60,max(wait,float(error.headers["Retry-After"])))
                except ValueError:
                    try:wait=min(60,max(wait,(parsedate_to_datetime(error.headers["Retry-After"])-datetime.now(timezone.utc)).total_seconds()))
                    except Exception:pass
            time.sleep(max(0,wait))
        except (TimeoutError,URLError):
            if attempt==retries-1:raise
            time.sleep(2**attempt*3)
    raise RuntimeError("OAI request failed")

def collect(*,since,max_pages=12,pause=2.0):
    if not 1<=max_pages<=100:raise ValueError("Unsafe page budget")
    token=None;seen=set();all_rows=[];complete=False
    for page in range(max_pages):
        params={"verb":"ListRecords","resumptionToken":token} if token else {
            "verb":"ListRecords","metadataPrefix":"oai_dc","from":since}
        records,next_token=parse_page(request(params))
        all_rows.extend(records)
        if not next_token:
            complete=True;break
        if next_token in seen:raise ValueError("Repeated OAI continuation token")
        seen.add(next_token);token=next_token
        if pause:time.sleep(pause)
    return all_rows,complete

def write_snapshot(rows,out=OUT,since=None,complete=False,*,permit_empty=False):
    out=Path(out)
    previous=None
    if out.exists():
        try:previous=json.loads(out.read_text("utf8"))
        except (OSError,ValueError):previous=None
    combined={}
    for paper in (previous or {}).get("papers",[]):
        item=canonical(paper.get("id"))
        if item:combined[item]=paper
    for row in rows:
        paper_id=canonical(row.get("id"))
        if not paper_id:continue
        if row.get("deleted"):
            combined.pop(paper_id,None);continue
        if not row.get("title"):continue
        combined[paper_id]=row
    if not combined and not permit_empty:
        raise ValueError("No valid ePrint records; old snapshot preserved")
    papers=sorted(combined.values(),key=lambda p:(p.get("date") or "",p["id"]),reverse=True)
    payload={
        "source":"eprint","provider":"IACR Cryptology ePrint Archive OAI-PMH",
        "generated_at":datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "coverage":"incremental-OAI-PMH-snapshot-not-full-history",
        "complete_requested_window":bool(complete),
        "requested_from":since,
        "known_records":len(papers),
        "no_claim_of_full_historical_coverage":True,
        "papers":papers}
    out.parent.mkdir(parents=True,exist_ok=True)
    data=(json.dumps(payload,ensure_ascii=False,separators=(",",":"))+"\n").encode()
    with tempfile.NamedTemporaryFile("wb",dir=out.parent,delete=False) as file:
        file.write(data);temp=Path(file.name)
    os.replace(temp,out)
    return payload

def main():
    previous=None
    if OUT.exists():
        try:previous=json.loads(OUT.read_text("utf8"))
        except (OSError,ValueError):pass
    overlap=int(os.getenv("IACR_LOOKBACK_DAYS","21"))
    overlap=max(2,min(90,overlap))
    since=(datetime.now(timezone.utc)-timedelta(days=overlap)).date().isoformat()
    # On an initial run retrieve a larger recent window, but do not pretend
    # that this is historical full-archive coverage.
    if not previous:since=(datetime.now(timezone.utc)-timedelta(days=60)).date().isoformat()
    rows,complete=collect(since=since,max_pages=int(os.getenv("IACR_MAX_PAGES","14")))
    if not rows:raise ValueError("No OAI records returned, preserving previous metadata")
    report=write_snapshot(rows,since=since,complete=complete)
    print("IACR",report["known_records"],"records, requested-from",since,
          "complete-window",complete,"full-history NOT certified")

if __name__=="__main__":
    main()
