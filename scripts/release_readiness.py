#!/usr/bin/env python3
"""Phase 7 release readiness audit, conservatively withholding unproved claims."""
from __future__ import annotations
from datetime import datetime,timezone
import json
from pathlib import Path
import subprocess
from scripts.build_source_v2 import verify_index
from scripts.build_search_index import verify as verify_search
from scripts.build_public_api import verify as verify_api

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"docs"/"data"
REPORT=ROOT/"reports"/"release-readiness.json"

def check(name,callback):
    try:
        detail=callback()
        return {"name":name,"passed":True,"detail":detail}
    except Exception as error:
        return {"name":name,"passed":False,"detail":str(error)}

def video():
    path=ROOT/"docs/assets/axiovo-tour.mp4"
    vtt=ROOT/"docs/assets/axiovo-tour.vtt"
    if not path.is_file() or not vtt.is_file():
        raise ValueError("No generated tour or captions in checked source/deployment")
    out=subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration",
                                 "-of","default=noprint_wrappers=1:nokey=1",str(path)],text=True)
    seconds=float(out.strip())
    if not 180<=seconds<=240:
        raise ValueError(f"Tutorial duration {seconds:.1f}s does not meet 3–4 minute target")
    if not vtt.read_text("utf8").startswith("WEBVTT"):
        raise ValueError("Captions are invalid")
    return {"seconds":round(seconds,1)}

def quality():
    path=ROOT/"reports/local-browser-quality.json"
    if not path.exists():raise ValueError("Missing browser measurements")
    obj=json.loads(path.read_text("utf8"))
    errors=[p for p in obj.get("measurements",[]) if p.get("error")]
    if errors:raise ValueError(str(len(errors))+" browser quality issues remain")
    return {"measurements":len(obj["measurements"]),"environment":obj["environment"]}

def search_judgments():
    from scripts.evaluate_search_quality import evaluate
    file=ROOT/"reports/expert-search-judgments.json"
    measured=evaluate(file,min_queries=100)
    return measured

def graph():
    path=DATA/"graph/v1/manifest.json"
    obj=json.loads(path.read_text("utf8"))
    if obj.get("coverage")!="partial-provider-reference-snapshots":
        raise ValueError("Graph provenance incomplete")
    return {"edges":obj["count"],"complete":False}

def run():
    checks=[
        check("canonical-v2-identity",lambda:{"records":verify_index(DATA/"index/v2")["record_count"]}),
        check("source-linked-search-index",lambda:{"documents":verify_search(DATA/"search-index/v1",DATA/"index/v2")["documents"]}),
        check("static-public-api",lambda:{"records":verify_api(DATA/"api/v1")["record_count"]}),
        check("citation-graph-trust-boundary",graph),
        check("expert-search-held-out-benchmark",search_judgments),
        check("local-browser-viewport-checks",quality),
        check("final-three-to-four-minute-tutorial",video),
    ]
    manual=[
        {"name":"independent-claim-support-review","passed":False,"detail":"Unreviewed; minimum 95% benchmark not certified"},
        {"name":"Android-Safari-and-assistive-technology-review","passed":False,"detail":"Requires real-device/manual assessment"},
        {"name":"private-data-migration-5000-item-and-rollback-drill","passed":False,"detail":"Requires independent device and deployment rehearsal"},
        {"name":"final-live-domain-research-journey","passed":False,"detail":"Required after feature freeze and production deployment"},
    ]
    status={
        "generated_at":datetime.now(timezone.utc).isoformat(),
        "release_ready":all(t["passed"] for t in checks+manual),
        "automated_checks":checks,"manual_release_gates":manual,
        "note":"A code commit is not a completed scientific quality assessment or product launch."
    }
    REPORT.parent.mkdir(parents=True,exist_ok=True)
    REPORT.write_text(json.dumps(status,indent=2),encoding="utf8")
    print("Release ready:",status["release_ready"],"Automated passes:",sum(x["passed"] for x in checks),
          "/",len(checks),"Manual gates outstanding:",sum(not x["passed"] for x in manual))
    return status

if __name__=="__main__":
    run()
