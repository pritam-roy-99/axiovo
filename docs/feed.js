/* Axiovo My Feed: research-first social timeline, source-verified and local-first. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const core=window.AxiovoFeedCore,archive=window.AxiovoArchiveData,
 follow=window.AxiovoAuthorFollow,prefsAPI=window.AxiovoFeedPreferences;
if(!core||!archive||!prefsAPI||!$("feed-results"))return;
const HIDDEN="axiovo-feed-hidden-v1";
const state={papers:[],items:[],view:"for-you",limit:12,loading:false,expanded:false,
 lastHidden:null,sourceErrors:[],refreshId:0};
const read=(key,fallback)=>{try{return prefsAPI.read(localStorage,key,fallback)}catch{return fallback}};
const asArray=value=>Array.isArray(value)?value:[];
const write=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));return true}catch{return false}};
function el(parent,tag,text="",cls=""){
 const n=document.createElement(tag);n.textContent=String(text||"");
 if(cls)n.className=cls;parent.append(n);return n;
}
function anchor(parent,title,url,cls=""){
 const a=el(parent,"a",title,cls);a.href=url;
 if(/^https:\/\//.test(url)){a.target="_blank";a.rel="noopener noreferrer"}
 return a;
}
function notify(message){$("feed-follow-status").textContent=message}
function preferences(){
 const data=prefsAPI.derive(localStorage);
 const refs=["arxiv","biorxiv","chemrxiv"].flatMap(source=>archive.savedRecords(source));
 const saved=[...refs.map(core.key),...asArray(read("axiovo-reading-list",[])).map(x=>"arxiv:"+String(x).toLowerCase().replace(/v\d+$/,""))];
 return {...data,saved,hidden:read(HIDDEN,[]),references:refs.slice(0,20),
  matchesAuthor:(a,b)=>Boolean(follow?.matchesName(a,b))||String(a).toLowerCase()===String(b).toLowerCase()};
}
function displayPreferences(prefs){
 for(const [id,values,placeholder] of [
  ["feed-followed-authors",prefs.authors,"No authors followed yet"],
  ["feed-followed-topics",prefs.directTopics,"No topics followed yet"]
 ]){
  const root=$(id);root.replaceChildren();
  if(!values.length){el(root,"span",placeholder);continue}
  for(const value of values.slice(0,13)){
   const row=el(root,"span","","feed-chip");
   el(row,"span",value);
   // A saved Discover path is managed in Discover, while a directly followed
   // topic is reversible here. Never silently delete another page's setting.
   const manual=(id==="feed-followed-topics"&&asArray(read(prefsAPI.TOPICS,[])).some(x=>typeof x==="string"&&x.toLowerCase()===value.toLowerCase()));
   const directAuthor=(id==="feed-followed-authors"&&asArray(follow?.list()).some(x=>typeof x==="string"&&x.toLowerCase()===value.toLowerCase()));
   if(!manual&&!directAuthor)continue;
   const button=el(row,"button","×","feed-chip-remove");button.type="button";
   button.setAttribute("aria-label","Unfollow "+value);
   button.onclick=()=>{
    const ok=manual?prefsAPI.updateTopic(localStorage,value,false):follow.setFollowing(value,false);
    if(!ok){notify("Could not update this device's follow preferences.");return}
    notify("Unfollowed "+value+".");
    recalculate();
  };
  }
  if(values.length>13)el(root,"span","+"+(values.length-13)+" more","feed-chip");
 }
 const paths=$("feed-followed-paths");paths.replaceChildren();
 if(!prefs.paths.length)el(paths,"span","No Discover paths saved yet");
 for(const path of prefs.paths){
  const params=new URLSearchParams(Object.entries({category:path.category,topic:path.topic,subtopic:path.subtopic,refine:path.refine})
   .filter(([,value])=>value));
  anchor(paths,path.label,"./"+path.source+".html?"+params,"feed-chip");
 }
}
const personalized=prefs=>prefs.authors.length||prefs.directTopics.length||prefs.paths.length||prefs.references.length;
function statusText(papers){
 return papers.length+" source-linked paper"+(papers.length===1?"":"s")+" indexed for this feed. Coverage is partial.";
}
function dateString(p){
 return p.announcementDate?("Announced "+p.announcementDate):p.date?("Posted "+p.date):"Date unverified";
}
function getHidden(){return asArray(read(HIDDEN,[]))}
function updateHidden(id,hide){
 const set=new Set(getHidden());
 if(hide)set.add(id);else set.delete(id);
 return write(HIDDEN,[...set].slice(-500));
}
function hidePaper(item){
 if(!updateHidden(item.key,true)){notify("Could not hide this paper in browser storage.");return}
 state.lastHidden=item.key;
 const undo=$("feed-undo");undo.hidden=false;
 $("feed-undo-button").onclick=()=>{
  if(updateHidden(state.lastHidden,false)){state.lastHidden=null;undo.hidden=true;recalculate()}
 };
 recalculate();
}
function actionsFor(card,item){
 const p=item.paper,actions=el(card,"div","","feed-card-actions");
 const save=el(actions,"button",archive.saved(p)?"★ Saved":"☆ Save","feed-save");
 save.type="button";save.setAttribute("aria-pressed",String(archive.saved(p)));
 function saveState(){
  const saved=archive.saved(p);
  save.textContent=saved?"★ Saved":"☆ Save";
  save.setAttribute("aria-pressed",String(saved));
  save.setAttribute("aria-label",(saved?"Remove ":"Save ")+p.title+(saved?" from":" to")+" Library");
 }
 save.onclick=()=>{
  const wasSaved=archive.saved(p);
  const ok=wasSaved?archive.unsave(p):archive.save(p);
  if(!ok){notify("Could not update the Library on this device.");return}
  saveState();
 };
 saveState();
 anchor(actions,"Read paper ↗",p.url,"feed-original");
 if(p.source==="arxiv"){
  anchor(actions,"Research Assistant","./copilot.html?id="+encodeURIComponent(p.recordId||p.id),"feed-assistant");
 }
 const queued=archive.comparison().some(item=>archive.recordKey(item)===archive.recordKey(p));
 if(queued)anchor(actions,"In comparison →","./desk.html#rd-queue-heading","feed-compare");
 else{
  const compare=el(actions,"button","Add to comparison","feed-compare");compare.type="button";
  compare.onclick=()=>{
   const result=archive.addComparison(p);
   if(result==="added"){
    const link=anchor(actions,"In comparison →","./desk.html#rd-queue-heading","feed-compare");
    compare.replaceWith(link);link.focus();
    notify("Added to your Research Desk comparison.");
   }else notify(result==="full"?"The comparison holds up to five papers. Remove one in Research Desk.":"Could not save to the comparison.");
  };
 }
 if(p.abstract&&window.AxiovoAbstractAudio){
  const listen=el(actions,"button","Listen to abstract","feed-listen");listen.type="button";
  listen.onclick=()=>window.AxiovoAbstractAudio.play([p]);
 }
 const share=el(actions,"button","Share","feed-share");share.type="button";
 share.setAttribute("aria-label","Share source link for "+p.title);
 share.onclick=async()=>{
  try{
   if(navigator.share){await navigator.share({title:p.title,url:p.url});return}
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(p.url);share.textContent="Copied link ✓";return}
  }catch(err){if(err?.name==="AbortError")return}
  // No clipboard permission: present a selectable URL instead of a dead button.
  let field=card.querySelector(".feed-share-link");
  if(field){field.remove();share.textContent="Share";return}
  field=el(card,"input","","feed-share-link");field.value=p.url;
  field.readOnly=true;field.setAttribute("aria-label","Source link to copy");
  field.focus();field.select();share.textContent="Hide link";
 };
 const hide=el(actions,"button","Not interested","feed-dismiss");hide.type="button";
 hide.setAttribute("aria-label","Hide "+p.title+" from recommendations");
 hide.onclick=()=>hidePaper(item);
}
function renderCard(item){
 const p=item.paper,card=el($("feed-results"),"article","","feed-card");
 const header=el(card,"div","","feed-post-header");
 const avatar=el(header,"span","","feed-avatar");avatar.setAttribute("aria-hidden","true");
 avatar.textContent=(p.authors?.[0]||p.source||"R").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
 const identity=el(header,"div","","feed-post-identity");
 el(identity,"strong",p.authors?.[0]||"Research update");
 el(identity,"small",(archive.names[p.source]||p.source)+" · "+dateString(p));
 const source=el(header,"span",archive.names[p.source]||p.source,"feed-source");
 const h=el(card,"h3");anchor(h,p.title,p.url);
 if(p.authors?.length>1)el(card,"p",p.authors.slice(1,5).join(", ")+(p.authors.length>5?" et al.":""),"feed-authors");
 const reasons=el(card,"div","","feed-why");
 for(const reason of item.reasons.slice(0,3))el(reasons,"span",reason);
 if(p.abstract){
  const details=el(card,"details","","feed-summary");
  const summary=el(details,"summary","Read abstract");
  el(details,"p",p.abstract);
  details.addEventListener("toggle",()=>{summary.textContent=details.open?"Hide abstract":"Read abstract"});
 }
 if(typeof p.citations==="number"&&p.citations>=0)
  el(card,"small",p.citations+" citations (source metadata)","feed-citations");
 actionsFor(card,item);
 if(p.authors?.length&&follow){
  const details=el(card,"details","","feed-follow-details");
  el(details,"summary","Follow an author from this paper");
  details.addEventListener("toggle",()=>{if(details.open&&!details.querySelector(".axiovo-author-follow"))follow.mount(details,p.authors) });
 }
}
function recalculate(){
 const prefs=preferences();displayPreferences(prefs);
 state.items=core.build(state.papers,prefs);
 const current=core.select(state.items,state.view);
 const filtered=current.filter(x=>$("feed-source").value==="all"||x.paper.source===$("feed-source").value)
  .filter(x=>{const range=Number($("feed-window").value);return !range||(x.days!==null&&x.days<=range)});
 const selected=window.AxiovoPaperSort?.sort(filtered,$("feed-sort").value,x=>x.score)||filtered;
 $("feed-results").replaceChildren();
 for(const item of selected.slice(0,state.limit))renderCard(item);
 if(!selected.length){
  const area=el($("feed-results"),"div","","feed-empty");
  el(area,"strong",personalized(prefs)?"No matching papers in the selected window.":"Build your research feed");
  el(area,"p",personalized(prefs)?
   "Try All indexed dates, Search more literature, or follow an additional topic. This does not mean the author has no publications.":
   "Follow an author or a precise research subtopic in the panel below. Your interests automatically connect with Discover and Library.");
  anchor(area,"Follow researchers and topics","#feed-follow-tools");
 }
 $("feed-match-count").textContent=selected.length+" matching";
 $("feed-pulse-count").textContent=String(state.items.length);
 $("feed-pulse-label").textContent="Relevant source-linked papers";
 $("feed-stream-heading").textContent={
  "for-you":"For your research",following:"From followed researchers & topics",
  latest:"Latest relevant papers",related:"Similar research"
 }[state.view]||"For your research";
 $("feed-more").hidden=selected.length<=state.limit;
 $("feed-sort-note").textContent=window.AxiovoPaperSort?.note(selected.map(x=>x.paper),$("feed-sort").value)||"";
 const errors=state.sourceErrors.length?" Unavailable: "+state.sourceErrors.join(", ")+".":"";
 $("feed-status").textContent=selected.length+" matches · "+statusText(state.papers)+errors;
}
function updatePapers(incoming){
 state.papers=archive.merge(state.papers,...[incoming]);
 recalculate();
}
async function liveAuthor(name,signal){
 // OpenAlex provides researcher identity links, then canonical arXiv URLs.
 const res=await fetch("https://api.openalex.org/authors?"+new URLSearchParams({
  search:follow?.searchName(name)||name,per_page:"10"}),{signal});
 if(!res.ok)throw Error("Author lookup failed");
 const authors=((await res.json()).results||[]).filter(x=>x.id&&follow?.matchesName(name,x.display_name)).slice(0,2);
 const records=[];
 for(const author of authors){
  if(signal.aborted)break;
  const id=String(author.id).split("/").at(-1);
  if(!/^A\d+$/.test(id))continue;
  const params=new URLSearchParams({filter:"authorships.author.id:"+id,sort:"publication_date:desc",per_page:"60",
   select:"id,display_name,publication_date,authorships,locations,primary_location,best_oa_location,abstract_inverted_index"});
  const works=await fetch("https://api.openalex.org/works?"+params,{signal});
  if(!works.ok)continue;
  for(const work of (await works.json()).results||[]){
   const ref=window.AxiovoArxiv?.candidates(work)?.[0];
   if(!ref||!work.display_name)continue;
   const names=(work.authorships||[]).map(x=>x.author?.display_name).filter(Boolean);
   if(!names.some(x=>follow.matchesName(name,x)))continue;
   const inverse=work.abstract_inverted_index||{},sequence=[];
   for(const [word,positions] of Object.entries(inverse)){
    if(!Array.isArray(positions))continue;
    for(const pos of positions)if(Number.isInteger(pos)&&pos>=0&&pos<1200)sequence[pos]=word;
   }
   const p=archive.normalize("arxiv",{
    id:ref.requested,title:work.display_name,authors:names,
    abstract:sequence.filter(Boolean).join(" ").slice(0,4000),
    published:work.publication_date||"",
    provenance:"OpenAlex author identity; arXiv-linked metadata"});
   if(p)records.push(p);
  }
 }
 return records;
}
async function discoverAuthors(signal,requestedName=""){
 const prefs=preferences(),known=core.build(state.papers,{...prefs,references:[]});
 const missing=prefs.authors.filter(name=>!known.some(item=>item.paper.authors?.some(x=>prefs.matchesAuthor(name,x))));
 const list=requestedName?[requestedName,...missing.filter(x=>x!==requestedName)]:missing;
 const pool=list.slice(0,3);
 if(!pool.length)return;
 const batch=await Promise.allSettled(pool.map(name=>liveAuthor(name,signal)));
 if(signal.aborted)return;
 const found=batch.filter(x=>x.status==="fulfilled").flatMap(x=>x.value);
 if(found.length)updatePapers(found);
 else notify("No additional verified arXiv-linked author papers were found in the available metadata.");
}
async function refresh(){
 if(state.loading)return;
 if(!personalized(preferences())){
  $("feed-pulse-synced").textContent="Follow an author or topic to get started";
  recalculate();return;
 }
 state.loading=true;$("feed-refresh").disabled=true;
 const run=++state.refreshId;
 const signal=AbortSignal.timeout(22000);
 $("feed-status").textContent="Checking source snapshots; matching papers appear as each archive responds…";
 let received=0;const missing=[],timestamps=[];
 try{
  const sources=["arxiv","biorxiv","chemrxiv"];
  await Promise.all(sources.map(async source=>{
   try{
    const snap=await archive.snapshot(source,{force:true});
    if(run!==state.refreshId)return;
    const rows=Array.isArray(snap?.papers)?snap.papers:[];
    received++;
    if(snap.stamp)timestamps.push(snap.stamp);
    state.papers=archive.merge(state.papers,rows);
    state.sourceErrors=[...missing];
    recalculate();
    $("feed-status").textContent="Loaded "+received+" of 3 archives; "+state.items.length+
      " personalized matches. Additional source metadata may still be loading.";
   }catch{
    missing.push(source);
    if(run===state.refreshId){
     state.sourceErrors=[...missing];
     recalculate();
    }
   }
  }));
  if(run!==state.refreshId)return;
  $("feed-pulse-synced").textContent=timestamps.length?
   "Latest indexed snapshot: "+timestamps.sort().at(-1).slice(0,16).replace("T"," "):
   "Published snapshot date unavailable";
  try{await discoverAuthors(signal)}catch{ /* Locally indexed metadata remains useful. */ }
 }catch{
  notify("The source refresh encountered a network problem. Your existing feed remains available.");
 }finally{
  if(run===state.refreshId){
   state.loading=false;$("feed-refresh").disabled=false;recalculate();
  }
 }
}
async function searchMore(){
 if(state.expanded)return;
 const pref=preferences();
 if(!pref.topics.length&&!pref.authors.length&&!pref.paths.length){
  notify("Follow an author or topic to search additional source records.");
  return;
 }
 state.expanded=true;
 const button=$("feed-search-more");button.disabled=true;button.textContent="Searching source metadata…";
 try{
  const sources=$("feed-source").value==="all"?["arxiv","biorxiv","chemrxiv"]:[$("feed-source").value];
  // Bound network work so mobile data usage remains predictable.
  const queries=sources.flatMap(source=>[
   ...pref.authors.slice(0,1).map(author=>({source,author})),
   ...[...pref.directTopics,...pref.paths.filter(path=>path.source===source).flatMap(path=>path.terms)]
    .filter(q=>core.terms(q).length).slice(0,pref.authors.length?1:2).map(q=>({source,q}))
  ]);
  if(!queries.length){notify("Open the saved Discover path to browse its archive and subject.");return}
  const results=await Promise.allSettled(queries.map(async ({source,q,author})=>{
   const found=await archive.live(source,{q,author,sort:"relevance"});
   return core.build(found.papers,{...pref,references:[]}).map(item=>item.paper);
  }));
  const merged=results.filter(x=>x.status==="fulfilled").flatMap(x=>x.value);
  if(merged.length){
   updatePapers(merged);
   notify("Checked public source metadata and added "+merged.length+" relevant candidate records.");
  }else notify(results.some(result=>result.status==="rejected")?
   "Some public sources were unavailable. Your indexed feed is still available.":
   "No additional strong matches returned from the selected public metadata services.");
 }catch(error){
  notify("The expanded source search is unavailable. Your indexed feed remains usable.");
 }finally{
  button.disabled=false;button.textContent="Search more literature";state.expanded=false;
 }
}
$("feed-author-form").addEventListener("submit",e=>{
 e.preventDefault();const field=$("feed-author-input"),name=field.value.trim();
 if(!name)return;
 if(follow?.setFollowing(name,true)){
  field.value="";notify("Following "+name+". Checking source records…");recalculate();
  if(!state.refreshId)refresh();
  else discoverAuthors(AbortSignal.timeout(17000),name).catch(()=>notify(
   "Author followed. Public author lookup is temporarily unavailable; existing indexed papers remain visible."));
 }
 else notify("Could not follow this author on this device.");
});
$("feed-topic-form").addEventListener("submit",e=>{
 e.preventDefault();const field=$("feed-topic-input"),topic=field.value.trim();
 if(prefsAPI.updateTopic(localStorage,topic,true)){
  field.value="";notify("Following "+topic+". Search more if no results are indexed.");recalculate();
  if(!state.refreshId)refresh();
 }else notify("Enter a specific research topic of at least three characters.");
});
$("feed-more").onclick=()=>{state.limit+=12;recalculate()};
$("feed-refresh").onclick=refresh;
$("feed-search-more")?.addEventListener("click",searchMore);
for(const id of ["feed-source","feed-window","feed-sort"])$(id).addEventListener("change",()=>{
 state.limit=12;recalculate();
});
for(const tab of document.querySelectorAll("[data-view]"))tab.onclick=()=>{
 state.view=tab.dataset.view;state.limit=12;
 $("feed-sort").value=["latest","following"].includes(state.view)?"recent":"relevance";
 for(const button of document.querySelectorAll("[data-view]"))button.setAttribute("aria-pressed",String(button===tab));
 recalculate();
};
window.addEventListener("axiovo:author-follow-change",recalculate);
window.addEventListener("axiovo-library-change",recalculate);
window.addEventListener("storage",()=>{if(!state.refreshId)refresh();else recalculate()});
refresh();
})();
