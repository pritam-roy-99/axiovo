"use strict";
/* Historical arXiv-linked search rendered inside Litveyra.
 * OpenAlex source filter limits to papers with a harvested arXiv copy,
 * but this is not a complete arXiv archive and publication_date may
 * differ from arXiv's original submission date.
 */
(function(){
const $=id=>document.getElementById(id);
const PAGE_SIZE=25;
const Arxiv=window.ResearchLensArxiv;
const ARXIV_SOURCE="S4306400194";
let page=1,found=0,loading=false,controller=null,active=false,lastRequest=null;
const btn=$("all-arxiv"),back=$("back-local"),view=$("history-view"),feed=$("local-feed-view");
if(!btn||!back||!view||!feed)return;
function el(tag,text,cls){
 const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;
}
function addLink(parent,text,url,cls="btn"){
 try{const u=new URL(url,location.href);if(u.protocol!=="https:"||(!String(url).startsWith("https:")&&u.origin!==location.origin))return null;const a=el("a",text,cls);a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";parent.append(a);return a}catch(e){return null}
}
function historyInfo(message,query=""){
 const parent=$("history-info");if(!parent)return;
 parent.replaceChildren(document.createTextNode(message+" "));
 const link=el("a",query?"Search this query on the official arXiv website ↗":"Browse the official arXiv website ↗");
 link.id="history-official-link";link.href=Arxiv?.officialSearchUrl(query)||"https://arxiv.org/search/advanced";
 link.target="_blank";link.rel="noopener noreferrer";parent.append(link);
}
function pageInfo(){return {q:$("q").value.trim(),from:$("date-from").value,to:$("date-to").value,sort:$("order").value}}
function switchView(on){
 active=on;view.hidden=!on;feed.hidden=on;back.hidden=!on;btn.textContent=on?"Update full-history results":"Search all arXiv history";
 if(on)view.scrollIntoView({behavior:"smooth",block:"start"});
}
function arxivLocation(w){
 const versions=Arxiv?.candidates(w)||[];
 return versions[0]?Arxiv.abs(versions[0].requested):null;
}
function action(parent,label,url,variant=""){
 const a=addLink(parent,label,url,"rl-paper-action"+(variant?" "+variant:""));
 return a
}
function saveVersion(button,requested){
 const key="researchlens-reading-list";
 let ids=[];try{ids=JSON.parse(localStorage.getItem(key)||"[]")}catch{}
 if(!Array.isArray(ids))ids=[];
 const isSaved=ids.includes(requested);
 ids=isSaved?ids.filter(x=>x!==requested):[...ids,requested];
 try{localStorage.setItem(key,JSON.stringify(ids))}catch{button.textContent="Storage unavailable";return}
 button.textContent=isSaved?"☆ Save paper":"✓ Saved";
 button.setAttribute("aria-pressed",String(!isSaved));
 button.classList.toggle("saved",!isSaved);
 window.dispatchEvent(new Event("researchlens-library-change"));
}
function bibtex(p){
 const key=("arxiv"+(p.arxiv||p.id||"").replace(/[^a-z0-9]/gi,"")).slice(0,90);
 return "@misc{"+key+",\n  title={"+p.title.replace(/[{}]/g,"")+"},\n  author={"+p.authors.join(" and ").replace(/[{}]/g,"")+"},\n  year={"+(p.date||"").slice(0,4)+"},\n  url={"+p.url+"}\n}";
}
function paperCard(w){
 const source=arxivLocation(w);if(!source)return null;
 const linked=Arxiv.parse(source);
 if(!linked)return null;
 const card=el("article",undefined,"paper");
 const meta=el("div",undefined,"row");
 meta.append(el("span","arXiv-hosted preprint · OpenAlex metadata","category"));
 if(w.publication_date)meta.append(el("span","Index date: "+w.publication_date,"small"));
 card.append(meta,el("h2",w.display_name||w.title||"Untitled work"));
 const authors=(w.authorships||[]).slice(0,8).map(x=>x.author?.display_name||"").filter(Boolean);
 card.append(el("div",authors.join(", ")+(w.authorships?.length>8?", et al.":""),"meta"));
 const desc=el("p","arXiv ID: "+linked.base+". Check arXiv for initial submission, revisions and all available versions.","rl-source-notice");
 card.append(desc);
 const chooser=el("div",undefined,"rl-paper-versions");
 chooser.append(el("span","Revision:"));
 const version=document.createElement("input");version.type="number";version.min="1";version.step="1";version.max="9999";version.placeholder="Latest";
 version.setAttribute("aria-label","arXiv version number for "+(w.display_name||w.title));
 const versions=Arxiv.candidates(w);
 // The most recent version is unversioned; an indexed vN may be stale.
 const jump=el("a","Open selected version ↗");jump.href=Arxiv.abs(linked.base);
 jump.target="_blank";jump.rel="noopener noreferrer";
 version.addEventListener("input",()=>{
  const n=Number(version.value),valid=version.value===""||Number.isInteger(n)&&n>=1&&n<=9999;
  jump.textContent=version.value?"Open v"+version.value+" on arXiv ↗":"Open latest version ↗";
  jump.href=valid?Arxiv.abs(linked.base+(version.value?"v"+version.value:"")):Arxiv.abs(linked.base);
  jump.setAttribute("aria-disabled",String(!valid));
 });
 chooser.append(version,jump);card.append(chooser);
 const row=el("div",undefined,"rl-paper-actionbar");
 action(row,"Read on arXiv",Arxiv.abs(linked.base),"primary");
 action(row,"PDF",Arxiv.pdf(linked.base));
 action(row,"Research Assistant","./copilot.html?id="+encodeURIComponent(linked.base),"assistant");
 const selected=()=>linked.base+(version.value?"v"+version.value:"");
 const ids=(()=>{try{return JSON.parse(localStorage.getItem("researchlens-reading-list")||"[]")}catch{return []}})();
 const isSaved=Array.isArray(ids)&&ids.includes(linked.base);
 const save=el("button",isSaved?"✓ Saved":"☆ Save paper","rl-paper-action"+(isSaved?" saved":""));
 save.type="button";save.setAttribute("aria-pressed",String(isSaved));save.setAttribute("aria-label","Save arXiv paper to reading list");
 save.addEventListener("click",()=>saveVersion(save,selected()));row.append(save);
 action(row,"Discussion","./paper.html?id="+encodeURIComponent(linked.base));
 action(row,"OpenAlex record",w.id);
 const copy=el("button","Copy BibTeX","rl-paper-action");
 copy.onclick=async()=>{
  const citation=bibtex({id:w.id,title:w.display_name||w.title||"",authors,date:w.publication_date||"",url:Arxiv.abs(selected()),arxiv:selected()});
  try{await navigator.clipboard.writeText(citation);copy.textContent="Copied ✓"}catch{copy.textContent="Copy unavailable"}
 };
 row.append(copy);card.append(row);
 return card;
}
function pager(){
 const root=$("history-pagination");root.replaceChildren();
 const maxPages=Math.max(1,Math.ceil(Math.min(found,10000)/PAGE_SIZE));
 const prev=el("button","← Previous","btn");prev.disabled=page===1;prev.onclick=()=>search(page-1);
 root.append(prev,el("span","Page "+page+" of "+maxPages,"small"));
 const next=el("button","Next →","btn");next.disabled=page>=maxPages;next.onclick=()=>search(page+1);root.append(next);
}
async function search(n=1,fromUrl=false){
 const p=pageInfo();
 const direct=Arxiv?.parse(p.q);
 if(p.from&&p.to&&p.from>p.to){historyInfo("Start date must be before or equal to end date.",p.q);switchView(true);return}
 if(p.q.length>0&&p.q.length<3&& !/^\d{4}\.\d{4,5}(?:v\d+)?$/.test(p.q)){historyInfo("Enter at least 3 letters, or use the date fields alone.",p.q);switchView(true);return}
 // Empty keyword search lists the latest OpenAlex-indexed arXiv-hosted works.
 if(controller)controller.abort();
 controller=new AbortController();loading=true;page=n;switchView(true);
 const root=$("history-cards");root.replaceChildren(el("div","Searching arXiv-hosted papers through OpenAlex…","empty"));
 if(direct){const directBox=el("div",undefined,"rl-source-notice");directBox.textContent="Exact arXiv ID supplied. The official record is available independently of Litveyra indexing: ";addLink(directBox,"Open arXiv:"+direct.requested+" ↗",Arxiv.abs(direct.requested),"rl-paper-action primary");root.append(directBox)}
 $("history-count").textContent="Searching…";
 $("history-pagination").replaceChildren();
 historyInfo("Historical arXiv-hosted search via OpenAlex. Publication dates may differ from original arXiv submission dates. This index is not exhaustive.",p.q);
 const filters=["locations.source.id:"+ARXIV_SOURCE];
 if(p.from)filters.push("from_publication_date:"+p.from);
 if(p.to)filters.push("to_publication_date:"+p.to);
 const qs=new URLSearchParams({filter:filters.join(","),page:String(page),per_page:String(PAGE_SIZE),select:"id,display_name,title,publication_date,authorships,doi,locations,primary_location,best_oa_location"});
 if(p.q){
  const id=(Arxiv?.parse(p.q)?.base)||p.q.replace(/^arxiv:\s*/i,"");
  if(Arxiv?.parse(id)){
   // Search title/abstract by ID may not match. A URL-aware fallback is shown
   // if OpenAlex cannot locate the requested preprint.
   qs.set("search",id);
  }else qs.set("search",p.q);
 }
 if(p.sort==="old")qs.set("sort","publication_date:asc");
 else if(p.sort==="new")qs.set("sort","publication_date:desc");
 
 lastRequest=qs.toString();
 const url=new URL(window.location.href);
 url.searchParams.set("history","1");
 url.searchParams.set("from",p.from);url.searchParams.set("to",p.to);url.searchParams.set("q",p.q);url.searchParams.set("page",String(page));
 if(!fromUrl)window.history.replaceState({history:true},"",url.pathname+url.search);
 try{
  const result=await fetch("https://api.openalex.org/works?"+qs.toString(),{headers:{Accept:"application/json"},signal:controller.signal});
  if(!result.ok)throw Error("OpenAlex returned HTTP "+result.status);
  const payload=await result.json();found=payload.meta?.count??0;
  root.replaceChildren();
  if(direct){const b=el("div",undefined,"rl-source-notice");b.textContent="Requested "+direct.requested+" (exact arXiv version, if available). ";addLink(b,"Open original arXiv record ↗",Arxiv.abs(direct.requested),"rl-paper-action");root.append(b)}
  let rows=(payload.results||[]).filter(w=>Boolean(arxivLocation(w)));
  if(p.sort==="title")rows=[...rows].sort((a,b)=>(a.display_name||"").localeCompare(b.display_name||""));
  $("history-count").textContent=rows.length+" arXiv-hosted papers on this page · "+found.toLocaleString()+" indexed matches";
  if(!rows.length)root.append(el("div","No arXiv-linked records returned in this OpenAlex search batch. This does not mean the paper is absent from arXiv; use the official source search or an exact arXiv ID.","empty"));
  else for(const w of rows){const card=paperCard(w);if(card)root.append(card)}
  if(Arxiv?.parse(p.q)&&!rows.length){
   const x=el("div","This paper may not be indexed by OpenAlex. Open the source record: ","empty");
   addLink(x,"Open "+p.q+" on arXiv ↗",Arxiv.abs(p.q),"rl-paper-action primary");
   root.append(x);
  }
  pager();
 }catch(e){if(e.name==="AbortError")return;
   root.replaceChildren(el("div","The external search provider could not return results ("+String(e.message||e).slice(0,160)+"). Local Litveyra papers are still available.","empty"));
   $("history-count").textContent="Search temporarily unavailable";found=0;pager();
 }finally{loading=false}
}
btn.addEventListener("click",()=>search(1));
$("arxiv-live-search")?.addEventListener("click",()=>search(1));
back.addEventListener("click",()=>{if(controller)controller.abort();switchView(false);const u=new URL(location.href);u.searchParams.delete("history");u.searchParams.delete("page");window.history.replaceState({},"",u.pathname+u.search)});
$("q").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();search(1)}});
const urlParams=new URLSearchParams(location.search);
if(urlParams.get("from"))$("date-from").value=urlParams.get("from").slice(0,10);
if(urlParams.get("to"))$("date-to").value=urlParams.get("to").slice(0,10);
if(urlParams.get("history")==="1"){const target=Number(urlParams.get("page"));search(Number.isInteger(target)&&target>0&&target<=400?target:1,true)}
window.ResearchLensHistorySearch={search};
})();
