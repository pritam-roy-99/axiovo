/* Axiovo homepage chooses an archive only.
 * Discipline, research area and subtopic are selected on Discover.
 * Preserve bookmarks, local research data and existing legacy URLs.
 */
(function(){
"use strict";
function enter(){
 const url=new URL(location.href);
 if(!url.pathname.endsWith("/")&&!url.pathname.endsWith("/index.html"))return;
 const params=url.searchParams;
 const legacyView=params.get("view");
 const explicitArchive=params.get("archive");
 const oldHash=["#discover","#workspace","#library"].includes(url.hash);
 const search=["q","query","from","to","sort","author","date"].some(key=>params.has(key));
 if(url.hash==="#workspace"||url.hash==="#library"){
   location.replace(new URL("./discover.html#workspace",url).href);
   return;
 }
 if(oldHash||search||legacyView||explicitArchive){
   const archive=["arxiv","biorxiv","chemrxiv"].includes(explicitArchive)?explicitArchive:
     ["arxiv","biorxiv","chemrxiv"].includes(legacyView)?legacyView:null;
   if(archive){
     const target=new URL("./"+archive+".html",url);
     const q=params.get("q")||params.get("query");
     if(q)target.searchParams.set("q",q);
     location.replace(target.href);
     return;
   }
   // No archive chosen: show all three equal entry choices. Never guess arXiv.
   if(url.hash==="#discover"||url.hash==="#library")history.replaceState({},"",url.pathname);
 }
 const videoSlot=document.getElementById("axiovo-entry-demo-slot");
 const existingVideo=document.querySelector(".hero .rl-home-demo");
 if(videoSlot&&existingVideo)videoSlot.append(existingVideo);
}
if(document.readyState==="complete")enter();
else document.addEventListener("DOMContentLoaded",enter,{once:true});
})();