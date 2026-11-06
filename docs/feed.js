/* Axiovo My Feed: source-linked recommendations from existing browser preferences. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const core=window.AxiovoFeedCore,archive=window.AxiovoArchiveData,follow=window.AxiovoAuthorFollow;
if(!core||!archive||!$("feed-results"))return;
const state={papers:[],items:[],view:"for-you",limit:12,loading:false,loadedAt:null};
const HIDDEN="axiovo-feed-hidden-v1";
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}}
function write(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true}catch{return false}}
function label(parent,tag,txt,className){const el=document.createElement(tag);el.textContent=String(txt??"");if(className)el.className=className;parent.append(el);return el}
function link(parent,txt,url,cls){const a=label(parent,"a",txt,cls);a.href=url;a.rel="noopener noreferrer";if(/^https:\/\//.test(url))a.target="_blank";return a}
function topics(){
 const settings=read("axiovo-research-interest-settings-v1",{}),raw=read("axiovo-followed-topics",[]);
 const field=read("axiovo-field-explorer-v1",{});
 const specialized=read("axiovo-interests-by-field-v1",{});
 const all=[];
 for(const x of settings.interests||[])if(typeof x==="string")all.push(x);
 for(const x of Array.isArray(raw)?raw:[])if(typeof x==="string")all.push(x);
 if(typeof field.subtopic==="string")all.push(field.subtopic);
 if(typeof field.topic==="string")all.push(field.topic);
 // Retain all followed field-specific subtopics, not just the currently active field.
 for(const group of Object.values(specialized||{}))
  for(const terms of Object.values(group||{}))
   if(Array.isArray(terms))all.push(...terms.filter(x=>typeof x==="string"));
 return [...new Set(all.map(x=>x.trim()).filter(Boolean))].slice(0,50);
}
function preferences(){
 const extra=read("axiovo-research-interest-settings-v1",{});
 const authors=[...(follow?.list()||[]),...(extra.authors||[])].filter(x=>typeof x==="string");
 const saved=[...(read("axiovo-reading-list",[])||[])].map(x=>"arxiv:"+String(x).replace(/v\d+$/,""));
 for(const source of ["biorxiv","chemrxiv"])
  for(const p of archive.savedRecords(source))saved.push(core.key(p));
 return {authors:[...new Set(authors)],topics:topics(),
  saved,hidden:read(HIDDEN,[]),
  references:["arxiv","biorxiv","chemrxiv"].flatMap(source=>archive.savedRecords(source)).slice(0,20),
  matchesAuthor:(a,b)=>follow?.matchesName(a,b)||String(a).toLowerCase()===String(b).toLowerCase()};
}
function displayPrefs(prefs){
 for(const [id,values,empty] of [["feed-followed-authors",prefs.authors,"No authors followed"],["feed-followed-topics",prefs.topics,"No topics followed"]]){
  const root=$(id);root.replaceChildren();
  if(!values.length)label(root,"span",empty);
  else for(const value of values.slice(0,9))label(root,"span",value);
  if(values.length>9)label(root,"span","+"+(values.length-9)+" more");
 }
}
function asSourceRecord(source,p){return archive.normalize(source,p)}
function paperDate(p){return p.announcementDate||p.date||""}
function newest(p){return Date.parse(paperDate(p))||0}
function viewTitle(view){return ({'for-you':"Papers for you",following:"From your follows",latest:"Latest matching papers",related:"Related to your topics"})[view]||"Papers for you"}
function renderCard(item){
 const p=item.paper,card=label($("feed-results"),"article","","feed-card");
 const top=label(card,"div","","feed-card-top");
 label(top,"span",archive.names[p.source]||p.source,"feed-source");
 label(top,"span",paperDate(p)||"Date not verified","feed-date");
 const h=label(card,"h3","");
 link(h,p.title,p.url);
 label(card,"p",(p.authors||[]).slice(0,5).join(", ")+((p.authors||[]).length>5?" et al.":""),"feed-authors");
 if(p.abstract)label(card,"p",p.abstract.slice(0,260)+(p.abstract.length>260?"…":""),"feed-abstract");
 const why=label(card,"div","","feed-why");
 for(const reason of item.reasons.slice(0,3))label(why,"span",reason);
 const row=label(card,"div","","feed-card-actions");
 link(row,"Read original ↗",p.url);
 if(p.source==="arxiv")link(row,"Research Assistant","./copilot.html?id="+encodeURIComponent(p.recordId||p.id));
 const save=label(row,"button",archive.saved(p)?"★ Saved":"☆ Save paper","feed-save");
 save.type="button";save.setAttribute("aria-pressed",String(archive.saved(p)));
 save.setAttribute("aria-label","Save "+p.title+" to your Library");
 save.onclick=()=>{
  if(archive.saved(p)){location.assign("./workspace.html");return}
  if(archive.save(p)){save.textContent="★ Saved";save.setAttribute("aria-pressed","true");save.setAttribute("aria-label","Saved "+p.title+" to Library");}
  else $("feed-status").textContent="Browser storage is unavailable; paper was not saved.";
 };
 const hide=label(row,"button","Not relevant","feed-dismiss");
 hide.type="button";hide.setAttribute("aria-label","Hide "+p.title+" from My Feed");
 hide.onclick=()=>{
  const ids=new Set(read(HIDDEN,[]));ids.add(item.key);
  if(write(HIDDEN,[...ids].slice(-500))){recalculate();}else $("feed-status").textContent="Unable to update hidden papers on this device.";
 };
}
function recalculate(){
 const prefs=preferences();displayPrefs(prefs);
 state.items=core.build(state.papers,prefs);
 const current=core.select(state.items,state.view);
 const selected=window.AxiovoPaperSort?.sort(current.filter(x=>$("feed-source").value==="all"||x.paper.source===$("feed-source").value)
  .filter(x=>{const range=Number($("feed-window").value);return !range||(x.days!==null&&x.days<=range)}),
  $("feed-sort").value,
  x=>x.score).map(x=>x)||current.filter(x=>$("feed-source").value==="all"||x.paper.source===$("feed-source").value)
  .filter(x=>{const range=Number($("feed-window").value);return !range||(x.days!==null&&x.days<=range)});
 $("feed-results").replaceChildren();
 for(const item of selected.slice(0,state.limit))renderCard(item);
 if(!selected.length){
  const el=label($("feed-results"),"div","","feed-empty");
  label(el,"strong",prefs.authors.length||prefs.topics.length?"No matching new papers in this indexed window.":"Personalize your research feed");
  label(el,"p",prefs.authors.length||prefs.topics.length?
   "Try All indexed dates, refresh the sources, or follow additional authors and topics. A missing match is not evidence that the author has no papers.":
   "Follow researchers or research subtopics in Axiovo to start receiving research updates.");
  link(el,"Manage followed authors","./workspace.html#following");
  label(el,"span"," · ");
  link(el,"Explore research topics","./#axiovo-archive-title");
 }
 if($("feed-sort-note"))$("feed-sort-note").textContent=
  window.AxiovoPaperSort?.note(selected.map(x=>x.paper),$("feed-sort").value)||"";
 $("feed-match-count").textContent=selected.length+" matching";
 $("feed-pulse-count").textContent=String(state.items.length);
 $("feed-pulse-label").textContent="Personalized papers in cached source records";
 $("feed-stream-heading").textContent=viewTitle(state.view);
 $("feed-more").hidden=selected.length<=state.limit;
 const summary=state.loading?"Refreshing official-source snapshots…":
  selected.length+" matching papers · "+state.papers.length+" distinct indexed source records checked";
 $("feed-status").textContent=summary+". Indexed coverage is partial.";
}
async function refresh(){
 if(state.loading)return;
 state.loading=true;$("feed-refresh").disabled=true;
 $("feed-status").textContent="Updating your research feed from source snapshots…";
 const data=await Promise.allSettled(["arxiv","biorxiv","chemrxiv"].map(source=>archive.snapshot(source).then(result=>({source,...result}))));
 const list=[],errors=[],timestamps=[];
 for(let i=0;i<data.length;i++){
  const outcome=data[i],source=["arxiv","biorxiv","chemrxiv"][i];
  if(outcome.status!=="fulfilled"){errors.push(archive.names[source]);continue}
  const snap=outcome.value;
  if(snap.stamp)timestamps.push(snap.stamp);
  for(const record of snap.papers||[]){
   if(!record?.title||record.source!==source)continue;
   list.push(record);
  }
 }
 state.papers=archive.merge(...[list]);
 state.loadedAt=Date.now();state.loading=false;
 $("feed-refresh").disabled=false;
 $("feed-pulse-synced").textContent=timestamps.length?
  "Source snapshot date: "+timestamps.sort().at(-1).slice(0,16).replace("T"," "):
  "Source update time unavailable";
 recalculate();
 if(errors.length)$("feed-status").textContent+=" Unavailable: "+errors.join(", ")+".";
}
$("feed-more").onclick=()=>{state.limit+=12;recalculate()};
$("feed-refresh").onclick=refresh;
$("feed-source").onchange=()=>{state.limit=12;recalculate()};
$("feed-window").onchange=()=>{state.limit=12;recalculate()};
$("feed-sort").onchange=()=>{state.limit=12;recalculate()};
for(const tab of document.querySelectorAll("[data-view]"))tab.onclick=()=>{
 state.view=tab.dataset.view;state.limit=12;
 for(const button of document.querySelectorAll("[data-view]"))
  button.setAttribute("aria-pressed",String(button===tab));
 recalculate();
};
window.addEventListener("axiovo:author-follow-change",recalculate);
window.addEventListener("axiovo-library-change",recalculate);
window.addEventListener("storage",recalculate);
refresh();
})();
