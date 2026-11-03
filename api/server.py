"""Optional localhost-only Qwen/Ollama HTTP API for preliminary paper questions.

Run: python -m api.server
Requires Ollama running locally with a downloaded model; default qwen3.5:4b.
This is NOT an online scientific validation service.
"""
from __future__ import annotations
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / "docs" / "data" / "feed.json"

def words(text):
    return set(re.findall(r"[a-z]{4,}", (text or "").lower()))

def related(target, papers, top=5):
    a = words(target.get("title","") + " " + target.get("abstract",""))
    matches=[]
    for paper in papers:
        if paper.get("id")==target.get("id"):continue
        b=words(paper.get("title","") + " " + paper.get("abstract",""))
        if a and b:
            score=len(a&b)/(len(a)*len(b))**0.5
            if score>0: matches.append((score,paper))
    matches.sort(key=lambda x:x[0],reverse=True)
    return [{"id":p["id"],"title":p["title"],"score":round(s,4),
             "url":"https://arxiv.org/abs/"+p["id"]} for s,p in matches[:top]]

def load_papers():
    return json.loads(FEED.read_text(encoding="utf-8")).get("papers",[])

def analyze(paper_id):
    papers=load_papers()
    target=next((p for p in papers if p["id"]==paper_id),None)
    if target is None:
        return {"error":"Unknown indexed paper"},404
    matches=related(target,papers)
    result={"paper_id":paper_id,"status":"preliminary",
        "disclaimer":"No novelty or correctness verdict. This is abstract-level research guidance only.",
        "related":matches,"model_used":None,"questions":[]}
    prompt=(
        "You are a cautious scientific literature assistant. Given a paper abstract and a list "
        "of candidate related paper titles, return JSON with a key 'questions' containing "
        "at most 5 concrete scientific verification questions. Never claim novelty or invalidity. "
        "The related titles alone cannot establish a mathematical result.\n"
        "Paper title: "+target.get("title","")+"\nAbstract: "+target.get("abstract","")[:5500]+
        "\nCandidate related papers: "+json.dumps(matches,ensure_ascii=False)+"\n"
    )
    model=os.getenv("OLLAMA_MODEL","qwen3.5:4b")
    base=os.getenv("OLLAMA_URL","http://127.0.0.1:11434").rstrip("/")
    if base not in ("http://127.0.0.1:11434","http://localhost:11434"):
        result["note"]="Non-local Ollama endpoints are disabled"
        return result,200
    body=json.dumps({"model":model,"prompt":prompt,"stream":False,"format":"json",
                     "options":{"temperature":0.1}}).encode("utf-8")
    try:
        req=urllib.request.Request(base+"/api/generate",data=body,
                                   headers={"Content-Type":"application/json"},method="POST")
        with urllib.request.urlopen(req,timeout=90) as resp:
            output=json.load(resp)
        parsed=json.loads(output.get("response","{}"))
        if isinstance(parsed,dict) and isinstance(parsed.get("questions"),list):
            result["questions"]=[str(q)[:450] for q in parsed["questions"] if isinstance(q,str)][:5]
            result["model_used"]=model
    except (OSError,ValueError,KeyError,urllib.error.URLError):
        result["note"]="Ollama unavailable; lexical prior-paper suggestions remain available"
    return result,200

class API(BaseHTTPRequestHandler):
    def send_json(self,obj,status=200):
        payload=json.dumps(obj,ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Content-Length",str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path=="/health":
            return self.send_json({"status":"ok","ai":"optional-local-ollama",
                "note":"This local API is not a scientific novelty verifier"})
        return self.send_json({"error":"Not found"},404)

    def do_POST(self):
        if self.path!="/analyze":
            return self.send_json({"error":"Not found"},404)
        try:
            length=int(self.headers.get("Content-Length","0"))
            if not (0<length<=2000):
                return self.send_json({"error":"Invalid request size"},413)
            data=json.loads(self.rfile.read(length))
            identifier=data.get("paper_id","")
            if not isinstance(identifier,str) or not re.fullmatch(r"[A-Za-z0-9.\-]{1,50}",identifier):
                return self.send_json({"error":"Invalid paper_id"},400)
            result,status=analyze(identifier)
            return self.send_json(result,status)
        except (ValueError,OSError,KeyError):
            return self.send_json({"error":"Malformed request"},400)

if __name__=="__main__":
    print("ResearchLens local API listening on http://127.0.0.1:8765")
    ThreadingHTTPServer(("127.0.0.1",8765),API).serve_forever()
