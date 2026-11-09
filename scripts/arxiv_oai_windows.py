"""Bounded OAI-PMH date-window recovery for expired continuation tokens.

Each window has independent page shards and a checkpoint. On token expiry, a
window is replayed from its first page, preserving the prior files until a
new successful page is fetched. No completion is inferred from partial data.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import time
import urllib.parse
import urllib.request

from scripts.arxiv_oai_history import BASE, parse


def fetch_window_page(start, end, token, opener=urllib.request.urlopen):
    params = ({"verb": "ListRecords", "resumptionToken": token} if token else
              {"verb": "ListRecords", "metadataPrefix": "arXiv",
               "from": start.isoformat(), "until": end.isoformat()})
    request = urllib.request.Request(
        BASE + "?" + urllib.parse.urlencode(params),
        headers={"User-Agent": "Axiovo/0.8 (https://github.com/pritam-roy-99/axiovo; metadata harvesting)"})
    with opener(request, timeout=90) as response:
        return response.read()


def harvest_window(root, start, end, max_pages=5, fetch=fetch_window_page, delay=4):
    if start > end or max_pages < 1:
        raise ValueError("Invalid window or page limit")
    directory = Path(root) / f"{start.isoformat()}_{end.isoformat()}"
    directory.mkdir(parents=True, exist_ok=True)
    checkpoint = directory / "checkpoint.json"
    state = json.loads(checkpoint.read_text()) if checkpoint.exists() else {
        "next_token": "", "pages": 0, "complete": False, "replays": 0}
    if state["complete"]:
        return state
    for _ in range(max_pages):
        try:
            records, token = parse(fetch(start, end, state["next_token"]))
        except RuntimeError as exc:
            if "badResumptionToken" not in str(exc):
                raise
            # Replay only this bounded window. Keep the old page files until
            # each replacement has been successfully fetched and written.
            state = {"next_token": "", "pages": 0, "complete": False,
                     "replays": state.get("replays", 0) + 1}
            if state["replays"] > 3:
                raise RuntimeError("Window exceeded token-recovery limit") from exc
            checkpoint.write_text(json.dumps(state) + "\n")
            return state
        page = directory / f"page-{state['pages']:08d}.jsonl"
        temporary = page.with_suffix(".tmp")
        with temporary.open("w", encoding="utf8") as out:
            for record in records:
                out.write(json.dumps(record, ensure_ascii=False) + "\n")
            out.flush()
            os.fsync(out.fileno())
        os.replace(temporary, page)
        state = {"next_token": token, "pages": state["pages"] + 1,
                 "complete": not bool(token), "replays": state.get("replays", 0)}
        tmp_checkpoint = checkpoint.with_suffix(".tmp")
        tmp_checkpoint.write_text(json.dumps(state) + "\n")
        os.replace(tmp_checkpoint, checkpoint)
        if state["complete"]:
            # Replayed windows may have fewer pages than their prior attempt.
            # Remove stale page shards so they cannot be imported accidentally.
            for stale in directory.glob("page-*.jsonl"):
                if int(stale.stem.split("-")[-1]) >= state["pages"]:
                    stale.unlink()
            break
        if delay:
            time.sleep(delay)
    return state


def month_end(day):
    if day.month == 12:
        return dt.date(day.year, 12, 31)
    return dt.date(day.year, day.month + 1, 1) - dt.timedelta(days=1)


def windows(start, end):
    cursor = start
    while cursor <= end:
        stop = min(month_end(cursor), end)
        yield cursor, stop
        cursor = stop + dt.timedelta(days=1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--from-date", required=True, type=dt.date.fromisoformat)
    parser.add_argument("--until-date", required=True, type=dt.date.fromisoformat)
    parser.add_argument("--max-pages", type=int, default=5)
    args = parser.parse_args()
    if not 1 <= args.max_pages <= 100:
        parser.error("--max-pages must be 1..100")
    if args.from_date > args.until_date:
        parser.error("--from-date must not exceed --until-date")
    # One window per invocation prevents uncontrolled API requests.
    start, end = next(windows(args.from_date, args.until_date))
    print(json.dumps({"window": [str(start), str(end)],
                      "checkpoint": harvest_window(args.output, start, end, args.max_pages)}))
