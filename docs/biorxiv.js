/* bioRxiv recent preprints, cached from its documented public metadata API.
 * DOI-keyed local reading list separate from arXiv identifiers.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoBioRxiv=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const KEY="axiovo-biorxiv-reading-v1",META="axiovo-biorxiv-notes-v1";
 function normalize(p){
  if(!p||!/^10\.1101\/[a-z0-9._;()/:+-]+$/i.test(String(p.doi||"")))return null;
  return {doi:String(p.doi),title:String(p.title||"").slice(0,500),
   authors:Array.isArray(p.authors)?p.authors.map(String).slice(0,100):[],
   abstract:String(p.abstract||"").slice(0,12000),
   category:String(p.category||""),date:String(p.date||"").slice(0,10),
   version:String(p.version||"1"),url:"https://www.biorxiv.org/content/"+p.doi};
 }
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}}
 function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
 function saved(){const raw=read(KEY,[]);return Array.isArray(raw)?raw.map(normalize).filter(Boolean):[]}
 function save(p){const item=normalize(p);if(!item)return false;const papers=saved();
  if(papers.some(x=>x.doi===item.doi))return true;
  if(!write(KEY,[item,...papers].slice(0,1000)))return false;
  if(typeof window!=="undefined")window.dispatchEvent(new Event("axiovo:biorxiv-saved"));
  return true;
 }
 function remove(doi){const next=saved().filter(x=>x.doi!==doi);
  if(!write(KEY,next))return false;
  if(typeof window!=="undefined")window.dispatchEvent(new Event("axiovo:biorxiv-saved"));
  return true;
 }
 function text(tag,value){const n=document.createElement(tag);n.textContent=value||"";return n}
 function paperCard(p,asSaved=false){
  const article=text("article");article.className="axiovo-biorxiv-paper";
  article.append(text("small","bioRxiv · "+(p.category||"Uncategorized")+" · "+(p.date||"date unavailable")+" · v"+p.version));
  const title=text("h3",p.title);article.append(title);
  article.append(text("p",p.authors.join(", ")));
  if(!asSaved)article.append(text("p",p.abstract.slice(0,520)+(p.abstract.length>520?"…":"")));
  const bar=text("div");bar.className="axiovo-biorxiv-actions";
  const source=text("a","Original bioRxiv record");source.href=p.url;source.target="_blank";source.rel="noopener noreferrer";bar.append(source);
  const act=text("button",asSaved?"Remove saved paper":"Save to Library");act.type="button";
  act.onclick=()=>{asSaved?remove(p.doi):save(p);if(!asSaved)act.textContent="Saved to Library"};
  bar.append(act);
  if(asSaved){
   const notes=read(META,{});
   const input=document.createElement("textarea");input.rows=2;input.maxLength=2000;
   input.placeholder="Private reading note for this bioRxiv preprint";input.value=String(notes[p.doi]||"");
   input.setAttribute("aria-label","Note for "+p.title);
   input.onchange=()=>{const next=read(META,{});next[p.doi]=input.value;write(META,next)};
   article.append(input);
  }
  article.append(bar);return article;
 }
 let feed=[],lastUpdated="";
 function draw(){
  const container=document.getElementById("axiovo-biorxiv-results");
  if(!container)return;container.replaceChildren();
  const q=(document.getElementById("axiovo-biorxiv-query")?.value||"").trim().toLowerCase();
  const category=document.getElementById("axiovo-biorxiv-category")?.value||"";
  const selected=feed.filter(p=>(!category||p.category===category)&&
   (!q||[p.title,p.abstract,p.category,p.authors.join(" "),p.doi].join(" ").toLowerCase().includes(q)));
  const status=document.getElementById("axiovo-biorxiv-status");
  if(status)status.textContent=feed.length?
   selected.length+" of "+feed.length+" cached recent bioRxiv preprints · last sync "+lastUpdated:
   "No bioRxiv metadata has been synchronized yet. Use the official bioRxiv search below.";
  if(!selected.length)container.append(text("p","No matching cached preprints. This does not mean bioRxiv has no matching work."));
  selected.slice(0,100).forEach(p=>container.append(paperCard(p)));
  const official=document.getElementById("axiovo-biorxiv-official");
  if(official)official.href="https://www.biorxiv.org/search/"+encodeURIComponent(q||"")+(q?"%20":"")+"numresults%3A50%20sort%3Arelevance-rank";
 }
 async function start(){
  const list=document.getElementById("axiovo-biorxiv-results");if(!list)return;
  try{
   const resp=await fetch("./data/biorxiv.json",{cache:"no-cache"});
   if(!resp.ok)throw Error("HTTP "+resp.status);
   const data=await resp.json();
   feed=(Array.isArray(data.papers)?data.papers:[]).map(normalize).filter(Boolean);
   lastUpdated=String(data.generated_at||"not yet synchronized").slice(0,19);
   const cats=[...new Set(feed.map(x=>x.category).filter(Boolean))].sort();
   const filter=document.getElementById("axiovo-biorxiv-category");
   for(const c of cats){const opt=text("option",c);opt.value=c;filter?.append(opt)}
  }catch(e){const status=document.getElementById("axiovo-biorxiv-status");
   if(status)status.textContent="Cached bioRxiv feed unavailable. Search the original archive.";
  }
  document.getElementById("axiovo-biorxiv-query")?.addEventListener("input",draw);
  document.getElementById("axiovo-biorxiv-category")?.addEventListener("change",draw);
  draw();
 }
 function drawLibrary(){
  const root=document.getElementById("axiovo-biorxiv-library");
  if(!root)return;root.replaceChildren();
  const entries=saved();
  const total=document.getElementById("axiovo-biorxiv-library-count");
  if(total)total.textContent=entries.length+" saved bioRxiv preprints";
  if(!entries.length)root.append(text("p","No bioRxiv preprints saved. Find them in Discover → bioRxiv."));
  entries.forEach(p=>root.append(paperCard(p,true)));
 }
 if(typeof window!=="undefined"){
  document.addEventListener("DOMContentLoaded",start);
  window.addEventListener("researchlens:workspace-activated",drawLibrary);
  window.addEventListener("axiovo:biorxiv-saved",drawLibrary);
  window.addEventListener("storage",e=>{if([KEY,META].includes(e.key))drawLibrary()});
 }
 return {normalize,save,remove,saved};
});
