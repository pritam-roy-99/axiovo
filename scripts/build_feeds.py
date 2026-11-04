"""Build Atom feeds for all indexed papers and all classified research topics.

The feed records arXiv titles, links and abstracts; it is not a publisher of
those papers. The generated files are built in GitHub Actions.
"""
from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, ElementTree
import json, re
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"docs"/"data"/"feed.json"
OUTPUT=ROOT/"docs"/"feeds"
BASE="https://pritam-roy-99.github.io/axiovo/"
ATOM="http://www.w3.org/2005/Atom"

def tag(name):
    return f"{{{ATOM}}}{name}"

def make_feed(papers, title, slug, stamp):
    root=Element(tag("feed"))
    SubElement(root,tag("title")).text=title
    SubElement(root,tag("id")).text=BASE+"feeds/"+slug+".xml"
    SubElement(root,tag("updated")).text=stamp
    SubElement(root,tag("link"),{"href":BASE+"feeds/"+slug+".xml","rel":"self","type":"application/atom+xml"})
    for p in sorted(papers,key=lambda x:x.get("published") or x.get("updated") or "",reverse=True)[:100]:
        if not re.fullmatch(r"[A-Za-z0-9./-]{1,80}",p.get("id","")):continue
        el=SubElement(root,tag("entry"))
        SubElement(el,tag("title")).text=p["title"]
        SubElement(el,tag("id")).text="https://arxiv.org/abs/"+p["id"]
        SubElement(el,tag("link"),{"href":"https://arxiv.org/abs/"+p["id"]})
        SubElement(el,tag("updated")).text=p.get("updated") or p.get("published") or stamp
        SubElement(el,tag("published")).text=p.get("published") or stamp
        SubElement(el,tag("summary")).text=p.get("abstract","")[:2000]
        for a in (p.get("authors") or [])[:15]:
            SubElement(SubElement(el,tag("author")),tag("name")).text=a
    OUTPUT.mkdir(parents=True,exist_ok=True)
    ElementTree(root).write(OUTPUT/(slug+".xml"),encoding="utf-8",xml_declaration=True)

def main():
    doc=json.loads(SOURCE.read_text(encoding="utf-8"))
    papers=doc.get("papers",[])
    stamp=doc.get("generated_at") or datetime.now(timezone.utc).isoformat()
    make_feed(papers,"Axiovo: Indexed research", "all",stamp)
    count=0
    for topic in doc.get("topic_catalog",[]):
        slug=topic.get("id","")
        if not re.fullmatch(r"[a-z0-9-]+",slug):continue
        matches=[p for p in papers if slug in p.get("topics",[])]
        make_feed(matches,"Axiovo: "+topic["label"],slug,stamp)
        count+=1
    print(f"Built Atom feeds: all research + {count} research topics")

if __name__=="__main__":main()
