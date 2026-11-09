/* IACR ePrint Discover: source-linked local metadata, not fabricated remote search. */
(function(){
 "use strict";
 const data=window.AxiovoArchiveData,$=id=>document.getElementById(id);
 // Topic controls must initialize even when the scholarly metadata service is unavailable.
 let papers=[],shown=[],page=1,loaded=false,stamp="",complete=false,offlineSubset=false,sourceName="";
 const form=$("crypto-search-form");
 const fields=["query","field","topic","subtopic","author","sort","from","to"];
 let viewMode=new URLSearchParams(location.search).get("mode")==="indexed"?"indexed":"recent";
 const utcDay=()=>new Date().toISOString().slice(0,10);
 const daysBefore=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
 function el(tag,text,cls){
  const e=document.createElement(tag);
  if(text!==undefined)e.textContent=text;
  if(cls)e.className=cls;
  return e;
 }
 function link(label,url){const a=el("a",label);a.href=url;return a}

 // Topic picker and saved-path features live in crypto-topics.js and
 // function independently of source metadata availability.
 const getPath=()=>window.AxiovoCryptoTopics?.path?.()||{field:"",topic:"",subtopic:""};
 // A new topic filters the active recent or indexed-history mode; it does
 // not implicitly change that mode when a path is restored or cleared.
 document.addEventListener("axiovo:crypto-path-change",()=>search());
 function filters(){
  return {q:$("crypto-query").value.trim(),author:$("crypto-author").value.trim(),
   topicTerms:getPath().subtopic?[getPath().subtopic]:[],
   topicAnyTerms:window.AxiovoCryptoTopics?.termsForPath?.()||[],
   from:$("crypto-from").value,to:$("crypto-to").value,
   sort:$("crypto-sort").value};
 }
 function fromURL(){
  const qs=new URLSearchParams(location.search);
  for(const key of fields){
   if(["field","topic","subtopic"].includes(key))continue;
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
  if(!$("crypto-from").value&&!$("crypto-to").value)p.set("mode",viewMode);
  for(const k of fields){
   const v=$("crypto-"+k)?.value?.trim();
   if(v&&!(k==="sort"&&v==="relevance"))p.set(k,v);
  }
  history.replaceState(null,"",location.pathname+(p.size?"?"+p:""));
 }
 function render(refilter=true){
  const target=$("crypto-results");target.replaceChildren();
  const nav=$("crypto-pagination");nav.replaceChildren();
  const status=$("crypto-results-status");
  if(!loaded){
   status.textContent="Checking indexed IACR metadata…";
   target.append(el("p","Loading verified-source snapshot…","rd-small"));return;
  }
  const c=filters();
  const recentOnly=viewMode==="recent"&&!c.from&&!c.to&&!data?.parseEprint?.(c.q);
  if(recentOnly){c.from=daysBefore(6);c.to=utcDay();if(c.sort==="relevance")c.sort="recent";}
  $("crypto-result-sort").value=c.sort;
  if(c.from&&c.to&&c.from>c.to){
   status.textContent="Choose an end date on or after the start date.";return;
  }
  // The existing archive matcher is reused for exact-ID, dates and authors.
  // Theme selections are a transparent keyword refinement, NOT provider taxonomy.
  if(refilter){
   shown=window.AxiovoEprintSource?.filter?window.AxiovoEprintSource.filter(papers,c):data?.filter?data.filter(papers,c):[];
   if(c.sort==="title")shown.sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
  }
  const perPage=12;
  const total=shown.length,pages=Math.max(1,Math.ceil(total/perPage));
  page=Math.max(1,Math.min(page,pages));
  const visible=shown.slice((page-1)*perPage,page*perPage);
  const newest=shown.map(p=>p.date||"").filter(Boolean).sort().at(-1)||"date unavailable";
  const scope=[getPath().field,getPath().topic,getPath().subtopic].filter(Boolean).join(" › ")||"all indexed cryptography";
  status.textContent=total+" of "+papers.length+" "+(offlineSubset?"locally saved source-verified records":"indexed IACR records")+" match "+scope+
   (recentOnly?" in the last 7 days ("+c.from+" to "+c.to+")":" in indexed history or the specified dates")+
   ". Latest matching source date: "+newest+". "+
   (offlineSubset?"Offline subset: coverage is limited and may be outdated.":complete?"Completed available OAI metadata-date windows. Some source records may not be exposed.":"Coverage is partial; not all historical papers are indexed.");
  if(!total){
   target.append(el("p",recentOnly?
    "No matching IACR ePrint papers in the last 7 days of available source-date metadata. Broaden the dates or use indexed history. No match does not prove the source has no paper.":
    "No match in Axiovo's available IACR metadata. This does not mean the original archive has no such paper.","rd-small"));
   const exact=data?.parseEprint?.(c.q)||"";
   if(exact){
    const original=link("Open original IACR ePrint "+exact+" ↗","https://eprint.iacr.org/"+exact);
    original.target="_blank";original.rel="noopener noreferrer";target.append(original);
   }
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
   const save=el("button",data?.saved?.(p)?"★ Saved":"☆ Save","rd-button rd-secondary");
   save.type="button";save.setAttribute("aria-pressed",String(!!data?.saved?.(p)));
   save.onclick=()=>{
    const yes=data?.saved?.(p);const ok=yes?data?.unsave?.(p):data?.save?.(p);
    if(!ok){$("crypto-results-status").textContent="Could not update Library storage.";return}
    save.textContent=yes?"☆ Save":"★ Saved";
    save.setAttribute("aria-pressed",String(!yes));
   };
   const compare=el("button","Add to comparison","rd-button rd-secondary");
   compare.type="button";compare.onclick=()=>{
    const outcome=data?.addComparison?.(p)||"unavailable";
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
   window.AxiovoCitationEvidence?.add(article,p);
   target.append(article);
  }
  if(pages>1){
   const previous=el("button","← Previous","rd-button rd-secondary");
   const next=el("button","Next →","rd-button rd-secondary");
   previous.disabled=page===1;next.disabled=page===pages;
   previous.onclick=()=>{page--;render(false);target.scrollIntoView({block:"start"})};
   next.onclick=()=>{page++;render(false);target.scrollIntoView({block:"start"})};
   nav.append(previous,el("span","Page "+page+" of "+pages),next);
  }
 }
 function search(){
  page=1;updateURL();render();
 }
 form.addEventListener("submit",e=>{e.preventDefault();search()});
 for(const key of ["sort","from","to"])
  $("crypto-"+key).addEventListener("change",search);
 $("crypto-result-sort").addEventListener("change",()=>{$("crypto-sort").value=$("crypto-result-sort").value;search()});
 $("crypto-topic-latest").onclick=()=>{
  viewMode="recent";$("crypto-from").value="";$("crypto-to").value="";$("crypto-sort").value="recent";search();
 };
 $("crypto-latest").onclick=()=>{
  viewMode="indexed";
  $("crypto-from").value="";$("crypto-to").value="";
  $("crypto-sort").value="recent";search();
 };
 $("crypto-latest-verified").onclick=async()=>{
  const button=$("crypto-latest-verified");button.disabled=true;
  try{
   const snapshot=await window.AxiovoArchiveData.snapshot("eprint");
   const latest=(snapshot.papers||[]).map(p=>p.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort().at(-1);
   if(!latest)throw Error("No verified source day");
   viewMode="indexed";$("crypto-from").value=latest;$("crypto-to").value=latest;$("crypto-sort").value="recent";search();
  }catch{$("crypto-results-status").textContent="No verified source day is available in the indexed IACR records."}
  finally{button.disabled=false}
 };
 $("crypto-week").onclick=()=>{viewMode="recent";const d=new Date();$("crypto-to").value=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()-7);$("crypto-from").value=d.toISOString().slice(0,10);search()};
 $("crypto-date-open").onclick=()=>{$("crypto-advanced").open=true;$("crypto-from").focus()};
 $("crypto-history")?.addEventListener("click",()=>{
  viewMode="indexed";
  $("crypto-from").value="";$("crypto-to").value="";
  $("crypto-sort").value="oldest";
  $("crypto-advanced").open=true;
  search();
  $("crypto-index-note").textContent="Historical search uses all source-verified records presently indexed by Axiovo. This is NOT a complete IACR ePrint history; check the original archive for missing papers.";
 });

 $("crypto-reset").onclick=()=>{
  window.AxiovoCryptoTopics?.clear?.();
  for(const key of ["query","author","sort","from","to"])$("crypto-"+key).value=key==="sort"?"relevance":"";
  viewMode="recent";search();
 };
 $("crypto-follow").onclick=()=>{
  const current=getPath();const term=current.subtopic||current.topic||current.field;
  if(!term){$("crypto-results-status").textContent="Choose a research topic to follow.";return}
  const api=window.AxiovoFeedPreferences;
  if(!api||!api.updateTopic(localStorage,term,true)){
   $("crypto-results-status").textContent="Could not save your topic follow.";return
  }
  $("crypto-results-status").textContent="Following "+term+" in My Feed. Current search results remain available.";
 };
 window.addEventListener("storage",e=>{if(e.key==="axiovo-eprint-reading-v1")render(false)});
 fromURL();
 function applySnapshot(value){
  papers=Array.isArray(value.papers)?value.papers:[];
  stamp=value.stamp||"";
  complete=value.fullOaiTraversal===true;
  offlineSubset=value.cache===true;
  sourceName=value.source||"IACR OAI-PMH";
  loaded=true;
  $("crypto-coverage-count").textContent=papers.length.toLocaleString()+
   (offlineSubset?" saved source-verified records (offline subset)":" verified-source records indexed")+
   (stamp?" · snapshot "+stamp.slice(0,10):"")+
   (complete?" · available history traversed":" · history incomplete");
  $("crypto-index-note").textContent=offlineSubset?
   "Offline fallback contains only a small source-verified subset. Reconnect for the complete published index.":
   "Records from "+sourceName+". Axiovo's index is not the complete IACR historical archive.";
  render();
 }
 async function loadEprint(force=false){
  const button=$("crypto-retry");
  if(button)button.disabled=true;
  const hasSnapshot=loaded&&papers.length>0;
  if(hasSnapshot)$("crypto-results-status").textContent="Checking for an updated IACR snapshot…";
  else{loaded=false;render()}
  try{
   if(!window.AxiovoEprintSource?.load)throw Error("Independent ePrint loader unavailable");
   const snapshot=await window.AxiovoEprintSource.load({force});
   if(hasSnapshot&&!offlineSubset&&snapshot.cache)throw Error("Only an offline subset is available");
   applySnapshot(snapshot);
  }catch(error){
   if(hasSnapshot){
    $("crypto-results-status").textContent="Could not refresh IACR. The previously loaded results are still available.";
    return;
   }
   loaded=true;papers=[];offlineSubset=false;render();
   $("crypto-coverage-count").textContent="Indexed data unavailable · retry or search IACR directly";
   $("crypto-index-note").textContent="The indexed snapshot could not be retrieved. No papers or citation data were fabricated.";
   $("crypto-results-status").textContent="Unable to load source-verified records. "+String(error.message||error).slice(0,180);
  }finally{if(button)button.disabled=false}
 }
 $("crypto-retry")?.addEventListener("click",()=>loadEprint(true));
 loadEprint();

})();
