"""Read-only, bounded checks for arXiv OAI-PMH connectivity.

This script does not harvest records, write checkpoints or modify storage.
"""
import json
import time
import urllib.error
import urllib.request

ENDPOINTS = (
    ("oai_identify", "https://oaipmh.arxiv.org/oai?verb=Identify"),
    ("oai_alternate", "https://export.arxiv.org/oai2?verb=Identify"),
    ("arxiv_home", "https://arxiv.org/"),
)


def probe(name, url, opener=urllib.request.urlopen, timeout=12):
    started = time.monotonic()
    req = urllib.request.Request(url, headers={"User-Agent": "Axiovo/0.8 (read-only connectivity diagnostic)"})
    try:
        with opener(req, timeout=timeout) as response:
            status = getattr(response, "status", 200)
            # Never fetch entire archive documents in a diagnostic.
            head = response.read(2048)
            return {"name": name, "status": status, "elapsed_seconds": round(time.monotonic()-started, 2),
                    "bytes_sampled": len(head), "oai_response": b"OAI-PMH" in head}
    except (OSError, urllib.error.URLError, TimeoutError) as exc:
        return {"name": name, "error": type(exc).__name__,
                "elapsed_seconds": round(time.monotonic()-started, 2)}


if __name__ == "__main__":
    for name, url in ENDPOINTS:
        print(json.dumps(probe(name, url)), flush=True)
