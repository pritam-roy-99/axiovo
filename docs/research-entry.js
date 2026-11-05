/* Lightweight entry flow. Full arXiv/bioRxiv/library tools live on discover.html.
 * Browser-local research interests retain their existing storage key.
 */
(function(){
"use strict";
const KEY="researchlens-field-explorer-v1";
function enter(){
 const current=new URL(location.href);
 const isHome=location.pathname.endsWith("/")||location.pathname.endsWith("/index.html");
 if(!isHome)return;
 const legacyHash=["#discover","#workspace","#library"].includes(current.hash);
 const params=new URLSearchParams(location.search);
 const legacyView=params.get("view");
 const carriesSearch=["q","query","from","to","sort","author","date"].some(key=>params.has(key));
 if(legacyHash||carriesSearch||["scholarly","arxiv","discover","biorxiv"].includes(legacyView)){
  const next=new URL("./discover.html",location.href);
  next.search=current.search;
  if(carriesSearch&&!legacyView&&!params.has("id"))next.searchParams.set("view","scholarly");
  next.hash=current.hash||"#discover";
  location.replace(next.href);
  return;
 }
 const F=window.ResearchLensFields;
 const form=document.getElementById("axiovo-entry-form");
 if(!form||!F)return;
 const field=document.getElementById("axiovo-entry-field");
 const browse=document.getElementById("axiovo-entry-all");
 const library=document.getElementById("axiovo-entry-library");
 function read(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch{return {}}}
 const prefs=read();
 for(const [key,spec] of Object.entries(F.FIELDS)){
  const o=document.createElement("option");o.value=key;o.textContent=spec.name;field.append(o);
 }
 field.value=F.fieldKey(prefs.field);
 function saveState(reset=false){
  const chosen=reset?"general":field.value;
  const spec=F.FIELDS[chosen];
  if(!spec)return;
  const old=read();
  // Keep a previous subfield only when the researcher keeps the same broad field.
  // If the field changes, open Discover with "all areas" rather than
  // silently filtering the selected discipline by an unrelated old topic.
  const retain=!reset&&old.field===chosen;
  const topic=retain&&spec.topics.includes(old.topic)?old.topic:spec.topics[0];
  const next={...old,field:chosen,topic,
   subtopic:retain?(old.subtopic||""):"",
   areaSelected:retain?Boolean(old.areaSelected):false,
   query:retain&&old.areaSelected?(old.subtopic||old.topic||""):"",
   customSubtopic:retain&&Boolean(old.customSubtopic)};
  try{localStorage.setItem(KEY,JSON.stringify(next))}catch{}
 }
 function go(hash,reset=false){
  saveState(reset);
  location.assign(new URL("./discover.html"+hash,location.href).href);
 }
 form.addEventListener("submit",e=>{e.preventDefault();go("#discover")});
 browse.addEventListener("click",()=>go("#discover",true));
 library.addEventListener("click",()=>{location.assign(new URL("./discover.html#workspace",location.href).href)});
 const videoSlot=document.getElementById("axiovo-entry-demo-slot");
 const existingVideo=document.querySelector(".hero .rl-home-demo");
 if(videoSlot&&existingVideo)videoSlot.append(existingVideo);
}
// Defer scripts execute while readyState can be "interactive"; wait for all
// dependent defer scripts (including research-fields.js) before initializing.
if(document.readyState==="complete")enter();
else document.addEventListener("DOMContentLoaded",enter,{once:true});
})();