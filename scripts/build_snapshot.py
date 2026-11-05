"""Build first-paint HTML from the current verified arXiv metadata snapshot.

Runs only in GitHub Actions before uploading the Pages artifact. The committed
HTML remains a source template. Pre-rendered cards are accessible without JS.
"""
from __future__ import annotations
from datetime import datetime
from html import escape
import json
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/"docs"/"index.html"
FEED=ROOT/"docs"/"data"/"feed.json"
START="<!--RL_SNAPSHOT_START-->"
END="<!--RL_SNAPSHOT_END-->"

def fmt_date(value):
    try:
        return datetime.fromisoformat(value.replace("Z","+00:00")).strftime("%d %b %Y")
    except (ValueError,AttributeError):
        return "Date unknown"

def first_paint(data):
    papers=[p for p in data.get("papers",[]) if p.get("id") and p.get("title")]
    papers=sorted(papers,key=lambda p:p.get("published") or p.get("updated") or "",reverse=True)
    items=[]
    for p in papers[:30]:
        identifier=p["id"]
        if not re.fullmatch(r"[A-Za-z0-9./-]{1,80}",identifier):
            continue
        url="https://arxiv.org/abs/"+escape(identifier,quote=True)
        title=escape(p["title"],quote=False)
        abstract=escape((p.get("abstract") or "")[:590],quote=False)
        authors=escape(", ".join((p.get("authors") or [])[:8]),quote=False)
        cat=escape(p.get("primary_category") or "other",quote=False)
        items.append(
            f'<article class="paper"><span class="category">{cat}</span>'
            f'<h2>{title}</h2><div class="meta">{authors} · {fmt_date(p.get("published",""))}'
            f' · {escape(identifier)}</div><p>{abstract}</p>'
            f'<a class="btn primary" href="{url}" target="_blank" rel="noopener noreferrer">Read on arXiv ↗</a> '
            f'<a class="btn" href="./copilot.html?id={escape(identifier,quote=True)}">✦ Analyze / Ask AI</a></article>')
    if not items:
        return "<div class='empty'>No paper snapshot is available. Check the status of the arXiv synchronization.</div>"
    return "".join(items)

def build():
    feed=json.loads(FEED.read_text(encoding="utf-8"))
    html=HTML.read_text(encoding="utf-8")
    if html.count(START)==0 and html.count(END)==0:
        print("Axiovo homepage is archive-first; skipping legacy arXiv feed snapshot injection")
        return
    if html.count(START)!=1 or html.count(END)!=1:
        raise ValueError("Incomplete or duplicate snapshot template markers")
    before,rest=html.split(START,1)
    _,after=rest.split(END,1)
    html=before+START+first_paint(feed)+END+after
    html=html.replace('<div id="papers" class="empty">'+START, '<div id="papers" class="prefeed">'+START)
    papers=feed.get("papers",[])
    dates=sorted(p.get("published") for p in papers if p.get("published"))
    last=feed.get("generated_at") or "not yet"
    html=html.replace('<strong id="total">Loading…</strong>',f'<strong id="total">{len(papers):,}</strong>')
    html=html.replace('<strong id="updated">Loading…</strong>',f'<strong id="updated">{fmt_date(last)}</strong>')
    coverage=(f"{len(papers):,} indexed papers · v1 publication dates "
              f"{dates[0][:10] if dates else '?'} to {dates[-1][:10] if dates else '?'} "
              f"· synchronized {last} · arXiv categories quant-ph, cs.IT, hep-th, "
              "physics.optics, cond-mat.mes-hall + curated historical IDs. This is not full arXiv.")
    html=re.sub(r'(<div id="coverage" class="coverage">).*?(</div>)',
                lambda m:m.group(1)+escape(coverage)+m.group(2),html,count=1,flags=re.S)
    html=html.replace('<span class="small" id="count">Loading…</span>',
                      f'<span class="small" id="count">{len(papers):,} indexed papers · loading filters</span>')
    HTML.write_text(html,encoding="utf-8")
    print(f"Pre-rendered {min(len(papers),30)} research cards into GitHub Pages artifact")

if __name__=="__main__":
    build()
