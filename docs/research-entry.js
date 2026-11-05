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
 const legacyView=new URLSearchParams(location.search).get("view");
 if(legacyHash||legacyView==="scholarly"||legacyView==="arxiv"||legacyView==="discover"){
  const next=new URL("./discover.html",location.href);
  next.search=current.search;next.hash=current.hash||"#discover";
  location.replace(next.href);
  return;
 }
 const F=window.ResearchLensFields;
 const form=document.getElementById("axiovo-entry-form");
 if(!form||!F)return;
 const field=document.getElementById("axiovo-entry-field");
 const topic=document.getElementById("axiovo-entry-topic");
 const subtopic=document.getElementById("axiovo-entry-subtopic");
 const browse=document.getElementById("axiovo-entry-all");
 const library=document.getElementById("axiovo-entry-library");
 function read(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}}
 let prefs=read();
 for(const [key,spec] of Object.entries(F.FIELDS)){
  const o=document.createElement("option");o.value=key;o.textContent=spec.name;field.append(o);
 }
 function options(select,arr,defaultName){
  select.replaceChildren();
  const first=document.createElement("option");first.value="";first.textContent=defaultName;select.append(first);
  for(const item of arr){const o=document.createElement("option");o.value=item;o.textContent=item;select.append(o)}
 }
 function fillTopics(want){
  const topics=F.FIELDS[field.value]?.topics||[];
  options(topic,topics,"All areas");
  if(want&&topics.includes(want))topic.value=want;
  fillSubtopics();
 }
 function fillSubtopics(want){
  const terms=topic.value?F.fieldTopics(field.value,topic.value):[];
  options(subtopic,terms,"All subtopics");
  subtopic.disabled=!terms.length;
  if(want&&terms.includes(want))subtopic.value=want;
 }
 field.value=F.fieldKey(prefs.field);
 fillTopics(prefs.areaSelected?prefs.topic:"");
 fillSubtopics(prefs.subtopic);
 field.addEventListener("change",()=>fillTopics(""));
 topic.addEventListener("change",()=>fillSubtopics(""));
 function saveState(reset=false){
  const chosen=reset?"general":field.value;
  const chosenTopic=reset?"":topic.value;
  const chosenSub=reset?"":subtopic.value;
  const spec=F.FIELDS[chosen];
  const chosenArea=chosenTopic||spec.topics[0];
  const next={...read(),field:chosen,topic:chosenArea,subtopic:chosenSub,
    areaSelected:Boolean(chosenTopic),query:chosenSub||chosenTopic||"",
    customSubtopic:false};
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