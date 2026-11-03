"use strict";
/* Historical arXiv-linked search rendered inside ResearchLens.
 * OpenAlex source filter limits to papers with a harvested arXiv copy,
 * but this is not a complete arXiv archive and publication_date may
 * differ from arXiv's original submission date.
 */
(function(){
const $=id=>document.getElementById(id);
const PAGE_SIZE=25;
const ARXIV_SOURCE="S4306400194";
let page=1,found=0,loading=false,controller=null,active=false,lastRequest=null;
const btn=$("all-arxiv"),back=$("back-local"),view=$("history-view"),feed=$("local-feed-view");
if(!btn||!back||!view||!feed)return;
function el(tag,text,cls){
 const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;
}
function addLink(parent,text,url,cls="btn"){
 try{const u=new URL(url);if(u.protocol!=="https:")return null;const a=el("a",text,cls);a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";parent.append(a);return a}catch(e){return null}
}
function pageInfo(){return {q:$("q").value.trim(),from:$("date-from").value,to:$("date-to").value,sort:$("order").value}}
function switchView(on){
 active=on;view.hidden=!on;feed.hidden=on;back.hidden=!on;btn.textContent=on?"Update historical results":"Search historical arXiv papers here";
 if(on)view.scrollIntoView({behavior:"smooth",block:"start"});
}
function arxivLocation(w){
 const locations=[...(w.locations||[]),w.primary_location,w.best_oa_location].filter(Boolean);
 const candidates=locations.map(x=>x.landing_page_url||x.pdf_url||"").filter(Boolean);
 return candidates.find(u=>/^https:\/\/(?:export\.|www\.)?arxiv\.org\/(?:abs|pdf)\//i.test(u))||null;
}
function bibtex(p){
 const key=("arxiv"+(p.arxiv||p.id||"").replace(/[^a-z0-9]/gi,"")).slice(0,90);
 return "@misc{"+key+",\n  title={"+p.title.replace(/[{}]/g,"")+"},\n  author={"+p.authors.join(" and ").replace(/[{}]/g,"")+"},\n  year={"+(p.date||"").slice(0,4)+"},\n  url={"+p.url+"}\n}";
}
function paperCard(w){
 const card=el("article",undefined,"paper");
 const source=arxivLocation(w);
 const meta=el("div",undefined,"row");meta.append(el("span","arXiv-linked · OpenAlex record","category"));if(w.publication_date)meta.append(el("span",w.publication_date,"small"));card.append(meta);
 card.append(el("h2",w.display_name||w.title||"Untitled work"));
 const authors=(w.authorships||[]).slice(0,8).map(x=>x.author?.display_name||"").filter(Boolean);
 card.append(el("div",authors.join(", ")+(w.authorships?.length>8?", et al.":""),"meta"));
 const desc=el("p",undefined,"abstract");
 desc.textContent=w.primary_location?.source?.display_name?"Indexed via "+w.primary_location.source.display_name+". Check original arXiv submission date in the source record.":"Check the original paper for its submission date, versions, and full text.";
 card.append(desc);
 const row=el("div",undefined,"row");
 if(source){
  addLink(row,"View on arXiv ↗",source,"btn primary");
  const arxivMatch=source.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/i);
  if(arxivMatch){
   const normalized=arxivMatch[1].replace(/\.pdf$/i,"");
   addLink(row,"PDF ↗","https://arxiv.org/pdf/"+encodeURIComponent(normalized));
   addLink(row,"Paper discussion","./paper.html?id="+encodeURIComponent(normalized));
  }
 }
 addLink(row,"OpenAlex record ↗",w.id,"btn"+(!source?" primary":""));
 if(w.doi)addLink(row,"DOI ↗",w.doi);
 if(w.best_oa_location?.landing_page_url)addLink(row,"Open-access source ↗",w.best_oa_location.landing_page_url);
 const copy=el("button","Copy citation","btn");copy.onclick=async()=>{
  const citation=bibtex({id:w.id,title:w.display_name||w.title||"",authors,date:w.publication_date||"",url:source||w.id});
  try{await navigator.clipboard.writeText(citation);copy.textContent="Copied!"}catch(e){copy.textContent="Copy unavailable"}};
 row.append(copy);card.append(row);return card;
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
 if(p.from&&p.to&&p.from>p.to){$("history-info").textContent="Start date must be before or equal to end date.";switchView(true);return}
 if(p.q.length>0&&p.q.length<3&& !/^\d{4}\.\d{4,5}(?:v\d+)?$/.test(p.q)){$("history-info").textContent="Enter at least 3 letters, or use the date fields alone.";switchView(true);return}
 if(!p.q&&!p.from&&!p.to){$("history-info").textContent="Choose a date range or enter keywords before searching the historic archive.";switchView(true);return}
 if(controller)controller.abort();
 controller=new AbortController();loading=true;page=n;switchView(true);
 const root=$("history-cards");root.replaceChildren(el("div","Searching arXiv-linked records through OpenAlex…","empty"));
 $("history-count").textContent="Searching…";
 $("history-pagination").replaceChildren();
 $("history-info").textContent="Works with an arXiv copy in OpenAlex. These are external search results, not the local index. Publication dates are not guaranteed arXiv v1 dates.";
 const filters=["locations.source.id:"+ARXIV_SOURCE];
 if(p.from)filters.push("from_publication_date:"+p.from);
 if(p.to)filters.push("to_publication_date:"+p.to);
 const qs=new URLSearchParams({filter:filters.join(","),page:String(page),per_page:String(PAGE_SIZE),select:"id,display_name,title,publication_date,authorships,doi,locations,primary_location,best_oa_location"});
 if(p.q){
  const id=p.q.replace(/^arxiv:\s*/i,"").replace(/v\d+$/,"");
  if(/^\d{4}\.\d{4,5}$/.test(id)){
   // Search title/abstract by ID may not match. A URL-aware fallback is shown
   // if OpenAlex cannot locate the requested preprint.
   qs.set("search",id);
  }else qs.set("search",p.q);
 }
 if(p.sort==="old")qs.set("sort","publication_date:asc");
 else if(p.sort==="new")qs.set("sort","publication_date:desc");
 else if(p.sort==="title")qs.set("sort","display_name:asc");
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
  const rows=payload.results||[];
  $("history-count").textContent=found.toLocaleString()+" arXiv-linked records found";
  if(!rows.length)root.append(el("div","No matching arXiv-linked records in OpenAlex. Try a broader date range or fewer keywords. This does not establish that arXiv has no papers.","empty"));
  else for(const w of rows)root.append(paperCard(w));
  if(/^\d{4}\.\d{4,5}(?:v\d+)?$/.test(p.q)&&!rows.length){
   const x=el("div","Look up the exact identifier at the authoritative arXiv record: ","empty");
   addLink(x,"arXiv:"+p.q+" ↗","https://arxiv.org/abs/"+p.q);
   root.append(x);
  }
  pager();
 }catch(e){if(e.name==="AbortError")return;
   root.replaceChildren(el("div","The external search provider could not return results ("+String(e.message||e).slice(0,160)+"). Local ResearchLens papers are still available.","empty"));
   $("history-count").textContent="Search temporarily unavailable";found=0;pager();
 }finally{loading=false}
}
btn.addEventListener("click",()=>search(1));
back.addEventListener("click",()=>{if(controller)controller.abort();switchView(false);const u=new URL(location.href);u.searchParams.delete("history");u.searchParams.delete("page");window.history.replaceState({},"",u.pathname+u.search)});
$("q").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();search(1)}});
const urlParams=new URLSearchParams(location.search);
if(urlParams.get("from"))$("date-from").value=urlParams.get("from").slice(0,10);
if(urlParams.get("to"))$("date-to").value=urlParams.get("to").slice(0,10);
if(urlParams.get("history")==="1"){const target=Number(urlParams.get("page"));search(Number.isInteger(target)&&target>0&&target<=400?target:1,true)}
window.ResearchLensHistorySearch={search};
})();
