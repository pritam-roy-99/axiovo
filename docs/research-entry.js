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
 if(oldHash||search||legacyView||explicitArchive){
   const target=new URL("./discover.html",url);
   target.search=url.search;
   if(legacyView==="biorxiv")target.searchParams.set("archive","biorxiv");
   else if(legacyView==="arxiv")target.searchParams.set("archive","arxiv");
   if(search&&!legacyView&&!explicitArchive)target.searchParams.set("view","scholarly");
   target.hash=url.hash||"#discover";
   location.replace(target.href);
   return;
 }
 const videoSlot=document.getElementById("axiovo-entry-demo-slot");
 const existingVideo=document.querySelector(".hero .rl-home-demo");
 if(videoSlot&&existingVideo)videoSlot.append(existingVideo);
}
if(document.readyState==="complete")enter();
else document.addEventListener("DOMContentLoaded",enter,{once:true});
})();