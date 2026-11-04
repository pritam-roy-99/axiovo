#!/usr/bin/env python3
"""Run ResearchLens locally with only Python's standard library.

Usage: python3 run.py [--port 8000] [--no-browser]
"""
from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent / "docs"


def main():
    parser = argparse.ArgumentParser(description="Run ResearchLens locally")
    parser.add_argument("--port", type=int, default=0, help="Local port (default: choose a free port)")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser automatically")
    args = parser.parse_args()
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    print(f"ResearchLens is running at {url}")
    print("Press Ctrl+C to stop. External paper search requires internet.")
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
