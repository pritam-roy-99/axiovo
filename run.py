#!/usr/bin/env python3
"""Run Axiovo locally with only Python's standard library.

Usage: python3 run.py [--port 8000] [--no-browser]
"""
from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent / "docs"


class LocalHandler(SimpleHTTPRequestHandler):
    """Static app plus opt-in, loopback-only Consensus API bridge."""

    def do_GET(self):
        if urllib.parse.urlsplit(self.path).path == "/api/consensus":
            self.consensus_search()
        else:
            super().do_GET()

    def json_response(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def consensus_search(self):
        key = os.environ.get("CONSENSUS_API_KEY", "").strip()
        if not key:
            self.json_response(503, {"error": "Consensus is not configured on this device. Set CONSENSUS_API_KEY before starting Axiovo."})
            return
        params = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        query = params.get("query", [""])[0].strip()[:220]
        if len(query) < 3:
            self.json_response(400, {"error": "Enter a research query of at least three characters."})
            return
        url = "https://api.consensus.app/v1/search?" + urllib.parse.urlencode({"query": query})
        req = urllib.request.Request(url, headers={
            "x-api-key": key, "Accept": "application/json",
            "User-Agent": "Axiovo-local/1.0",
        })
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                payload = json.load(response)
            papers = payload.get("results", []) if isinstance(payload, dict) else []
            if not isinstance(papers, list):
                papers = []
            safe = []
            for item in papers[:20]:
                if not isinstance(item, dict):
                    continue
                safe.append({
                    "title": str(item.get("title") or "")[:500],
                    "authors": item.get("authors", []) if isinstance(item.get("authors"), list) else [],
                    "publish_year": item.get("publish_year"),
                    "doi": str(item.get("doi") or "")[:180],
                    "url": str(item.get("url") or "")[:600],
                    "citation_count": item.get("citation_count"),
                })
            self.json_response(200, {"source": "Consensus API", "query": query, "results": safe})
        except urllib.error.HTTPError as err:
            message = ("Consensus API monthly allowance or rate limit reached." if err.code == 429
                       else "Consensus API authentication failed." if err.code == 401
                       else "Consensus API temporarily unavailable.")
            self.json_response(err.code if err.code in (401, 429) else 502, {"error": message})
        except (OSError, ValueError, TypeError):
            self.json_response(502, {"error": "Unable to reach Consensus API. Continue with free Axiovo sources."})


def main():
    parser = argparse.ArgumentParser(description="Run Axiovo locally")
    parser.add_argument("--port", type=int, default=0, help="Local port (default: choose a free port)")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser automatically")
    args = parser.parse_args()
    handler = partial(LocalHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    print(f"Axiovo is running at {url}")
    print("Press Ctrl+C to stop. External paper search requires internet.")
    print("Optional Consensus API: "+("enabled" if os.getenv("CONSENSUS_API_KEY") else "not configured")+" (server-side key only).")
    if not args.no_browser:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
