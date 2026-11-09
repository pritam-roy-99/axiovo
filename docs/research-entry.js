/* Homepage routing preserves existing bookmarks without loading legacy UI. */
(function(){
"use strict";
function route(){
 const url=new URL(location.href);
 if(!url.pathname.endsWith("/")&&!url.pathname.endsWith("/index.html"))return;
 const params=url.searchParams;
 const archive=(params.get("archive")||params.get("view")||"").toLowerCase();
 const native={"arxiv":"arxiv.html","biorxiv":"biorxiv.html","chemrxiv":"chemrxiv.html","eprint":"crypto.html","crypto":"crypto.html"};
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
  // The records manifest is a derived historical index and can lag behind
  // the canonical daily announcement snapshot. Read the source of truth first.
  const response=await fetch("./data/announcements.json",{cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error("HTTP "+response.status);
  const snapshot=await response.json();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(snapshot.announcement_date||""))||
     !Array.isArray(snapshot.papers))throw Error("Invalid official announcement snapshot");
  const batch={date:snapshot.announcement_date,count:snapshot.papers.length,
   complete:snapshot.complete===true,checked_at:snapshot.checked_at,
   early_release:snapshot.early_release===true};
  const updated=batch.checked_at||"";
  const checked=updated?new Date(updated):null;
  const last=checked&&!Number.isNaN(checked.valueOf())?checked.toLocaleString():"not supplied";
  target.textContent="Announcement "+batch.date+" · "+batch.count.toLocaleString()+
   " indexed records · "+(batch.complete?"all archive feeds verified":batch.early_release?"early official catch-up, provisional":"partial archive coverage")+
   " · last source check: "+last+".";
 }catch{
  target.textContent="Open the latest announcement to see its date, source records and coverage.";
 }
}
async function renderTutorialChapters(){
 const list=document.querySelector(".rl-home-transcript ol");
 const video=document.querySelector(".rd-tour video");
 if(!list||!video)return;
 try{
  const res=await fetch("./assets/axiovo-tour-build.json",{cache:"no-cache",signal:AbortSignal.timeout(12000)});
  if(!res.ok)return;
  const data=await res.json();
  if(!Array.isArray(data.chapters)||!data.chapters.length)return;
  list.replaceChildren();
  for(const chapter of data.chapters){
   if(!Number.isFinite(chapter.start_seconds)||typeof chapter.title!=="string")continue;
   const li=document.createElement("li"),button=document.createElement("button");
   button.type="button";button.className="rd-text-link";
   button.textContent=chapter.title+" · "+(chapter.instruction||"");
   button.onclick=()=>{
    video.currentTime=chapter.start_seconds;
    video.scrollIntoView({block:"center",behavior:"smooth"});
    video.play().catch(()=>{});
   };
   li.append(button);list.append(li);
  }
  const voices=document.getElementById("axiovo-tour-voice");
  if(voices&&Array.isArray(data.voices)){
   voices.textContent="Narration: "+data.voices.join(", ")+". "+data.chapters.length+" guided chapters.";
  }
 }catch{}
}
function init(){
 route();
 checkAnnouncement();
 renderTutorialChapters();
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
