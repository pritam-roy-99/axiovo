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
  location.replace(target.href);
  return;
 }
 if(url.hash==="#discover"){
  location.replace(new URL("./#axiovo-archive-title",url).href);
  return;
 }
 if(url.hash==="#workspace"||url.hash==="#library"){
  location.replace(new URL("./discover.html#workspace",url).href);
  return;
 }
 const globalSearch=["q","query","from","to","sort","author","date"].some(k=>params.has(k));
 if(globalSearch||params.get("view")==="scholarly"){
  const target=new URL("./discover.html",url);
  target.search=url.search;
  target.searchParams.set("view","scholarly");
  target.hash="#discover";
  location.replace(target.href);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",route,{once:true});
else route();
})();
