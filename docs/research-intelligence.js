/* Personalized evidence discovery and browser-local research questions.
 * All matching is lexical and restricted to the existing indexed arXiv snapshot.
 */
(function(){
"use strict";
const R=window.ResearchLensRelevance,$=id=>document.getElementById(id);
const PROJECTS="researchlens-research-projects-v1";
const OLD_SAVED="researchlens-reading-list";
const META="researchlens-research-interest-settings-v1";
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}}
function write(key,val){try{localStorage.setItem(key,JSON.stringify(val));return true}catch{return false}}
const texts=(o,k,v)=>{const n=document.createElement(k);n.textContent=String(v||"");o.append(n);return n};
const message=(el,str)=>{if(el)el.textContent=str};
let projects=(Array.isArray(read(PROJECTS,[]))?read(PROJECTS,[]):[]).map(R.cleanProject).filter(Boolean);
let settings=read(META,{interests:[],authors:[]});
if(!settings||typeof settings!=="object")settings={interests:[],authors:[]};
settings.interests=Array.isArray(settings.interests)?settings.interests.slice(0,15):[];
settings.authors=Array.isArray(settings.authors)?settings.authors.slice(0,20):[];
let feed=[],filtered=[],pickedProject="";
function persistProjects(){write(PROJECTS,projects)}
function persistSettings(){write(META,settings)}
function link(parent,url,label){if(!/^https:\/\//.test(url||""))return;const a=texts(parent,"a",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer"}
function projectName(p){return p.title+(p.status==="completed"?" (completed)":"")}
function allInterests(){const p=read("researchlens-field-explorer-v1",{});const topics=read("researchlens-followed-topics",[]);return [...new Set([...settings.interests, ...(Array.isArray(topics)?topics:[]),p.topic].filter(x=>typeof x==="string"&&x.trim()))].slice(0,15)}
function drawSettings(){
 const p=read("researchlens-field-explorer-v1",{});
 $("research-interest").value=settings.interests.join(", ");
 $("research-authors").value=settings.authors.join(", ");
 message($("interest-summary"),"Using "+allInterests().length+" interests. "+
   (p.topic?"Current Field Explorer topic: "+p.topic+". ":"")+"Scores show matching terms, not scientific importance.");
}
function renderProjects(){
 const root=$("research-project-list");root.replaceChildren();
 const choose=$("research-project-filter");const selected=choose.value||pickedProject;choose.replaceChildren();
 let opt=document.createElement("option");opt.value="";opt.textContent="All research questions";choose.append(opt);
 for(const p of projects){opt=document.createElement("option");opt.value=p.id;opt.textContent=p.title;choose.append(opt)}
 choose.value=projects.some(p=>p.id===selected)?selected:"";pickedProject=choose.value;
 message($("research-project-count"),projects.length+" questions");
 if(!projects.length){texts(root,"div","Start with a research question and a few precise keywords. ResearchLens will surface matching papers from its current local index.").className="rl-empty";return}
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
  const see=texts(controls,"button","Show matching papers");see.type="button";see.onclick=()=>{choose.value=p.id;pickedProject=p.id;renderRecommendations();$("research-recs").scrollIntoView({behavior:"smooth",block:"start"})};
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
 const saved=read(OLD_SAVED,[]),hidden=read("researchlens-hidden",[]);
 const authorFollowing=read("researchlens-author-follows",[]);
 const scored=R.rank(feed,{interests:allInterests(),projects:selected,authors:[
   ...settings.authors,...(Array.isArray(authorFollowing)?authorFollowing:[])
 ],saved:Array.isArray(saved)?saved:[],hidden:Array.isArray(hidden)?hidden:[],now:new Date().toISOString()});
 filtered=scored;
 const list=scored.slice(0,12);
 message($("research-rec-count"),list.length+" of "+scored.length+" matching papers");
 if(!feed.length){texts(root,"div","No current feed data. This feature uses the indexed arXiv snapshot; it cannot create or retrieve new arXiv records.","rl-empty");return}
 if(!list.length){texts(root,"div","No matching papers in the current index. Add specific research interests or question keywords, or use Field Explorer to search wider literature.","rl-empty");return}
 for(const hit of list){
  const pp=hit.paper;
  const item=texts(root,"article","","rl-paper");
  const title=texts(item,"h3","");
  const a=texts(title,"a",pp.title||"Untitled paper");a.href="https://arxiv.org/abs/"+encodeURIComponent(pp.id);a.target="_blank";a.rel="noopener noreferrer";
  texts(item,"p",(pp.authors||[]).slice(0,4).join(", ")+(pp.published?" · "+pp.published.slice(0,10):""),"rl-paper-meta");
  texts(item,"p",hit.reasons.filter(x=>x!=="Already saved").slice(0,3).join(" · "),"rl-relevance-reason");
  if(hit.reasons.includes("Already saved"))texts(item,"span","In your reading list","rl-counter");
  const row=texts(item,"div","","rl-paper-actions");
  link(row,"https://arxiv.org/abs/"+encodeURIComponent(pp.id),"Read on arXiv");
  const cop=texts(row,"a","Ask Copilot");cop.href="./copilot.html?id="+encodeURIComponent(pp.id);
  const save=texts(row,"button","Save to reading list");save.type="button";
  save.onclick=()=>{
    const current=read(OLD_SAVED,[]);const ids=Array.isArray(current)?current:[];
    const id=R.normalizeId(pp.id);if(!ids.includes(id))ids.push(id);
    if(write(OLD_SAVED,ids)){window.dispatchEvent(new CustomEvent("researchlens-library-change"));message($("research-rec-status"),"Saved arXiv:"+id+" to your reading list.");renderRecommendations()}
    else message($("research-rec-status"),"Could not save. Local browser storage may be disabled.")
  };
  if(projects.length){
   const selector=document.createElement("select");selector.setAttribute("aria-label","Choose a research question for "+pp.title);
   let option=document.createElement("option");option.value="";option.textContent="Attach to a question…";selector.append(option);
   for(const proj of projects){option=document.createElement("option");option.value=proj.id;option.textContent=proj.title;selector.append(option)}
   selector.onchange=()=>{
     const q=projects.find(x=>x.id===selector.value);if(!q)return;
     const id=R.normalizeId(pp.id);if(!q.paper_ids.includes(id)){q.paper_ids.push(id);q.updated_at=new Date().toISOString();persistProjects()}
     message($("research-rec-status"),"Paper attached to "+q.title);renderProjects();selector.value="";
   };
   row.append(selector)
  }
 }
}
function render(){renderProjects();renderRecommendations()}
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
   const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="researchlens-questions.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
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
 window.addEventListener("storage",e=>{
   if(e.key===PROJECTS){projects=(Array.isArray(read(PROJECTS,[]))?read(PROJECTS,[]):[]).map(R.cleanProject).filter(Boolean);render()}
   if(e.key===META){settings=read(META,{interests:[],authors:[]});drawSettings();renderRecommendations()}
 });
 fetch("./data/feed.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(j=>{feed=Array.isArray(j.papers)?j.papers:[];message($("research-rec-status"),
    "Scored "+feed.length+" locally indexed arXiv records. This is lexical matching, not a novelty assessment.");renderRecommendations()})
  .catch(()=>message($("research-rec-status"),"Feed unavailable. Saved questions remain on this device."));
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startup);else startup();
})();