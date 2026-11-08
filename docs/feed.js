/* Axiovo My Feed: research-first social timeline, source-verified and local-first. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const core=window.AxiovoFeedCore,archive=window.AxiovoArchiveData,
 follow=window.AxiovoAuthorFollow,prefsAPI=window.AxiovoFeedPreferences;
if(!core||!archive||!prefsAPI||!window.AxiovoFeedCorpus||!$("feed-results"))return;
const HIDDEN="axiovo-feed-hidden-v1";
const UNVERIFIED_NAMES="axiovo-feed-include-unverified-names-v1";
const state={paperCount:0,items:[],view:"for-you",limit:12,loading:false,expanded:false,
 lastHidden:null,sourceErrors:[],sourcesLoaded:0,refreshId:0,paperEpoch:0};
const sources=["arxiv","biorxiv","chemrxiv","eprint"];
const fallback=window.AxiovoFeedCorpus();
let worker=null,workerUnavailable=typeof Worker==="undefined",requestId=0;
let rankSequence=0,rankCacheKey="",rankPending=false;
const requests=new Map();
function useFallback(){
 if(!worker)return;
 worker.terminate();worker=null;workerUnavailable=true;
 for(const {timer,reject} of requests.values()){
  clearTimeout(timer);reject(Error("Feed worker unavailable"));
 }
 requests.clear();
 // Discard in-flight updates from the old worker, keeping cards visible
 // while the same sources reload through the browser fallback.
 state.refreshId++;state.loading=false;
 rankSequence++;rankPending=false;rankCacheKey="";
 void refresh();
}
function query(method,...args){
 if(!worker&&!workerUnavailable){
  try{
   worker=new Worker("./feed-rank-worker.js?v=20261108-mobile-feed-v2");
   worker.onerror=useFallback;
   worker.onmessageerror=useFallback;
   worker.onmessage=({data})=>{
    const request=requests.get(data.id);
    if(!request)return;
    requests.delete(data.id);clearTimeout(request.timer);
    if(data.error)request.reject(Error(data.error));
    else request.resolve(data.value);
   };
  }catch{workerUnavailable=true}
 }
 if(!worker)return Promise.resolve().then(()=>fallback[method](...args));
 return new Promise((resolve,reject)=>{
  const id=++requestId;
  const timer=setTimeout(useFallback,45000);
  requests.set(id,{resolve,reject,timer});
  try{worker.postMessage({id,method,args})}catch{useFallback()}
 });
}
function sourcePapersChanged(count){
 state.paperCount=count;state.paperEpoch++;
 recalculate();
}

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
 let storage;
 try{storage=localStorage}catch{}
 const data=prefsAPI.derive(storage);
 const refs=["arxiv","biorxiv","chemrxiv","eprint"].flatMap(source=>archive.savedRecords(source));
 const saved=[...refs.map(core.key),...asArray(read("axiovo-reading-list",[])).map(x=>"arxiv:"+String(x).toLowerCase().replace(/v\d+$/,""))];
 return {...data,saved,hidden:getHidden(),includeUnverifiedNames:read(UNVERIFIED_NAMES,false)===true,references:refs.slice(0,20)};
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
function renderStatus(matches){
 const status=$("feed-status");
 if(state.loading){
  const progress=state.sourcesLoaded+" of "+sources.length+" archive snapshots loaded.";
  status.textContent=matches?matches+" matches so far · "+progress:"Checking indexed source records… "+progress;
  return;
 }
 const errors=state.sourceErrors.length?" Unavailable: "+state.sourceErrors.map(s=>archive.names[s]).join(", ")+".":"";
 status.textContent=matches+" matches · "+state.paperCount+" source-linked papers indexed for this feed. Coverage is partial."+errors;
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
  // archive.save/unsave synchronously dispatch axiovo-library-change.
  // Redrawing here would detach the button before this click completes.
  // Keep this card mounted and update its pressed state in place.
  const wasSaved=archive.saved(p);
  let ok=false;
  state.updatingLibraryFromFeed=true;
  try{
   ok=wasSaved?archive.unsave(p):archive.save(p);
  }finally{
   state.updatingLibraryFromFeed=false;
  }
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
 window.AxiovoCitationEvidence?.add(card,p);
 if(p.authors?.length&&follow){
  const details=el(card,"details","","feed-follow-details");
  el(details,"summary","Follow an author from this paper");
  details.addEventListener("toggle",()=>{if(details.open&&!details.querySelector(".axiovo-author-follow"))follow.mount(details,p.authors) });
 }
}
function renderRanked(prefs){
 const current=core.select(state.items,state.view);
 const filtered=current.filter(x=>$("feed-source").value==="all"||x.paper.source===$("feed-source").value)
  .filter(x=>{const range=Number($("feed-window").value);return !range||(x.days!==null&&x.days<=range)});
 const selected=window.AxiovoPaperSort?.sort(filtered,$("feed-sort").value,x=>x.score)||filtered;
 $("feed-results").replaceChildren();
 for(const item of selected.slice(0,state.limit))renderCard(item);
 if(!selected.length){
  const area=el($("feed-results"),"div","","feed-empty");
  el(area,"strong",state.loading?"Checking for matching papers…":personalized(prefs)?"No matching papers in the selected window.":"Build your research feed");
  if(!state.loading)el(area,"p",personalized(prefs)?
   "Try a precise research topic or Discover subtopic. Name-only author matches are hidden unless you explicitly enable them; this does not mean the author has no publications.":
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
 renderStatus(selected.length);
}
const rankKey=prefs=>state.paperEpoch+"|"+JSON.stringify(prefs);
async function recalculate(){
 const prefs=preferences();
 displayPreferences(prefs);
 const key=rankKey(prefs);
 if(rankCacheKey===key||!state.paperCount){
  renderRanked(prefs);
  return;
 }
 // Coalesce source arrivals and preference changes while a rank is in flight.
 if(rankPending)return;
 rankPending=true;
 const sequence=++rankSequence;
 try{
  const items=await query("rank",prefs,Date.now());
  if(sequence===rankSequence&&key===rankKey(preferences())){
   state.items=items;
   rankCacheKey=key;
   renderRanked(prefs);
  }
 }catch{
  if(sequence===rankSequence){
   if(worker)useFallback();
   else notify("Could not refresh feed matches. Previous results remain visible.");
  }
 }finally{
  if(sequence===rankSequence){
   rankPending=false;
   if(key!==rankKey(preferences()))void recalculate();
  }
 }
}

async function updatePapers(incoming,run){
 const count=await query("merge",incoming);
 if(run===state.refreshId)sourcePapersChanged(count);
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
 const prefs=preferences(),run=state.refreshId;
 if(!prefs.authors.length)return;
 const missing=await query("missingAuthors",prefs);
 if(signal.aborted||run!==state.refreshId)return;
 const list=requestedName?[requestedName,...missing.filter(x=>x!==requestedName)]:missing;
 const pool=list.slice(0,3);
 if(!pool.length)return;
 const batch=await Promise.allSettled(pool.map(name=>liveAuthor(name,signal)));
 if(signal.aborted||run!==state.refreshId)return;
 const found=batch.filter(x=>x.status==="fulfilled").flatMap(x=>x.value);
 if(found.length)await updatePapers(found,run);
 else notify("No additional verified arXiv-linked author papers were found in the available metadata.");
}
async function loadFastPreview(run){
 try{
  const count=await query("preview");
  if(run===state.refreshId&&count)sourcePapersChanged(count);
 }catch(_error){
  // Older deployments and offline clients do not require this optional file.
 }
}
async function refresh(manual=false){
 if(state.loading)return;
 if(!personalized(preferences())){
  $("feed-pulse-synced").textContent="Follow an author or topic to get started";
  recalculate();return;
 }
 state.loading=true;$("feed-refresh").disabled=true;
 const run=++state.refreshId;
 state.sourcesLoaded=0;state.sourceErrors=[];
 renderStatus(state.items.length);
 // Start the small preview before the largest download on slow connections.
 const preview=manual?Promise.resolve():loadFastPreview(run);
 const timestamps=[];
 try{
  await Promise.all(sources.map(async source=>{
   try{
    if(source==="eprint")await preview;
    if(run!==state.refreshId)return;
    const eprint=source==="eprint"&&window.AxiovoEprintSource;
    const snap=await query("snapshot",source,manual,worker&&eprint?eprint.readFallback():null);
    if(run!==state.refreshId)return;
    state.sourcesLoaded++;
    if(snap.stamp)timestamps.push(snap.stamp);
    if(worker&&snap.eprint)eprint?.remember(snap.eprint);
    if(snap.offlineSubset)state.sourceErrors.push(source);
    sourcePapersChanged(snap.count);
   }catch{
    if(run===state.refreshId){
     state.sourceErrors.push(source);
     renderStatus(state.items.length);
    }
   }
  }));
  if(run!==state.refreshId)return;
  $("feed-pulse-synced").textContent=timestamps.length?
   "Latest indexed snapshot: "+timestamps.sort().at(-1).slice(0,16).replace("T"," "):
   "Published snapshot date unavailable";
  // Start the optional author lookup with a fresh deadline after the snapshots.
  void discoverAuthors(AbortSignal.timeout(22000)).catch(()=>{});
 }catch{
  notify("The source refresh encountered a network problem. Your existing feed remains available.");
 }finally{
  await preview;
  if(run===state.refreshId){
   state.loading=false;$("feed-refresh").disabled=false;recalculate();
  }
 }
}
async function searchMore(){
 if(state.expanded)return;
 const pref=preferences(),run=state.refreshId;
 if(!pref.topics.length&&!pref.authors.length&&!pref.paths.length){
  notify("Follow an author or topic to search additional source records.");
  return;
 }
 state.expanded=true;
 const button=$("feed-search-more");button.disabled=true;button.textContent="Searching source metadata…";
 try{
  const selectedSources=$("feed-source").value==="all"?sources:[$("feed-source").value];
  // Bound network work so mobile data usage remains predictable.
  const queries=selectedSources.flatMap(source=>[
   ...pref.authors.slice(0,1).map(author=>({source,author})),
   ...[...pref.directTopics,...pref.paths.filter(path=>path.source===source).flatMap(path=>path.terms)]
    .filter(q=>core.terms(q).length).slice(0,pref.authors.length?1:2).map(q=>({source,q}))
  ]);
  if(!queries.length){notify("Open the saved Discover path to browse its archive and subject.");return}
  const results=await Promise.allSettled(queries.map(({source,q,author})=>
   query("search",source,{q,author,sort:"relevance"},pref)));
  if(run!==state.refreshId)return;
  const merged=results.filter(x=>x.status==="fulfilled").flatMap(x=>x.value);
  if(merged.length){
   await updatePapers(merged,run);
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
$("feed-refresh").onclick=()=>refresh(true);
const uncertainNames=$("feed-show-unverified-names");
if(uncertainNames){
 uncertainNames.checked=read(UNVERIFIED_NAMES,false)===true;
 uncertainNames.addEventListener("change",()=>{
  if(!write(UNVERIFIED_NAMES,uncertainNames.checked)){
   uncertainNames.checked=!uncertainNames.checked;
   notify("Could not save name-match preference on this device.");return;
  }
  state.limit=12;
  recalculate();
  notify(uncertainNames.checked?
   "Showing possible author-name matches. These are not verified researcher identities.":
   "Name-only author matches hidden. Topic-supported research remains visible.");
 });
}
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
window.addEventListener("axiovo-library-change",()=>{
 // Other pages and controls still trigger a full feed re-evaluation.
 // Local save clicks must not detach the active button mid-interaction.
 if(!state.updatingLibraryFromFeed)recalculate();
});
window.addEventListener("storage",()=>{if(!state.refreshId)refresh();else recalculate()});
refresh();
})();
