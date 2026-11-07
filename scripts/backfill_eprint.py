#!/usr/bin/env python3
"""Bounded, resumable full OAI-PMH traversal for Cryptology ePrint.

The service is divided into date ranges by OAI *metadata-update* datestamp.
Large years are bisected until every interval is fully paginated. A successful
OAI traversal covers what the endpoint exposes, not hidden/non-OAI papers.

No OAI continuation token is persisted across independent GitHub Action runs:
tokens can expire. Instead, only fully completed date windows are checkpointed.
The browser storage, existing snapshots and user Library keys are not modified.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import json
import os
from pathlib import Path
import tempfile
from xml.etree import ElementTree as ET

from scripts import sync_eprint as source

OUT = source.OUT
STATE = OUT.parent / "eprint-backfill-state.json"
START_YEAR = 1996
SCHEMA = 2

def identify_earliest():
    """Verify OAI identity and date granularity, including earliest datestamp."""
    raw = source.request({"verb": "Identify"})
    root = ET.fromstring(raw)
    error = root.find("o:error",source.NAMESPACE)
    if error is not None:
        raise ValueError("IACR OAI Identify error: " + str(error.get("code")))
    ident = root.find("o:Identify",source.NAMESPACE)
    if ident is None:
        raise ValueError("IACR OAI did not return an Identify response")
    value = ident.findtext("o:earliestDatestamp",namespaces=source.NAMESPACE)
    granularity = ident.findtext("o:granularity",namespaces=source.NAMESPACE)
    if not value or granularity not in ("YYYY-MM-DD","YYYY-MM-DDThh:mm:ssZ"):
        raise ValueError("IACR OAI granularity/earliestDatestamp not verified")
    first = source.date_only(value)
    if not first:
        raise ValueError("Invalid IACR OAI earliestDatestamp")
    return first,granularity

def window(start,end):
    assert isinstance(start,date) and isinstance(end,date) and start<=end
    return {"from":start.isoformat(),"until":end.isoformat()}

def initial_queue(first,current):
    # Initial OAI datestamps may be later than submission years.
    # Starting at the repository's first datestamp captures ALL available
    # OAI updates; preprints from older years remain included if updated later.
    first_day = date.fromisoformat(first)
    years = []
    for year in range(first_day.year,current.year+1):
        years.append(window(max(date(year,1,1),first_day),
                            min(date(year,12,31),current)))
    return years

def validate_queue(state):
    if state.get("schema_version")!=SCHEMA or not isinstance(state.get("pending"),list):
        raise ValueError("Unsupported IACR backfill checkpoint schema")
    for item in state["pending"]:
        if not isinstance(item,dict):
            raise ValueError("Invalid backfill window")
        start = date.fromisoformat(item["from"])
        end = date.fromisoformat(item["until"])
        if start>end:
            raise ValueError("Backfill checkpoint contains a reversed window")
    if not isinstance(state.get("completed_windows"),int) or state["completed_windows"]<0:
        raise ValueError("Invalid checkpoint completion counter")
    return state

def load_state(first,current):
    if STATE.exists():
        try:
            return validate_queue(json.loads(STATE.read_text("utf8")))
        except (OSError,KeyError,TypeError,ValueError) as error:
            raise ValueError("Invalid IACR checkpoint: preserve it for manual repair") from error
    return {"schema_version":SCHEMA,"earliest_oai_datestamp":first,
            "latest_oai_day":current.isoformat(),"pending":initial_queue(first,current),
            "completed_windows":0,"complete_oai_traversal":False,
            "coverage":"OAI datestamps, not submission dates or all privately held papers"}

def split_window(item):
    start=date.fromisoformat(item["from"])
    end=date.fromisoformat(item["until"])
    if start==end:
        return None
    midpoint=start+timedelta(days=(end-start).days//2)
    return window(start,midpoint),window(midpoint+timedelta(days=1),end)

def ensure_current(state,today):
    # Do not declare the catalog up to date while days after the original
    # traversal exist. The regular incremental harvester maintains freshness.
    state["latest_oai_day"]=today.isoformat()
    return state

def write_checkpoint(state):
    STATE.parent.mkdir(parents=True,exist_ok=True)
    payload=(json.dumps(state,ensure_ascii=False,indent=2)+"\n").encode()
    with tempfile.NamedTemporaryFile("wb",dir=STATE.parent,delete=False) as file:
        file.write(payload)
        temp=Path(file.name)
    os.replace(temp,STATE)

def run(max_windows=15,max_pages=70,max_splits=60,*,first=None,today=None):
    """Process completed intervals and checkpoint them in the same CI run.

    A server response with a remaining resumption token is NOT complete.
    Big windows are automatically split; no windows are skipped on errors.
    """
    if not 1<=max_windows<=200:
        raise ValueError("Invalid IACR completed-window budget")
    if not 1<=max_pages<=100:
        raise ValueError("Invalid OAI page budget")
    if not 1<=max_splits<=300:
        raise ValueError("Invalid OAI split budget")
    today=today or datetime.now(timezone.utc).date()
    if first is None:
        first,_=identify_earliest()
    state=load_state(first,today)
    ensure_current(state,today)
    collected=[]
    completed=0
    splits=0
    while state["pending"] and completed<max_windows:
        item=state["pending"][0]
        print("Harvest IACR OAI update window",item["from"],"to",item["until"],flush=True)
        try:
            rows,full=source.collect(since=item["from"],until=item["until"],
                                     max_pages=max_pages)
        except (TimeoutError, OSError, ValueError) as error:
            if not completed:
                raise
            # Preserve already completed windows; resume the failed interval
            # next run rather than discarding this entire successful batch.
            print("IACR source unavailable; preserving",completed,
                  "verified windows. Failed interval retained:",error,flush=True)
            break
        if not full:
            parts=split_window(item)
            if not parts:
                raise RuntimeError("IACR OAI exhausted page budget even for a single day; "+
                                   "increase IACR_BACKFILL_PAGES safely or request source assistance")
            state["pending"][:1]=list(parts)
            splits+=1
            if splits>=max_splits:
                print("IACR split budget reached; saving current verified progress")
                break
            continue
        collected.extend(rows)
        state["pending"].pop(0)
        state["completed_windows"]+=1
        state["last_completed_oai_window"]=item
        completed+=1
    state["complete_oai_traversal"]=not state["pending"]
    state["last_check"]=datetime.now(timezone.utc).isoformat(timespec="seconds")
    # Record data before advancing state, so an interrupted run can safely
    # repeat windows. No source records are lost if checkpoint writing fails.
    if collected:
        source.write_snapshot(collected,since=first,complete=state["complete_oai_traversal"],
                              full_traversal=state["complete_oai_traversal"])
    if completed or splits or not STATE.exists():
        write_checkpoint(state)
    print("IACR OAI:",completed,"complete windows,",splits,"splits;",
          len(state["pending"]),"pending; harvested",len(collected),
          "source rows; OAI traversal complete:",state["complete_oai_traversal"])
    return completed

if __name__=="__main__":
    run(max_windows=int(os.getenv("IACR_BACKFILL_WINDOWS","15")),
        max_pages=int(os.getenv("IACR_BACKFILL_PAGES","70")),
        max_splits=int(os.getenv("IACR_BACKFILL_SPLITS","60")))
