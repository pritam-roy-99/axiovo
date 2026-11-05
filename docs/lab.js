/* Axiovo research tools. Browser-only, evidence-linked, opt-in storage. */
(function() {
"use strict";
const $=id=>document.getElementById(id);
const SVG="http://www.w3.org/2000/svg";
const PDFJS="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
const PDFWORKER="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
let documents=[],pdf=null,pdfPage=1,pdfLoading=false,pdfDocumentKey="",pdfRenderTask=null,lib=null;
const NOTES="axiovo-pdf-notes-v1", SEEN="axiovo-alert-seen-v1";
function text(el,tag,value,cls){const x=document.createElement(tag);x.textContent=String(value??"");if(cls)x.className=cls;el.append(x);return x}
function status(id,value){$(id).textContent=value}
function read(key,def){try{return JSON.parse(localStorage.getItem(key)||"null")??def}catch{return def}}
function write(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true}catch{return false}}
function id(s){const m=String(s||"").trim().match(/^((?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Za-z]{2})?\/\d{7}))(?:v\d+)?$/i);return m?m[1]:""}
function anchor(where,label,url){if(typeof url!=="string"||!/^https:\/\//.test(url))return;const a=text(where,"a",label);a.href=url;a.rel="noopener noreferrer";a.target="_blank";return a}
function noteRecord(p){return {id:p.id,title:p.title,authors:p.authors||[],abstract:p.abstract||"",date:p.published||p.created||p.oai_datestamp||"",link:p.link||"https://arxiv.org/abs/"+p.id,source:p.source||"arXiv metadata"}}
function safeUrl(raw){return /^https:\/\//.test(raw||"")?raw:null}
async function fetchJson(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),18000);try{
 const response=await fetch(url,{signal:c.signal,headers:{"Accept":"application/json"}});
 if(!response.ok)throw Error("HTTP "+response.status);
 return await response.json()
}finally{clearTimeout(timer)}}
function resultCard(parent,p,description){
 const el=text(parent,"article","","lab-result");
 const strong=text(el,"strong",p.title||"Untitled work");
 text(el,"p",(p.authors||[]).slice(0,5).join(", ")+(p.date?" · "+p.date.slice(0,10):""),"lab-small");
 if(description)text(el,"p",description);
 const actions=text(el,"div","","rl-paper-actions");
 anchor(actions,"Original record",p.link||p.url);
 if(p.id&&id(p.id)){const a=text(actions,"a","Compare");a.href="./lab.html#compare";a.onclick=()=>{setTimeout(()=>{$("lab-paper-a").value=id(p.id);$("lab-paper-b").focus()},0)}}
 return el
}
function flatten(p,source){
 return noteRecord({...p,published:p.published||p.created||"",source})
}
async function loadMetadata(){
 const [recent,oai]=await Promise.allSettled([fetchJson("./data/feed.json"),fetchJson("./data/oai-recent.json")]);
 const map=new Map();
 if(recent.status==="fulfilled")for(const p of recent.value.papers||[])if(id(p.id))map.set(id(p.id),flatten(p,"arXiv Atom API"));
 if(oai.status==="fulfilled")for(const p of oai.value.papers||[])if(id(p.id)){
   const old=map.get(id(p.id));if(!old)map.set(id(p.id),flatten(p,"arXiv OAI-PMH")); // Atom preserves v1 date when both exist
 }
 documents=[...map.values()];
 status("lab-search-status","Local index: "+documents.length+" unique arXiv records. Wider search uses OpenAlex live metadata.");
}
async function searchLiterature(e){
 e.preventDefault();const query=$("lab-query").value.trim();if(query.length<2)return;
 const type=$("lab-source").value,root=$("lab-search-results");root.replaceChildren();status("lab-search-status","Searching...");
 const tokens=query.toLowerCase().split(/\s+/).filter(x=>x.length>2);
 if(type!=="openalex"){
  const hits=documents.map(p=>({p,score:tokens.reduce((acc,t)=>acc+((p.title||"").toLowerCase().includes(t)?3:0)+((p.abstract||"").toLowerCase().includes(t)?1:0)+((p.authors||[]).join(" ").toLowerCase().includes(t)?2:0),0)}))
   .filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.p.date.localeCompare(a.p.date)).slice(0,20);
  for(const h of hits)resultCard(root,h.p,"Locally indexed arXiv · lexical score "+h.score);
  if(!hits.length)text(root,"p","No keyword matches in the bounded arXiv snapshot.","rl-subtext")
 }
 if(type==="local"){status("lab-search-status","Local-only search completed. This is not full historical arXiv coverage.");return}
 try{
  const params=new URLSearchParams({search:query,filter:"locations.source.id:S4306400194",per_page:"15",select:"id,display_name,authorships,doi,publication_date,locations,primary_location,best_oa_location,cited_by_count"});
  const data=await fetchJson("https://api.openalex.org/works?"+params);
  if(type==="openalex")root.replaceChildren();
  let count=0;
  for(const w of data.results||[]){
   const source=window.AxiovoArxiv?.candidates(w)[0];if(!source)continue;
   count++;
   resultCard(root,{id:source.requested,title:w.display_name,authors:(w.authorships||[]).map(x=>x.author?.display_name).filter(Boolean),date:w.publication_date,link:window.AxiovoArxiv.abs(source.requested)},
      "arXiv-hosted paper · OpenAlex metadata · "+(w.cited_by_count||0)+" indexed citations")
  }
  status("lab-search-status","Found "+count+" source-confirmed arXiv-hosted records in this batch, plus local matches. Coverage is not exhaustive.")
 }catch(err){status("lab-search-status","OpenAlex unavailable: "+err.message+". Local results, if any, remain available.")}
}
async function loadPdf(file){
 if(!file)return;if(file.size>40*1024*1024){status("lab-pdf-status","PDF exceeds the 40 MB browser limit.");return}
 pdfLoading=true;status("lab-pdf-status","Loading local PDF in this browser...");
 try{
  const data=await file.arrayBuffer();
  const hash=await crypto.subtle.digest("SHA-256",data);
  pdfDocumentKey=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
  if(!lib){lib=await import(PDFJS);lib.GlobalWorkerOptions.workerSrc=PDFWORKER}
  if(pdf)await pdf.destroy();
  pdf=await lib.getDocument({data:new Uint8Array(data)}).promise;
  pdfPage=1;status("lab-pdf-status",file.name+" · "+pdf.numPages+" pages · processed locally.");
  $("lab-save-note").disabled=false;
  await drawPage()
 }catch(err){pdf=null;status("lab-pdf-status","Local PDF could not be opened: "+err.message+". Try another file or use the original PDF link.")}
 finally{pdfLoading=false}
}
async function drawPage(){
 if(!pdf)return;const current=pdfPage;
 if(pdfRenderTask)try{pdfRenderTask.cancel()}catch{}
 const page=await pdf.getPage(current),scale=Number($("lab-pdf-scale").value)||1.3,viewport=page.getViewport({scale});
 const canvas=$("lab-pdf-canvas"),ctx=canvas.getContext("2d");
 const pixel=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.floor(viewport.width*pixel);canvas.height=Math.floor(viewport.height*pixel);
 canvas.style.width=viewport.width+"px";canvas.style.height=viewport.height+"px";
 pdfRenderTask=page.render({canvasContext:ctx,viewport,transform:pixel!==1?[pixel,0,0,pixel,0,0]:null});
 try{await pdfRenderTask.promise}catch(err){if(err.name!=="RenderingCancelledException")throw err}
 if(current!==pdfPage)return;
 $("lab-page-count").textContent="Page "+current+" of "+pdf.numPages;
 $("lab-prev-page").disabled=current<=1;$("lab-next-page").disabled=current>=pdf.numPages;
 const stored=read(NOTES,{});
 $("lab-page-note").value=stored[pdfDocumentKey]?.[current]||""
}
function saveNote(){
 if(!pdf||!pdfDocumentKey)return;
 const notes=read(NOTES,{});notes[pdfDocumentKey]=notes[pdfDocumentKey]||{};
 notes[pdfDocumentKey][pdfPage]=$("lab-page-note").value.slice(0,5000);
 status("lab-note-status",write(NOTES,notes)?"Page "+pdfPage+" note saved only in your browser.":"Browser storage unavailable.")
}
function exportNotes(){
 if(!pdfDocumentKey){status("lab-note-status","Load a local PDF before exporting notes.");return}
 const notes=read(NOTES,{})[pdfDocumentKey]||{};
 const a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify({document_hash:pdfDocumentKey,notes},null,2)],{type:"application/json"}));
 a.href=url;a.download="axiovo-pdf-notes.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function comparePaper(p,label){
 const col=text($("lab-compare-results"),"article","");
 text(col,"h3",label+": "+p.title);
 const dl=text(col,"dl","");
 for(const [key,val] of [
   ["Record identifier",p.id],["Source",p.source],["Authors",(p.authors||[]).join(", ")],
   ["Submission/created date",p.date],["Abstract (source metadata)",p.abstract||"Not indexed"]
 ]){text(dl,"dt",key);text(dl,"dd",val)}
 anchor(col,"Read authoritative arXiv record",p.link)
}
function compare(e){
 e.preventDefault();const a=id($("lab-paper-a").value),b=id($("lab-paper-b").value);
 const root=$("lab-compare-results");root.replaceChildren();
 if(!a||!b||a===b){status("lab-compare-status","Enter two distinct valid arXiv identifiers.");return}
 const x=documents.find(p=>p.id===a),y=documents.find(p=>p.id===b);
 if(!x||!y){status("lab-compare-status","One or both papers are absent from the bounded local index. Try archive search or use source links to inspect the full papers.");return}
 comparePaper(x,"Paper A");comparePaper(y,"Paper B");
 loadComparisonNotes();
 status("lab-compare-status","Side-by-side original metadata comparison. Mathematical assumptions and conclusions must be checked in the PDFs.")
}
const COMPARES="axiovo-comparisons-v1";
function comparisonKey(){
 const a=id($("lab-paper-a").value),b=id($("lab-paper-b").value);
 return a&&b&&a!==b?[a,b].sort().join("::"):"";
}
function saveComparison(){
 const key=comparisonKey();
 if(!key){status("lab-compare-note-status","Enter two distinct arXiv identifiers first.");return}
 const values=read(COMPARES,{});
 values[key]={ids:[id($("lab-paper-a").value),id($("lab-paper-b").value)],
  notes:[$("lab-compare-a-note").value.slice(0,5000),$("lab-compare-b-note").value.slice(0,5000)],
  updated_at:new Date().toISOString()};
 status("lab-compare-note-status",write(COMPARES,values)?"Researcher notes saved locally.":"Unable to save comparison notes.");
}
function loadComparisonNotes(){
 const key=comparisonKey(),value=read(COMPARES,{})[key];
 $("lab-compare-a-note").value=value?.notes?.[0]||"";
 $("lab-compare-b-note").value=value?.notes?.[1]||"";
}
function exportComparison(){
 const a=id($("lab-paper-a").value),b=id($("lab-paper-b").value);
 if(!a||!b||a===b){status("lab-compare-note-status","Enter two distinct arXiv identifiers first.");return}
 const lines=[
 "# Source-checked literature comparison",
 "", "Prepared on: "+new Date().toISOString(),
 "", "## Paper A", "https://arxiv.org/abs/"+a, "",
 $("lab-compare-a-note").value||"No researcher evidence notes entered.",
 "", "## Paper B", "https://arxiv.org/abs/"+b, "",
 $("lab-compare-b-note").value||"No researcher evidence notes entered.",
 "", "These entries are user-authored. Axiovo has not verified mathematical correctness."
 ];
 const blob=new Blob([lines.join("\n")],{type:"text/markdown;charset=utf-8"});
 const url=URL.createObjectURL(blob),anchor=document.createElement("a");
 anchor.href=url;anchor.download="axiovo-paper-comparison.md";
 document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function openAlexId(value){
 const s=String(value||"").trim();
 const w=s.match(/(?:https:\/\/openalex.org\/)?(W\d+)$/i);if(w)return{kind:"id",value:w[1]};
 const m=s.replace(/^https?:\/\/doi.org\//i,"").match(/^10\.\d{4,9}\/[\w.()/:;+-]+$/i);
 return m?{kind:"doi",value:m[0]}:null
}
async function resolveWork(s){
 const x=openAlexId(s);if(!x)throw Error("Enter a valid OpenAlex work ID or DOI.");
 if(x.kind==="id")return fetchJson("https://api.openalex.org/works/"+x.value);
 const q=new URLSearchParams({filter:"doi:https://doi.org/"+x.value,per_page:"1"});
 const d=await fetchJson("https://api.openalex.org/works?"+q);
 if(!d.results?.length)throw Error("No OpenAlex match found for this DOI.");
 return d.results[0]
}
function workName(w){return w.display_name||w.title||w.id||"Untitled"}
function workUrl(w){return safeUrl(w.doi)||safeUrl(w.id)}
function shortId(v){const m=String(v||"").match(/W\d+$/);return m?m[0]:""}
function svg(tag,attributes){const n=document.createElementNS(SVG,tag);for(const [key,val] of Object.entries(attributes))n.setAttribute(key,String(val));return n}
function drawCitationGraph(work,cited,citing){
 const root=$("lab-graph");root.replaceChildren();
 const svgRoot=svg("svg",{viewBox:"0 0 880 400",role:"img","aria-label":"Citation neighborhood showing referenced papers on the left and citing papers on the right"});
 svgRoot.style.width="880px";svgRoot.style.maxWidth="100%";
 const center={x:440,y:190};
 function edge(x,y,cx,cy){svgRoot.append(svg("line",{x1:x,y1:y,x2:cx,y2:cy}))}
 function mark(x,y,name,origin,primary){
  const c=svg("circle",{cx:x,cy:y,r:primary?29:18});svgRoot.append(c);
  const t=svg("text",{x:x,y:y+(primary?45:31),"text-anchor":"middle"});
  t.textContent=name.slice(0,26)+(name.length>26?"…":"");svgRoot.append(t)
 }
 const left=cited.slice(0,6),right=citing.slice(0,6);
 left.forEach((w,i)=>{const y=48+i*58;edge(190,y,center.x-28,center.y);mark(190,y,workName(w),"references",false)});
 right.forEach((w,i)=>{const y=48+i*58;edge(center.x+28,center.y,690,y);mark(690,y,workName(w),"citing",false)});
 mark(center.x,center.y,workName(work),"central",true);root.append(svgRoot)
}
async function citation(e){
 e.preventDefault();const area=$("lab-citation-list");area.replaceChildren();$("lab-graph").replaceChildren();
 status("lab-citation-status","Retrieving cited and citing works from OpenAlex...");
 try{
  const work=await resolveWork($("lab-citation-id").value.trim());
  const mid=shortId(work.id);if(!mid)throw Error("OpenAlex did not return a stable work identifier");
  const references=(work.referenced_works||[]).map(shortId).filter(Boolean).slice(0,6);
  const urls=[
    references.length?"https://api.openalex.org/works?"+new URLSearchParams({filter:"openalex:"+references.join("|"),per_page:"20"}):null,
    "https://api.openalex.org/works?"+new URLSearchParams({filter:"cites:"+mid,per_page:"6",sort:"publication_date:desc"})
  ];
  const got=await Promise.allSettled(urls.map(u=>u?fetchJson(u):Promise.resolve({results:[]})));
  const cited=got[0].status==="fulfilled"?got[0].value.results||[]:[];
  const citing=got[1].status==="fulfilled"?got[1].value.results||[]:[];
  drawCitationGraph(work,cited,citing);
  resultCard(area,{title:workName(work),authors:[],date:work.publication_date,link:workUrl(work)},"Selected work (OpenAlex)");
  for(const w of cited)resultCard(area,{title:workName(w),authors:[],date:w.publication_date,link:workUrl(w)},"Referenced by selected work");
  for(const w of citing)resultCard(area,{title:workName(w),authors:[],date:w.publication_date,link:workUrl(w)},"Cites selected work");
  status("lab-citation-status","Showing "+cited.length+" referenced papers and "+citing.length+" citing papers. Missing links do not imply no citations.")
 }catch(err){status("lab-citation-status","Citation lookup failed: "+err.message)}
}
function keywordMatch(p,terms){
 const text=(p.title+" "+p.abstract).toLowerCase();
 return terms.some(t=>text.includes(t))
}
function checkAlerts(){
 const prefs=read("axiovo-research-interest-settings-v1",{});
 const field=read("axiovo-field-explorer-v1",{});
 const projects=read("axiovo-research-projects-v1",[]);
 const terms=[...(Array.isArray(prefs.interests)?prefs.interests:[]),field.topic,field.subtopic,...(Array.isArray(projects)?projects.map(p=>p.keywords):[])].filter(Boolean)
  .flatMap(x=>String(x).toLowerCase().split(/[,;]/)).map(x=>x.trim()).filter(x=>x.length>4).slice(0,40);
 const seen=read(SEEN,{});
 const matches=documents.filter(p=>keywordMatch(p,terms)).filter(p=>!seen[p.id])
    .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);
 const root=$("lab-alert-results");root.replaceChildren();
 if(!terms.length){status("lab-alert-status","Choose research interests or an active research question in your workspace first.");return}
 for(const p of matches)resultCard(root,p,"Not seen in a previous check on this device");
 status("lab-alert-status",matches.length+" previously unseen matching records from the local index. This is a check-on-visit tool, not scheduled email or push notification.")
}
function markSeen(){
 const seen=read(SEEN,{});for(const p of documents)seen[p.id]=true;
 write(SEEN,seen);status("lab-alert-status","Current indexed papers marked as seen on this device.");$("lab-alert-results").replaceChildren()
}
function init(){
 $("lab-search-form").onsubmit=searchLiterature;
 $("lab-compare-form").onsubmit=compare;
 $("lab-compare-save").onclick=saveComparison;$("lab-compare-export").onclick=exportComparison;
 $("lab-citation-form").onsubmit=citation;
 $("lab-local-pdf").onchange=e=>loadPdf(e.target.files?.[0]);
 $("lab-prev-page").onclick=async()=>{if(pdf&&pdfPage>1){pdfPage--;await drawPage()}};
 $("lab-next-page").onclick=async()=>{if(pdf&&pdfPage<pdf.numPages){pdfPage++;await drawPage()}};
 $("lab-pdf-scale").onchange=()=>{if(pdf)drawPage()};
 $("lab-save-note").onclick=saveNote;$("lab-export-notes").onclick=exportNotes;
 $("lab-open-arxiv").onclick=()=>{
  const value=window.AxiovoArxiv?.parse($("lab-arxiv-id").value);
  if(!value){status("lab-pdf-status","Enter a valid arXiv identifier, optionally ending in v1, v2, etc.");return}
  window.open(window.AxiovoArxiv.pdf(value.requested),"_blank","noopener,noreferrer");
  status("lab-pdf-status","Opened the official arXiv PDF in another tab. Load a local copy here to add page notes.")
 };
 $("lab-check-updates").onclick=checkAlerts;$("lab-mark-seen").onclick=markSeen;
 const u=new URLSearchParams(location.search);
 if(window.AxiovoArxiv?.parse(u.get("arxiv"))) $("lab-arxiv-id").value=window.AxiovoArxiv.parse(u.get("arxiv")).requested;
 if(u.get("q")) $("lab-query").value=u.get("q").slice(0,220);
 loadMetadata().then(()=>{if(u.get("q"))$("lab-search-form").requestSubmit()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
