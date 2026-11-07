#!/usr/bin/env python3
"""Checkpointed IACR OAI historical backfill, one complete date window at a time.

OAI datestamps are metadata update times. Each completed year is an OAI
harvest interval, NOT proof all submission years are complete.
"""
from __future__ import annotations
from datetime import datetime, timezone
import json,os
from pathlib import Path
from scripts.sync_eprint import collect,write_snapshot,OUT

STATE=OUT.parent/"eprint-backfill-state.json"
START_YEAR=1996

def run(max_years=1,max_pages=80):
    year=START_YEAR
    if STATE.exists():
        try:
            state=json.loads(STATE.read_text("utf8"))
            year=max(START_YEAR,int(state["next_oai_year"]))
        except (ValueError,KeyError,TypeError):
            raise ValueError("Corrupt checkpoint; do not silently restart historical coverage")
    current=datetime.now(timezone.utc).year
    finished=0
    while year<=current and finished<max_years:
        after=f"{year}-01-01"
        before=f"{year}-12-31" if year<current else datetime.now(timezone.utc).date().isoformat()
        print("IACR OAI update-history window",after,"through",before,flush=True)
        records,complete=collect(since=after,until=before,max_pages=max_pages)
        if not complete:
            # Do not advance the checkpoint if any continuation remains.
            # The partial records are useful but coverage remains partial.
            if records:write_snapshot(records,since=after,complete=False)
            print("IACR year not completely paginated; checkpoint unchanged",year)
            break
        if records:write_snapshot(records,since=after,complete=True)
        year+=1;finished+=1
        report={"next_oai_year":year,"last_completed_update_window":before,
                "coverage":"OAI-datestamp-windows-not-submission-year-completeness",
                "checked_at":datetime.now(timezone.utc).isoformat()}
        STATE.write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("IACR backfill progressed",finished,"complete OAI windows; next",year)
    return finished

if __name__=="__main__":
    run(max_years=max(1,min(3,int(os.getenv("IACR_BACKFILL_WINDOWS","1")))),
        max_pages=max(3,min(100,int(os.getenv("IACR_BACKFILL_PAGES","80")))))
