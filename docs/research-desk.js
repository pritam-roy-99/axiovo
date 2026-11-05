/* Cross-archive search and local research triage. */
(function(){
"use strict";
const data=window.AxiovoArchiveData, $=id=>document.getElementById(id);
const WATCH_KEY="axiovo-desk-searches-v1", SOURCES=Object.keys(data.names);
const lanes=new Map();
let controller,lastSearch;
const node=(tag,value,cls)=>{
 const element=document.createElement(tag);
 if(value!==undefined)element.textContent=value;
 if(cls)element.className=cls;
 return element;
};
function link(label,href,cls){
 const a=node("a",label,cls);a.href=href;
 if(href.startsWith("https:")){a.target="_blank";a.rel="noopener noreferrer"}
 return a;
}
function button(label,fn,cls="rd-button rd-secondary"){
 const b=node("button",label,cls);b.type="button";b.onclick=fn;return b;
}
function status(value){$("rd-action-status").textContent=value}
const controls=[...document.querySelectorAll(".rd-sources input")];
const values=["q","author","sort","range","from","to"];
const ids={q:"rd-query",author:"rd-author",sort:"rd-sort",range:"rd-range",from:"rd-from",to:"rd-to"};
function readForm(){
 const search=Object.fromEntries(values.map(key=>[key,$(ids[key]).value.trim()]));
 search.sources=controls.filter(input=>input.checked).map(input=>input.value);
 if(search.range!=="custom")search.from=search.to="";
 return search;
}
function showDates(){$("rd-custom-dates").hidden=$("rd-range").value!=="custom"}
function fillForm(search){
 for(const key of values)if(search[key]!==undefined)$(ids[key]).value=search[key];
 const sources=search.sources||SOURCES;
 for(const input of controls)input.checked=sources.includes(input.value);
 if(search.author||search.from||search.to||search.range==="week")$("rd-advanced").open=true;
 showDates();
}
function effective(search){
 if(search.range!=="week")return search;
 const date=new Date(),end=date.toISOString().slice(0,10);
 date.setUTCDate(date.getUTCDate()-6);
 return {...search,from:date.toISOString().slice(0,10),to:end};
}
function updateURL(search){
 const params=new URLSearchParams();
 for(const key of values)if(search[key]&&!["relevance","any"].includes(search[key]))params.set(key,search[key]);
 if(search.sources.length!==SOURCES.length)params.set("archives",search.sources.join(","));
 const url=new URL(location.href);url.search=params;url.hash="";history.replaceState(null,"",url);
}
function readWatches(){
 const items=data.read(WATCH_KEY,[]);
 return Array.isArray(items)?items.filter(x=>x&&typeof x.id==="string"&&x.search&&Array.isArray(x.search.sources)):[];
}
function labelFor(search){
 return search.q||search.author||((search.from||search.to)?[search.from,search.to].filter(Boolean).join(" to "):"Recent preprints");
}
function drawWatches(){
 const root=$("rd-watches");root.replaceChildren();
 for(const item of readWatches()){
  const line=node("div",undefined,"rd-side-item");
  const run=button(labelFor(item.search),()=>{fillForm(item.search);runSearch()});
  run.title="Run saved search across "+item.search.sources.map(source=>data.names[source]).filter(Boolean).join(", ");
  const remove=button("×",()=>{
   if(data.write(WATCH_KEY,readWatches().filter(watch=>watch.id!==item.id))){drawWatches();status("Saved search removed.")}
   else status("Could not update saved searches on this device.");
  });
  remove.setAttribute("aria-label","Remove saved search "+labelFor(item.search));line.append(run,remove);root.append(line);
 }
}
function addWatch(){
 if(!lastSearch)return;
 const id=JSON.stringify(lastSearch),items=readWatches();
 if(items.some(x=>x.id===id)){status("This search is already saved.");return}
 if(items.length>=20){status("Remove a saved search before adding another.");return}
 if(data.write(WATCH_KEY,[{id,search:lastSearch},...items])){drawWatches();status("Search saved on this device.")}
 else status("Could not save this search on this device.");
}
function renderQueue(){
 const papers=data.comparison(),root=$("rd-queue");root.replaceChildren();
 $("rd-queue-summary").textContent=papers.length?papers.length+" of 3 papers selected":"Add up to three papers from any archive.";
 for(const p of papers){
  const row=node("div",undefined,"rd-side-item");
  const title=link(p.title,p.url);
  const remove=button("×",()=>{
   if(data.removeComparison(p)){renderQueue();status("Paper removed from comparison.")}
   else status("Could not update the comparison.");
  });
  remove.setAttribute("aria-label","Remove "+p.title+" from comparison");row.append(title,remove);root.append(row);
 }
 $("rd-open-comparison").disabled=papers.length<2;
 $("rd-export").disabled=!papers.length;
 $("rd-save-queue").disabled=!papers.length;
 $("rd-listen-queue").hidden=!window.AxiovoAbstractAudio;
 $("rd-listen-queue").disabled=!papers.some(p=>p.abstract);
}
function openComparison(){
 const columns=$("rd-comparison-columns");columns.replaceChildren();
 for(const p of data.comparison()){
  const article=node("article");
  article.append(node("p",data.names[p.source]+" · "+p.recordId,"rd-kicker"),node("h3",p.title),
   node("p",p.authors.slice(0,8).join(", ")||"Authors unavailable","rd-small"),
   node("p",[p.date||"Date unavailable",p.category,p.provenance].filter(Boolean).join(" · "),"rd-small"),
   node("h4","Abstract"),node("p",p.abstract||"No abstract in this metadata record."),link("Open original record ↗",p.url,"rd-text-link"));
  columns.append(article);
 }
 $("rd-comparison").showModal();
}
function ris(p){
 if(p.source==="arxiv")return window.AxiovoCitation.ris({...p,id:p.recordId,published:p.date});
 const text=value=>String(value||"").replace(/\s+/g," ").trim();
 return ["TY  - UNPB","TI  - "+text(p.title),...p.authors.map(a=>"AU  - "+text(a)),
  ...(p.date?["PY  - "+p.date.slice(0,4)]:[]),"DB  - "+data.names[p.source],"DO  - "+p.doi,
  "UR  - "+p.url,"ER  - "].join("\r\n");
}
function recordCard(p){
 const article=node("article",undefined,"rd-result-card");
 article.append(node("p",[p.recordId,p.date||(p.announcementDate?"Announced "+p.announcementDate:""),p.category,p.provenance].filter(Boolean).join(" · "),"rd-small"));
 const title=node("h4");title.append(link(p.title,p.url));article.append(title);
 article.append(node("p",p.authors.slice(0,6).join(", ")+(p.authors.length>6?" et al.":"")||"Authors unavailable","rd-small"));
 if(p.abstract){
  const details=node("details");details.append(node("summary","Read abstract"),node("p",p.abstract));article.append(details);
 }
 const actions=node("div",undefined,"rd-actions");
 actions.append(link("Original record ↗",p.url,"rd-button"),...(p.pdf?[link("PDF ↗",p.pdf,"rd-button")]:[]));
 const save=button(data.saved(p)?"Saved to Library":"Save to Library",()=>{
  if(data.save(p)){save.disabled=true;save.textContent="Saved to Library";status("Saved in My Library.")}
  else status("Browser storage is unavailable.");
 });
 save.disabled=data.saved(p);
 const compare=button(data.comparison().some(item=>data.recordKey(item)===data.recordKey(p))?"In comparison":"Add to comparison",()=>{
  const result=data.addComparison(p);
  if(result==="added"){
   compare.textContent="In comparison";renderQueue();status("Paper added to the shortlist.");
  }else status(result==="full"?"The shortlist holds three papers. Remove one to add another.":"Browser storage is unavailable.");
 });
 if(p.abstract&&window.AxiovoAbstractAudio)actions.append(button("Listen to abstract",()=>window.AxiovoAbstractAudio.play([p])));
 actions.append(save,compare);article.append(actions);window.AxiovoAuthorFollow?.attach(article,p.authors);return article;
}
function makeLane(source,criteria){
 const section=node("section",undefined,"rd-panel rd-result-section");section.id="rd-source-"+source;
 const head=node("div",undefined,"rd-result-head"),title=node("h3");
 const group=node("div");
 title.append(node("span",undefined,"rd-source-dot "+source),document.createTextNode(data.names[source]));
 const summary=node("p","Checking source…","rd-small");
 group.append(title,summary);
 const native=new URL("./"+source+".html",location.href);
 for(const key of ["q","from","to","author"])if(criteria[key])native.searchParams.set(key,criteria[key]);
 head.append(group,link("Open archive page →",native.href,"rd-text-link"));
 const list=node("div"),footer=node("div",undefined,"rd-actions");
 section.append(head,list,footer);$("rd-results").append(section);
 return {source,section,summary,list,footer,criteria,items:[],visible:6,next:null};
}
function redraw(lane,{focus=false}={}){
 const before=lane.list.childElementCount;
 lane.list.replaceChildren(...lane.items.slice(0,lane.visible).map(recordCard));
 lane.summary.textContent=lane.message+" · "+lane.items.length+" matching record"+(lane.items.length===1?"":"s");
 lane.footer.replaceChildren();
 if(lane.items.length>lane.visible){
  lane.footer.append(button("Show more matches",()=>{lane.visible+=6;redraw(lane,{focus:true})}));
 }
 if(lane.next!==null&&!lane.loading)lane.footer.append(button("Load next source page",()=>more(lane)));
 lane.footer.append(link("Search official archive ↗",data.sourceLink(lane.source,lane.criteria),"rd-button"));
 if(!lane.loading&&!lane.items.length)lane.list.append(node("p","No matching records in the available results.","rd-small"));
 if(focus)lane.list.children[before]?.querySelector("h4 a")?.focus();
}
function setItems(lane,...groups){
 lane.items=data.filter(data.merge(...groups.map(group=>data.filter(group,lane.criteria))),lane.criteria);
}
async function load(lane,signal){
 const {source,criteria}=lane;
 lane.loading=true;lane.message="Loading source and snapshot";redraw(lane);
 const datesTask=source==="arxiv"?data.datedArxiv(criteria,signal).catch(()=>null):Promise.resolve(null);
 const snapshot=await data.snapshot(source);
 if(signal.aborted)return;
 setItems(lane,snapshot.papers);redraw(lane);
 const dates=await datesTask;if(signal.aborted)return;
 if(dates?.complete){
  lane.loading=false;lane.message="Verified UTC first-submission dates";setItems(lane,dates.papers);redraw(lane);return;
 }
 const available=dates?.coveredDays?dates.coveredDays+" of "+dates.requestedDays+" UTC dates verified · ":"";
 try{
  const result=await data.live(source,criteria,signal);
  if(signal.aborted)return;
  lane.next=result.next;lane.message=available+result.provider+" and available snapshots · coverage varies";
  setItems(lane,snapshot.papers,dates?.papers||[],result.papers);
 }catch{
  if(signal.aborted)return;
  lane.message=available+"Live source unavailable · "+(snapshot.stamp?"snapshot "+snapshot.stamp.slice(0,10):"available cache only");
  setItems(lane,snapshot.papers,dates?.papers||[]);
 }
 lane.loading=false;redraw(lane);
}
async function more(lane){
 const {signal}=controller,cursor=lane.next;
 lane.loading=true;redraw(lane);
 try{
  const response=await data.live(lane.source,lane.criteria,signal,cursor);
  if(signal.aborted)return;
  setItems(lane,lane.items,response.papers);
  lane.next=response.next===cursor?null:response.next;lane.visible+=6;
 }catch{
  if(signal.aborted)return;
  lane.message="Could not load the next page · earlier records are available";
 }
 lane.loading=false;redraw(lane,{focus:true});
}
async function runSearch(){
 const search=readForm(),criteria=effective(search),message=$("rd-search-status");
 if(!search.sources.length){message.textContent="Choose at least one archive.";return}
 if(criteria.from&&criteria.to&&criteria.from>criteria.to){message.textContent="The start date must be on or before the end date.";return}
 lastSearch=search;$("rd-save-search").disabled=false;
 updateURL(search);
 controller?.abort();controller=new AbortController();
 const {signal}=controller;
 $("rd-results").replaceChildren();$("rd-source-jumps").replaceChildren();lanes.clear();
 let sources=search.sources;
 const arxiv=window.AxiovoArxiv.parse(search.q),doi=data.parseDOI(search.q);
 const target=arxiv||doi.startsWith("10.48550/arxiv.")?"arxiv":doi.startsWith("10.26434/")?"chemrxiv":/^10\.(?:1101|64898)\//.test(doi)?"biorxiv":"";
 if(target){
  if(!sources.includes(target)){
   message.textContent="Select "+data.names[target]+" to look up this identifier.";
   return;
  }
  sources=[target];
  if(doi.startsWith("10.48550/arxiv."))criteria.q=doi.slice("10.48550/arxiv.".length);
 }
 message.textContent="Searching "+sources.map(source=>data.names[source]).join(", ")+"…";
 for(const source of sources){
  lanes.set(source,makeLane(source,criteria));
  $("rd-source-jumps").append(link(data.names[source],"#rd-source-"+source));
 }
 await Promise.all([...lanes.values()].map(lane=>load(lane,signal)));
 if(signal.aborted)return;
 message.textContent=[...lanes.values()].reduce((n,lane)=>n+lane.items.length,0)+" matching records shown across "+sources.length+" "+(sources.length===1?"archive":"archives")+". Check each source for coverage.";
}
$("rd-search-form").addEventListener("submit",e=>{e.preventDefault();runSearch()});
$("rd-range").addEventListener("change",showDates);
$("rd-save-search").onclick=addWatch;
$("rd-open-comparison").onclick=openComparison;
$("rd-export").onclick=()=>{
 window.AxiovoCitation.download("axiovo-shortlist.ris",data.comparison().map(ris).join("\r\n\r\n")+"\r\n");
 status("Shortlist exported as RIS.");
};
$("rd-listen-queue").onclick=()=>window.AxiovoAbstractAudio?.play(data.comparison());
$("rd-save-queue").onclick=()=>{
 const papers=data.comparison(),saved=papers.filter(data.save).length;
 status(saved+" of "+papers.length+" selected papers saved to My Library.");
};
window.addEventListener("storage",()=>{drawWatches();renderQueue()});
const params=new URLSearchParams(location.search);
const valuesFromURL=Object.fromEntries(values.filter(key=>params.has(key)).map(key=>[key,params.get(key)]));
if(!valuesFromURL.range&&(params.has("from")||params.has("to")))valuesFromURL.range="custom";
if(params.has("archives")){
 const allowed=params.get("archives").split(",").filter(source=>SOURCES.includes(source));
 if(allowed.length)valuesFromURL.sources=allowed;
}
fillForm(valuesFromURL);drawWatches();renderQueue();
if(values.some(key=>params.has(key)))runSearch();
})();
