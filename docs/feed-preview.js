/* Lightweight homepage feed preview: only one official arXiv announcement JSON. */
(function(){
"use strict";
const host=document.getElementById("axiovo-home-feed-preview");
if(!host||!window.AxiovoFeedCore||!window.AxiovoArchiveData)return;
const core=window.AxiovoFeedCore,archive=window.AxiovoArchiveData,follow=window.AxiovoAuthorFollow;
function read(k,otherwise){try{return JSON.parse(localStorage.getItem(k)||"null")??otherwise}catch{return otherwise}}
const preferences=window.AxiovoFeedPreferences?.derive(localStorage);
function paragraph(text){const p=document.createElement("p");p.textContent=text;host.append(p)}
if(!preferences?.directTopics.length&&!preferences?.authors.length&&!preferences?.paths.some(path=>path.source==="arxiv")){
 host.replaceChildren();const box=document.createElement("article");box.className="feed-preview-empty";
 const link=document.createElement("a");link.href="./feed.html";link.textContent="Personalize My Feed →";box.append(link);
 const p=document.createElement("p");p.textContent="Follow an author or research topic to start receiving personalized updates.";box.append(p);host.append(box);return;
}
fetch("./data/announcements.json",{cache:"no-store",signal:AbortSignal.timeout(9000)})
 .then(r=>{if(!r.ok)throw Error("Source unavailable");return r.json()})
 .then(data=>{
  const records=(Array.isArray(data.papers)?data.papers:[]).map(p=>archive.normalize("arxiv",p)).filter(Boolean);
  const ranked=core.build(records,{...preferences,
   matchesAuthor:(a,b)=>follow?.matchesName(a,b)||String(a).toLowerCase()===String(b).toLowerCase()});
  host.replaceChildren();
  if(!ranked.length){const box=document.createElement("article");box.className="feed-preview-empty";
   const a=document.createElement("a");a.href="./feed.html";a.textContent="View My Feed →";box.append(a);
   const p=document.createElement("p");p.textContent="No matching papers in the latest announcement snapshot. My Feed also checks earlier indexed records.";box.append(p);host.append(box);return}
  for(const {paper,reasons} of ranked.slice(0,3)){
   const box=document.createElement("article"),a=document.createElement("a");a.href=paper.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=paper.title;box.append(a);
   const p=document.createElement("p");p.textContent=reasons[0]||"Matches followed research";box.append(p);host.append(box);
  }
 }).catch(()=>{host.replaceChildren();paragraph("Latest source snapshot unavailable. Your saved follows remain on this device.");});
})();
