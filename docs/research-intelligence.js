/* Personalized evidence discovery and browser-local research questions.
 * All matching is lexical and restricted to the existing indexed arXiv snapshot.
 */
(function(){
"use strict";
const R=window.AxiovoRelevance,$=id=>document.getElementById(id);
const PROJECTS="axiovo-research-projects-v1";
const OLD_SAVED="axiovo-reading-list";
const META="axiovo-research-interest-settings-v1";
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}}
function write(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true}catch{return false}}
const texts=(o,k,v,className="")=>{const n=document.createElement(k);n.textContent=String(v??"");if(className)n.className=className;o.append(n);return n};
const message=(el,str)=>{if(el)el.textContent=str};
let projects=(Array.isArray(read(PROJECTS,[]))?read(PROJECTS,[]):[]).map(R.cleanProject).filter(Boolean);
let settings=read(META,{interests:[],authors:[]});
if(!settings||typeof settings!=="object")settings={interests:[],authors:[]};
settings.interests=Array.isArray(settings.interests)?settings.interests.slice(0,15):[];
settings.authors=Array.isArray(settings.authors)?settings.authors.slice(0,20):[];
let feed=[],filtered=[],pickedProject="";
const Arxiv=window.AxiovoArxiv;
function persistProjects(){if(write(PROJECTS,projects))window.dispatchEvent(new Event("axiovo:projects-updated"))}
function persistSettings(){write(META,settings)}
function link(parent,url,label){if(!/^https:\/\//.test(url||""))return;const a=texts(parent,"a",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer"}
function projectName(p){return p.title+(p.status==="completed"?" (completed)":"")}
function allInterests(){const followed=window.AxiovoFeedPreferences?.derive(localStorage);if(followed)return followed.topics.slice(0,45);const p=read("axiovo-field-explorer-v1",{});return [...new Set([...settings.interests,p.topic,p.subtopic].filter(x=>typeof x==="string"&&x.trim()))].slice(0,20)}
function drawSettings(){
 const p=read("axiovo-field-explorer-v1",{});
 $("research-interest").value=settings.interests.join(", ");
 $("research-authors").value=settings.authors.join(", ");
 message($("interest-summary"),"Using "+allInterests().length+" interests. "+
   (p.subtopic?"Current specialized interest: "+p.subtopic+". ":p.topic?"Current research area: "+p.topic+". ":"")+"Scores show matching terms, not scientific importance.");
}
function renderProjects(){
 const root=$("research-project-list");root.replaceChildren();
 const choose=$("research-project-filter");const selected=choose.value||pickedProject;choose.replaceChildren();
 let opt=document.createElement("option");opt.value="";opt.textContent="All research questions";choose.append(opt);
 for(const p of projects){opt=document.createElement("option");opt.value=p.id;opt.textContent=p.title;choose.append(opt)}
 choose.value=projects.some(p=>p.id===selected)?selected:"";pickedProject=choose.value;
 message($("research-project-count"),projects.length+" questions");
 if(!projects.length){texts(root,"div","Start with a research question and a few precise keywords. Axiovo will surface matching papers from its current local index.").className="rl-empty";return}
 for(const p of projects){
  const item=texts(root,"article","","rl-project-card");
  const heading=texts(item,"div","","rl-section-head");
  texts(heading,"strong",p.title);
  const pill=texts(heading,"span",p.status,"rl-counter");
  pill.setAttribute("aria-label","Project status: "+p.status);
  if(p.question)texts(item,"p",p.question,"rl-subtext");
  if(p.keywords)texts(item,"p","Search terms: "+p.keywords,"rl-subtext");
  const controls=texts(item,"div","","rl-paper-actions");
  const select=document.createElement("select");select.setAttribute("aria-label","Status for "+p.title);
  for(const [value,label] of [["exploring","Exploring"],["active","Active"],["paused","Paused"],["completed","Completed"]]){const o=document.createElement("option");o.value=value;o.textContent=label;select.append(o)}
  select.value=p.status;select.onchange=()=>{p.status=select.value;p.updated_at=new Date().toISOString();persistProjects();renderProjects()};
  controls.append(select);
  const see=texts(controls,"button","Show matching papers");see.type="button";see.onclick=()=>{choose.value=p.id;pickedProject=p.id;renderRecommendations();document.getElementById("library-research-tools")?.setAttribute("open","");$("research-recs").scrollIntoView({behavior:"smooth",block:"start"})};
  const edit=texts(controls,"button","Edit");edit.type="button";edit.onclick=()=>{
    $("research-project-title").value=p.title;$("research-project-question").value=p.question;$("research-project-keywords").value=p.keywords;
    $("research-project-id").value=p.id;$("research-project-save").textContent="Update question";$("research-project-title").focus()};
  const remove=texts(controls,"button","Delete");remove.type="button";remove.onclick=()=>{
    if(!confirm("Delete this research question and its paper links? This cannot be undone."))return;
    projects=projects.filter(x=>x.id!==p.id);persistProjects();renderProjects();renderRecommendations()};
  const ids=p.paper_ids||[];const list=texts(item,"div","","rl-project-papers");
  if(ids.length){
   texts(list,"p",ids.length+" attached papers","rl-subtext");
   for(const id of ids.slice(0,10)){
     const row=texts(list,"div","","rl-project-paper-row");
     const saved=feed.find(x=>R.normalizeId(x.id)===id);
     const target="https://arxiv.org/abs/"+encodeURIComponent(id);
     link(row,target,saved?.title||"arXiv:"+id);
     const detach=texts(row,"button","Remove");detach.type="button";detach.setAttribute("aria-label","Remove paper "+id+" from "+p.title);
     detach.onclick=()=>{p.paper_ids=p.paper_ids.filter(x=>x!==id);persistProjects();renderProjects()};
   }
   if(ids.length>10)texts(list,"p","Showing first 10 linked papers.","rl-subtext");
  }
 }
}
function renderRecommendations(){
 const root=$("research-recommendations");root.replaceChildren();
 const p=projects.find(x=>x.id===$("research-project-filter").value);
 const selected=p?[p]:projects.filter(x=>x.status!=="completed");
 const saved=read(OLD_SAVED,[]),hidden=read("axiovo-hidden",[]);
 const authorFollowing=read("axiovo-author-follows",[]);
 const scored=R.rank(feed,{interests:allInterests(),projects:selected,authors:[
   ...settings.authors,...(Array.isArray(authorFollowing)?authorFollowing:[])
 ],matchesAuthor:(a,b)=>window.AxiovoAuthorFollow?.matchesName(a,b)===true,
  saved:Array.isArray(saved)?saved:[],hidden:Array.isArray(hidden)?hidden:[],now:new Date().toISOString()});
 filtered=scored;
 const sortMode=$("research-results-sort")?.value||"relevance";
 const ordered=window.AxiovoPaperSort?.sort(scored,sortMode,x=>x.score)||scored;
 const list=ordered.slice(0,12);
 if($("research-sort-note"))$("research-sort-note").textContent=
  window.AxiovoPaperSort?.note(ordered.map(x=>x.paper),sortMode)||"";
 message($("research-rec-count"),list.length+" of "+scored.length+" matching papers");
 if(!feed.length){texts(root,"div","No arXiv metadata available yet. Search any historical arXiv identifier directly in Discover.","rl-empty");return}
 if(!list.length){texts(root,"div","No matching arXiv-linked papers among the retrieved candidates. Broaden the research interest or search arXiv history directly.","rl-empty");return}
 for(const hit of list){
  const pp=hit.paper;
  const item=texts(root,"article","","rl-paper axiovo-rec-card");
  const head=texts(item,"div","","axiovo-rec-head");
  const sourceBadge=texts(head,"span","arXiv · Research recommendation","axiovo-rec-source");
  const published=String(pp.published||"").slice(0,10);
  if(published)texts(head,"time",published,"axiovo-rec-date").dateTime=published;
  const title=texts(item,"h3","");
  const paperUrl=Arxiv?.abs(pp.id)||"https://arxiv.org/";
  const a=texts(title,"a",pp.title||"Untitled paper");a.href=paperUrl;a.target="_blank";a.rel="noopener noreferrer";
  const authors=(pp.authors||[]).filter(x=>typeof x==="string"&&x.trim());
  texts(item,"p",authors.slice(0,5).join(", ")+(authors.length>5?" et al.":""),"rl-paper-meta");
  const reasons=hit.reasons.filter(x=>x!=="Already saved").slice(0,3);
  if(reasons.length){
   const tags=texts(item,"div","","axiovo-rec-reasons");
   for(const reason of reasons)texts(tags,"span",reason,"axiovo-rec-reason");
  }
  const abstractText=String(pp.abstract||pp.summary||"").trim();
  if(abstractText){
   const preview=texts(item,"p",abstractText.slice(0,235)+(abstractText.length>235?"…":""),"axiovo-rec-abstract");
   const expand=texts(item,"details","","axiovo-rec-abstract-full");
   texts(expand,"summary","Read full abstract");
   texts(expand,"p",abstractText);
  }else texts(item,"p","Abstract not available in the indexed source record.","axiovo-rec-abstract");
  const row=texts(item,"div","","rl-paper-actions axiovo-rec-actions");
  const parsed=Arxiv?.parse(pp.id),sourceId=parsed?.requested||String(pp.id||"");
  const original=Arxiv?.abs(sourceId)||paperUrl;
  const readLink=texts(row,"a","↗ Read paper");readLink.href=original;
  readLink.target="_blank";readLink.rel="noopener noreferrer";readLink.className="axiovo-rec-read";
  const listen=texts(row,"button","▶ Listen","axiovo-rec-listen");
  listen.type="button";listen.disabled=!abstractText;
  listen.title=abstractText?"Listen to the source abstract":"Abstract unavailable";
  listen.setAttribute("aria-label","Listen to abstract of "+pp.title);
  listen.onclick=()=>{
   if(!abstractText)return;
   const player=window.AxiovoAbstractAudio;
   if(player?.play)player.play([{title:pp.title,abstract:abstractText}]);
   else message($("research-rec-status"),"Audio is not available on this browser. The abstract remains readable above.");
  };
  const cop=texts(row,"a","✦ Research AI");cop.href="./copilot.html?id="+encodeURIComponent(sourceId);
  cop.className="axiovo-rec-assistant";
  const current=read(OLD_SAVED,[]);
  const savedHere=Array.isArray(current)&&current.some(id=>R.normalizeId(id)===R.normalizeId(sourceId));
  const save=texts(row,"button","","axiovo-rec-save paper-save-btn");
  save.type="button";
  const saveIcon=texts(save,"span",savedHere?"★":"☆","paper-save-btn__icon");
  saveIcon.setAttribute("aria-hidden","true");
  const saveLabel=texts(save,"span",savedHere?"Saved":"Save","paper-save-btn__label");
  function updateSave(isSaved){
   save.setAttribute("aria-pressed",String(isSaved));
   save.setAttribute("aria-label",(isSaved?"Remove ":"Save ")+pp.title+(isSaved?" from":" to")+" your reading list");
   save.title=isSaved?"Remove from Library":"Save to Library";
   saveIcon.textContent=isSaved?"★":"☆";saveLabel.textContent=isSaved?"Saved":"Save";
  }
  updateSave(savedHere);
  save.onclick=()=>{
    const current=read(OLD_SAVED,[]),ids=Array.isArray(current)?current:[];
    const present=ids.some(id=>R.normalizeId(id)===R.normalizeId(sourceId));
    const next=present?ids.filter(id=>R.normalizeId(id)!==R.normalizeId(sourceId)):[...ids,sourceId];
    if(write(OLD_SAVED,next)){
      updateSave(!present);
      window.dispatchEvent(new CustomEvent("axiovo-library-change"));
      message($("research-rec-status"),(present?"Removed ":"Saved ")+pp.title+(present?" from":" to")+" your reading list.");
    }else message($("research-rec-status"),"Could not save. Browser storage may be unavailable.");
  };
  const more=texts(item,"details","","axiovo-rec-more");
  texts(more,"summary","More paper tools");
  const extra=texts(more,"div","","axiovo-rec-extra");
  if(parsed){
   const details=texts(extra,"a","Paper details");details.href="./paper.html?id="+encodeURIComponent(sourceId);
  }
  const followDetails=texts(more,"div","","axiovo-rec-author-tools");
  if(authors.length)window.AxiovoAuthorFollow?.attach(followDetails,authors);
  if(projects.length){
   const selector=document.createElement("select");selector.setAttribute("aria-label","Choose a research question for "+pp.title);
   let option=document.createElement("option");option.value="";option.textContent="Attach to a question…";selector.append(option);
   for(const proj of projects){option=document.createElement("option");option.value=proj.id;option.textContent=proj.title;selector.append(option)}
   selector.onchange=()=>{
     const q=projects.find(x=>x.id===selector.value);if(!q)return;
     const id=R.normalizeId(pp.id);if(!q.paper_ids.includes(id)){q.paper_ids.push(id);q.updated_at=new Date().toISOString();persistProjects()}
     message($("research-rec-status"),"Paper attached to "+q.title);renderProjects();selector.value="";
   };
   extra.append(selector)
  }
 }
}
function render(){renderProjects();renderRecommendations()}
function abstractFromInverted(index){
 if(!index||typeof index!=="object")return"";
 const words=[];for(const [word,positions] of Object.entries(index))if(Array.isArray(positions))for(const k of positions)if(Number.isInteger(k)&&k>=0&&k<500)words[k]=word;
 return words.filter(Boolean).join(" ").slice(0,2000)
}
async function loadLiveArxiv(){
 const prefs=read("axiovo-field-explorer-v1",{});
 const interest=String(prefs.subtopic||prefs.topic||settings.interests[0]||"quantum information").trim();
 if(!interest)return;
 const params=new URLSearchParams({search:interest,filter:"locations.source.id:S4306400194",per_page:"40",
  select:"id,display_name,publication_date,cited_by_count,authorships,locations,primary_location,best_oa_location,abstract_inverted_index"});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),17000);
 try{
  const response=await fetch("https://api.openalex.org/works?"+params,{signal:controller.signal,headers:{Accept:"application/json"}});
  if(!response.ok)throw Error("OpenAlex "+response.status);
  const data=await response.json(),incoming=[];
  for(const work of data.results||[]){
    const arxiv=Arxiv?.candidates(work)[0];if(!arxiv||!work.display_name)continue;
    incoming.push({id:arxiv.requested,title:work.display_name,
      abstract:abstractFromInverted(work.abstract_inverted_index),
      authors:(work.authorships||[]).map(a=>a.author?.display_name).filter(Boolean),
      published:work.publication_date||"",citations:Number.isInteger(work.cited_by_count)?work.cited_by_count:null,provider:"OpenAlex arXiv-linked metadata"});
  }
  const unique=new Map();
  for(const paper of [...incoming,...feed]){const key=Arxiv?.base(paper.id)||paper.id;if(!key||unique.has(key))continue;unique.set(key,paper)}
  feed=[...unique.values()];
  message($("research-rec-status"),"Retrieved "+incoming.length+" additional arXiv-linked records for “"+interest+"” through live OpenAlex metadata. Coverage is not exhaustive; dates on those records may not be arXiv submission dates.");
  renderRecommendations();
 }catch(err){
  message($("research-rec-status"),"Live arXiv-linked discovery unavailable: "+String(err.message||err)+". New-announcement metadata and saved records remain accessible.");
 }finally{clearTimeout(timer)}
}
function startup(){
 if(!$("research-project-list")||!R)return;
 drawSettings();
 $("research-interest-form").onsubmit=e=>{
   e.preventDefault();
   settings.interests=[...new Set($("research-interest").value.split(/[,\n;]/).map(x=>x.trim()).filter(x=>x.length>=3))].slice(0,15);
   settings.authors=[...new Set($("research-authors").value.split(/[,\n;]/).map(x=>x.trim()).filter(x=>x.length>=3))].slice(0,20);
   persistSettings();drawSettings();renderRecommendations();message($("interest-status"),"Research interests saved on this device.")
 };
 $("research-project-form").onsubmit=e=>{
   e.preventDefault();
   const title=$("research-project-title").value.trim().slice(0,160);
   const question=$("research-project-question").value.trim().slice(0,1000);
   const keywords=$("research-project-keywords").value.trim().slice(0,300);
   if(title.length<3||keywords.length<3){message($("project-status"),"Use a title and at least one precise keyword.");return}
   const editId=$("research-project-id").value;
   const existing=projects.find(x=>x.id===editId);
   if(existing){existing.title=title;existing.question=question;existing.keywords=keywords;existing.updated_at=new Date().toISOString()}
   else{
     if(projects.length>=30){message($("project-status"),"Maximum 30 questions in this device-local prototype.");return}
     projects.unshift({id:"p-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),
       title,question,keywords,status:"exploring",paper_ids:[],updated_at:new Date().toISOString()})
   }
   persistProjects();$("research-project-form").reset();$("research-project-id").value="";
   $("research-project-save").textContent="Save research question";
   message($("project-status"),existing?"Question updated.":"Question saved locally.");render()
 };
 $("research-project-cancel").onclick=()=>{
   $("research-project-form").reset();$("research-project-id").value="";$("research-project-save").textContent="Save research question"};
 $("research-project-filter").onchange=()=>{pickedProject=$("research-project-filter").value;renderRecommendations()};
 $("research-project-export").onclick=()=>{
   const blob=new Blob([JSON.stringify({schema:1,projects,settings},null,2)],{type:"application/json"});
   const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="axiovo-questions.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
 };
 $("research-project-import").onchange=async e=>{
   const file=e.target.files?.[0];if(!file)return;
   if(file.size>1024*1024){message($("project-status"),"Import file is too large.");return}
   try{
     const obj=JSON.parse(await file.text());
     const incoming=Array.isArray(obj.projects)?obj.projects.map(R.cleanProject).filter(Boolean):[];
     if(obj.schema!==1||!Array.isArray(obj.projects))throw Error("Unsupported project export format");
     const map=new Map(projects.map(p=>[p.id,p]));for(const p of incoming.slice(0,30))map.set(p.id,p);
     projects=[...map.values()].slice(0,30);persistProjects();render();message($("project-status"),"Imported "+incoming.length+" research questions.")
   }catch(err){message($("project-status"),"Import failed: "+err.message)}finally{e.target.value=""}
 };
 $("research-results-sort")?.addEventListener("change",renderRecommendations);
 window.addEventListener("axiovo:workspace-activated",()=>{drawSettings();renderRecommendations()});
  window.addEventListener("axiovo:author-follow-change",()=>renderRecommendations());
 window.addEventListener("axiovo:projects-updated",()=>{projects=(Array.isArray(read(PROJECTS,[]))?read(PROJECTS,[]):[]).map(R.cleanProject).filter(Boolean);render()});
 window.addEventListener("storage",e=>{
   if(e.key===PROJECTS){projects=(Array.isArray(read(PROJECTS,[]))?read(PROJECTS,[]):[]).map(R.cleanProject).filter(Boolean);render()}
   if(e.key===META){settings=read(META,{interests:[],authors:[]});drawSettings();renderRecommendations()}
    if(e.key==="axiovo-author-follows")renderRecommendations();
 });
 async function mergeRecentlyVerifiedMetadata(){
  // Preserve arXiv v1 publication dates; announcement dates are separate.
  const paths=["./data/oai-recent.json","./data/announcements.json"];
  const outcomes=await Promise.allSettled(paths.map(path=>fetch(path,{
   cache:"no-store",signal:AbortSignal.timeout(9000)
  }).then(res=>{if(!res.ok)throw Error("HTTP "+res.status);return res.json()})));
  const existing=new Map(feed.map(p=>[Arxiv?.base(p.id)||p.id,p]));
  let added=0;
  for(const outcome of outcomes){
   if(outcome.status!=="fulfilled"||!Array.isArray(outcome.value.papers))continue;
   for(const record of outcome.value.papers){
    const parsed=Arxiv?.parse(record.id||record.arxiv_id||"");
    if(!parsed||typeof record.title!=="string"||!record.title.trim())continue;
    const previous=existing.get(parsed.base);
    if(previous){
     if(!previous.abstract&&record.abstract)previous.abstract=record.abstract;
     if(!previous.announcement_date&&record.announcement_date)previous.announcement_date=record.announcement_date;
     continue;
    }
    existing.set(parsed.base,{...record,id:parsed.base,
     published:record.published||record.created||"",announcement_date:record.announcement_date||"",
     authors:Array.isArray(record.authors)?record.authors:[],
     categories:Array.isArray(record.categories)?record.categories:[]});
    added++;
   }
  }
  feed=[...existing.values()];
  message($("research-rec-status"),"Matching "+feed.length+" source-linked arXiv records"+
   (added?" including "+added+" newly indexed official-source candidates":"")+
   ". Snapshot coverage is partial; announcement dates are not first-submission dates.");
  renderRecommendations();
 }
 let loaded=false;
 function loadSuggestions(){
  if(loaded)return;
  loaded=true;
 fetch("./data/feed.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(j=>{feed=Array.isArray(j.papers)?j.papers:[];message($("research-rec-status"),
    "Scored "+feed.length+" locally indexed arXiv records. This is lexical matching, not a novelty assessment.");renderRecommendations();mergeRecentlyVerifiedMetadata().finally(loadLiveArxiv)})
  .catch(()=>{message($("research-rec-status"),"Announcement snapshot unavailable; trying live arXiv-linked literature.");loadLiveArxiv()});
 }
 const tools=document.getElementById("library-research-tools");
 if(tools){
  tools.addEventListener("toggle",()=>{if(tools.open)loadSuggestions()});
  if(tools.open)loadSuggestions();
 }else loadSuggestions();
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startup);else startup();
})();