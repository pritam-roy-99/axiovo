/* ChemRxiv independent source view. Verified DOI metadata only.
 * Archive-specific local saving is supported; no false claims of completeness.
 */
(function(){
"use strict";
const KEY="axiovo-chemrxiv-reading-v1";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const saved=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch{return []}};
function updateSaved(item,btn){
 const items=saved(),has=items.some(p=>p.doi===item.doi);
 const next=has?items.filter(p=>p.doi!==item.doi):[...items,item];
 try{localStorage.setItem(KEY,JSON.stringify(next))}catch{return}
 btn.textContent=has?"☆ Save paper":"✓ Saved";
 window.dispatchEvent(new Event("axiovo:chemrxiv-saved"));
}
function card(p){
 const art=document.createElement("article");art.className="paper axiovo-archive-paper";
 const meta=document.createElement("div");meta.className="meta";meta.textContent="ChemRxiv · "+(p.date||"Date not supplied")+" · DOI "+p.doi;
 const title=document.createElement("h3");title.textContent=p.title;
 const authors=document.createElement("p");authors.className="meta";authors.textContent=(p.authors||[]).join(", ")||"See official record for authors";
 const summary=document.createElement("p");summary.textContent=p.abstract||"Abstract not available in this verified DOI snapshot.";
 const actions=document.createElement("div");actions.className="rl-paper-actionbar";
 const link=document.createElement("a");link.textContent="Read on ChemRxiv";link.href=p.url;link.target="_blank";link.rel="noopener noreferrer";link.className="btn primary";
 const save=document.createElement("button");save.type="button";save.className="btn";save.textContent=saved().some(x=>x.doi===p.doi)?"✓ Saved":"☆ Save paper";save.onclick=()=>updateSaved(p,save);
 const copy=document.createElement("button");copy.type="button";copy.className="btn";copy.textContent="Copy DOI";copy.onclick=()=>navigator.clipboard?.writeText(p.doi);
 actions.append(link,save,copy);art.append(meta,title,authors,summary,actions);return art;
}
let papers=[],date="";
function draw(){
 const box=$("axiovo-chemrxiv-results"),status=$("axiovo-chemrxiv-status");if(!box)return;
 box.replaceChildren();
 const q=($("axiovo-chemrxiv-query")?.value||"").trim().toLowerCase();
 const category=($("axiovo-chemrxiv-category")?.value||"").trim().toLowerCase();
 const selected=papers.filter(p=>(!category||p.category.toLowerCase().includes(category))&&(!q||[p.title,p.abstract,p.doi,p.category,(p.authors||[]).join(" ")].join(" ").toLowerCase().includes(q)));
 if(status)status.textContent=papers.length?selected.length+" matching of "+papers.length+" verified ChemRxiv DOI records · snapshot "+date+". Partial catalogue, not a complete archive.":"ChemRxiv cached metadata is currently unavailable. No zero-paper claim is made.";
 const count=Math.min(selected.length,100);
 for(const p of selected.slice(0,count))box.append(card(p));
 if(!count){const empty=document.createElement("p");empty.textContent="No verified cached matches. Try a different term or use ChemRxiv's official search.";box.append(empty)}
 const official=$("axiovo-chemrxiv-official");
 if(official)official.href="https://chemrxiv.org/action/doSearch?AllField="+encodeURIComponent(q);
}
async function load(){
 if(!$("axiovo-chemrxiv-results"))return;
 try{
  const r=await fetch("./data/chemrxiv.json",{cache:"no-store"});
  if(!r.ok)throw Error("Snapshot absent");
  const data=await r.json();
  if(!Array.isArray(data.papers))throw Error("Invalid snapshot");
  papers=data.papers.filter(p=>p?.doi&&p?.title&&/^https:\/\/doi\.org\/10\./.test(p.url||""));
  date=(data.generated_at||"unavailable").slice(0,10);
  const categories=[...new Set(papers.map(p=>p.category).filter(Boolean))].sort();
  const select=$("axiovo-chemrxiv-category");
  for(const x of categories){const opt=document.createElement("option");opt.value=x;opt.textContent=x;select?.append(opt)}
 }catch{papers=[];date="not yet verified"}
 $("axiovo-chemrxiv-query")?.addEventListener("input",draw);
 $("axiovo-chemrxiv-category")?.addEventListener("change",draw);
 draw();
}
function drawLibrary(){
 let root=$("axiovo-chemrxiv-library");
 if(!root)return;
 root.replaceChildren();
 const arr=saved();
 const count=$("axiovo-chemrxiv-library-count");
 if(count)count.textContent=arr.length+" saved ChemRxiv papers";
 if(!arr.length){const note=document.createElement("p");note.textContent="No ChemRxiv preprints saved yet.";root.append(note);return}
 arr.forEach(p=>root.append(card(p)));
}
window.addEventListener("axiovo:workspace-activated",drawLibrary);
window.addEventListener("axiovo:chemrxiv-saved",drawLibrary);
window.addEventListener("storage",e=>{if(e.key===KEY)drawLibrary()});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{load();drawLibrary()});else{load();drawLibrary()}
})();