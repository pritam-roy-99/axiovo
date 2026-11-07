/* IACR ePrint Discover: source-linked local metadata, not fabricated remote search. */
(function(){
 "use strict";
 const data=window.AxiovoArchiveData,$=id=>document.getElementById(id);
 if(!data)return;
 let papers=[],shown=[],page=1,loaded=false,stamp="",complete=false,preview=false;
 const form=$("crypto-search-form");
 const fields=["query","topic","author","sort","from","to"];
 function el(tag,text,cls){
  const e=document.createElement(tag);
  if(text!==undefined)e.textContent=text;
  if(cls)e.className=cls;
  return e;
 }
 function link(label,url){const a=el("a",label);a.href=url;return a}
 function filters(){
  return {q:$("crypto-query").value.trim(),author:$("crypto-author").value.trim(),
   topicTerms:$("crypto-topic").value?[ $("crypto-topic").value ]:[],
   from:$("crypto-from").value,to:$("crypto-to").value,
   sort:$("crypto-sort").value};
 }
 function fromURL(){
  const qs=new URLSearchParams(location.search);
  for(const key of fields){
   const value=qs.get(key);
   if(value!==null){
    const input=$("crypto-"+key);
    if(input?.tagName==="SELECT"&&![...input.options].some(o=>o.value===value))continue;
    if(input)input.value=value;
   }
  }
 }
 function updateURL(){
  const p=new URLSearchParams();
  for(const k of fields){
   const v=$("crypto-"+k)?.value?.trim();
   if(v&&!(k==="sort"&&v==="relevance"))p.set(k,v);
  }
  history.replaceState(null,"",location.pathname+(p.size?"?"+p:""));
 }
 function render(){
  const target=$("crypto-results");target.replaceChildren();
  const nav=$("crypto-pagination");nav.replaceChildren();
  const status=$("crypto-results-status");
  if(!loaded){
   status.textContent="Checking indexed IACR metadata…";
   target.append(el("p","Loading verified-source snapshot…","rd-small"));return;
  }
  const c=filters();
  if(c.from&&c.to&&c.from>c.to){
   status.textContent="Choose an end date on or after the start date.";return;
  }
  // The existing archive matcher is reused for exact-ID, dates and authors.
  // Theme selections are a transparent keyword refinement, NOT provider taxonomy.
  shown=data.filter(papers,c);
  if(c.sort==="title")shown.sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
  const perPage=12;
  const total=shown.length,pages=Math.max(1,Math.ceil(total/perPage));
  page=Math.max(1,Math.min(page,pages));
  const visible=shown.slice((page-1)*perPage,page*perPage);
  status.textContent=total+" of "+papers.length+(preview?" recent-preview IACR records match. Full available source index is still loading.":" indexed IACR records match. ")+
   (preview?" Results are provisional until the full snapshot is checked.":complete?"Completed all available OAI metadata-date windows. Some source records may not be exposed.":"Coverage is partial; not all historical papers are indexed.");
  if(!total){
   target.append(el("p",preview?"No matches in the recent preview. Searching the complete available IACR snapshot next…":"No match in Axiovo's available IACR metadata. This does not mean the original archive has no such paper.","rd-small"));
   const official=link("Search IACR ePrint directly ↗","https://eprint.iacr.org/search");
   official.target="_blank";official.rel="noopener";target.append(official);
   return;
  }
  for(const p of visible){
   const article=el("article",undefined,"crypto-paper");
   const head=el("div",undefined,"crypto-paper-heading");
   const id=el("small","IACR ePrint "+p.recordId+" · "+(p.date||"Source date not provided"),"crypto-paper-id");
   const h3=el("h3");
   const a=link(p.title,p.url);a.target="_blank";a.rel="noopener noreferrer";
   h3.append(a);head.append(id,h3);article.append(head);
   article.append(el("p",p.authors.join(", ")||"Authors not provided by source","crypto-paper-authors"));
   if(p.abstract){const abs=el("details");abs.append(el("summary","Read original abstract"),el("p",p.abstract));article.append(abs)}
   const actions=el("div",undefined,"crypto-paper-actions");
   const save=el("button",data.saved(p)?"★ Saved":"☆ Save","rd-button rd-secondary");
   save.type="button";save.setAttribute("aria-pressed",String(data.saved(p)));
   save.onclick=()=>{
    const yes=data.saved(p);const ok=yes?data.unsave(p):data.save(p);
    if(!ok){$("crypto-results-status").textContent="Could not update Library storage.";return}
    save.textContent=yes?"☆ Save":"★ Saved";
    save.setAttribute("aria-pressed",String(!yes));
   };
   const compare=el("button","Add to comparison","rd-button rd-secondary");
   compare.type="button";compare.onclick=()=>{
    const outcome=data.addComparison(p);
    compare.textContent=outcome==="full"?"Comparison full (5 papers)":outcome==="unavailable"?"Storage unavailable":"Added to comparison";
   };
   const assistant=link("Research Assistant","./copilot.html?id="+encodeURIComponent("eprint:"+p.id));
   assistant.className="rd-button rd-secondary";
   if(p.abstract&&window.AxiovoAbstractAudio){
    const listen=el("button","Listen to abstract","rd-button rd-secondary");
    listen.type="button";listen.onclick=()=>window.AxiovoAbstractAudio.play([p]);
    actions.append(listen);
   }
   const original=link("Original record ↗",p.url);original.target="_blank";original.rel="noopener";
   original.className="rd-button rd-secondary";
   actions.append(save,compare,assistant,original);article.append(actions);
   target.append(article);
  }
  if(pages>1){
   const previous=el("button","← Previous","rd-button rd-secondary");
   const next=el("button","Next →","rd-button rd-secondary");
   previous.disabled=page===1;next.disabled=page===pages;
   previous.onclick=()=>{page--;render();target.scrollIntoView({block:"start"})};
   next.onclick=()=>{page++;render();target.scrollIntoView({block:"start"})};
   nav.append(previous,el("span","Page "+page+" of "+pages),next);
  }
 }
 function search(){
  page=1;updateURL();render();
 }
 form.addEventListener("submit",e=>{e.preventDefault();search()});
 for(const key of ["topic","sort","from","to"])
  $("crypto-"+key).addEventListener("change",search);
 $("crypto-reset").onclick=()=>{
  for(const key of fields)$("crypto-"+key).value=key==="sort"?"relevance":"";
  search();
 };
 $("crypto-follow").onclick=()=>{
  const term=$("crypto-topic").value;
  if(!term){$("crypto-results-status").textContent="Choose a research topic to follow.";return}
  const api=window.AxiovoFeedPreferences;
  if(!api||!api.updateTopic(localStorage,term,true)){
   $("crypto-results-status").textContent="Could not save your topic follow.";return
  }
  $("crypto-results-status").textContent="Following "+term+" in My Feed. Current search results remain available.";
 };
 window.addEventListener("storage",e=>{if(e.key==="axiovo-eprint-reading-v1")render()});
 fromURL();
 // Show source-verified recent records promptly, but never replace full
 // historical retrieval with a preview-only search. All subsequent queries
 // and filters run again against the complete available source snapshot.
 async function showPreview(){
  try{
   const response=await fetch("./data/feed-preview.json",{
    cache:"default",signal:AbortSignal.timeout(5000)
   });
   if(!response.ok)return;
   const payload=await response.json();
   if(payload.coverage!=="recent-preview-only-full-source-snapshots-load-afterward"||
      !Array.isArray(payload.papers)||loaded)return;
   const first=payload.papers.filter(p=>p.source==="eprint")
    .map(p=>data.normalize("eprint",p)).filter(Boolean);
   if(!first.length||loaded)return;
   papers=first;preview=true;loaded=true;
   $("crypto-coverage-count").textContent="Recent IACR preview · loading full indexed history";
   render();
  }catch(_error){ /* Old sites can omit this optional preview. */ }
 }
 void showPreview();
 data.snapshot("eprint").then(value=>{
  papers=Array.isArray(value.papers)?value.papers:[];
  stamp=value.stamp;complete=value.fullOaiTraversal===true;
  loaded=true;preview=false;
  $("crypto-coverage-count").textContent=papers.length+" source-linked records indexed"+
   (stamp?" · updated "+stamp.slice(0,10):"")+(complete?" · full available OAI history traversed":" · history incomplete");
  render();
 }).catch(()=>{
  loaded=true;
  $("crypto-coverage-count").textContent=preview?
   "IACR full index unavailable · showing recent preview only":"IACR metadata unavailable · official archive remains accessible";
  render();
 });
})();
