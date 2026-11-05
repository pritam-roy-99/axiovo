/* Homepage routing preserves existing bookmarks without loading legacy UI. */
(function(){
"use strict";
function route(){
 const url=new URL(location.href);
 if(!url.pathname.endsWith("/")&&!url.pathname.endsWith("/index.html"))return;
 const params=url.searchParams;
 const archive=(params.get("archive")||params.get("view")||"").toLowerCase();
 const native={"arxiv":"arxiv.html","biorxiv":"biorxiv.html","chemrxiv":"chemrxiv.html"};
 if(native[archive]){
  const target=new URL("./"+native[archive],url);
  target.search=url.search;
  target.searchParams.delete("archive");target.searchParams.delete("view");
  location.replace(target.href);
  return;
 }
 if(url.hash==="#discover"){
  location.replace(new URL("./#axiovo-archive-title",url).href);
  return;
 }
 if(url.hash==="#workspace"||url.hash==="#library"){
  location.replace(new URL("./workspace.html",url).href);
  return;
 }
 const globalSearch=["q","query","from","to","sort","author","date"].some(k=>params.has(k));
 if(globalSearch||params.get("view")==="scholarly"){
  const target=new URL("./arxiv.html",url);
  target.search=url.search;
  target.searchParams.delete("view");
  target.hash="";
  location.replace(target.href);
 }
}
async function checkAnnouncement(){
 const target=document.getElementById("axiovo-release-status");
 if(!target)return;
 try{
  const response=await fetch("./data/announcements.json?fresh="+Date.now(),{cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error("HTTP "+response.status);
  const batch=await response.json();
  if(!Array.isArray(batch.papers)||!batch.announcement_date)throw Error("No verified announcement metadata");
  const updated=batch.checked_at||batch.generated_at||"";
  const checked=updated?new Date(updated):null;
  const last=checked&&!Number.isNaN(checked.valueOf())?checked.toLocaleString():"not supplied";
  target.textContent="Announcement "+batch.announcement_date+" · "+batch.papers.length.toLocaleString()+
   " indexed records · "+(batch.complete?"all archive feeds verified":"partial archive coverage")+
   " · last source check: "+last+".";
 }catch{
  target.textContent="Latest announcement metadata is temporarily unavailable. Browse arXiv or check the official source.";
 }
}
function init(){
 route();
 checkAnnouncement();
 window.setInterval(()=>{if(!document.hidden)checkAnnouncement()},15*60*1000);
 for(const el of document.querySelectorAll("[data-count]")){
  const source=el.dataset.count,topics=window.AxiovoArchiveTaxonomy?.directory(source)||[];
  if(topics.length)el.textContent=topics.length+(source==="arxiv"?" categories":" subject labels");
 }
 const video=document.querySelector(".rd-tour video"),error=document.getElementById("axiovo-video-error");
 if(!video||!error)return;
 const fail=()=>{error.hidden=false};
 video.addEventListener("error",fail);
 video.querySelector("source")?.addEventListener("error",fail);
 video.addEventListener("loadedmetadata",()=>{error.hidden=true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
