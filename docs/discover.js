/* Unified Discover mode selection, preserving deep links and existing arXiv state. */
(function(){
"use strict";
function init(){
 const arxiv=document.getElementById("arxiv-discovery");
 const scholar=document.getElementById("scholarly-discovery");
 const a=document.getElementById("rl-source-arxiv");
 const b=document.getElementById("rl-source-scholarly");
 if(!arxiv||!scholar||!a||!b)return;
 let started=false;
 function show(mode,updateUrl=true){
  const wider=mode==="scholarly";
  arxiv.hidden=wider;
  scholar.hidden=!wider;
  a.setAttribute("aria-pressed",String(!wider));
  b.setAttribute("aria-pressed",String(wider));
  if(wider&&!started){started=true;window.dispatchEvent(new Event("researchlens:scholarly-open"))}
  if(updateUrl){
   const u=new URL(location.href);
   if(wider)u.searchParams.set("view","scholarly");
   else u.searchParams.delete("view");
   window.history.replaceState({source:wider?"scholarly":"arxiv"},"",u.pathname+u.search+"#discover");
  }
 }
 a.addEventListener("click",()=>show("arxiv"));
 b.addEventListener("click",()=>show("scholarly"));
 window.addEventListener("popstate",()=>show(new URLSearchParams(location.search).get("view")==="scholarly"?"scholarly":"arxiv",false));
 const params=new URLSearchParams(location.search);
 show(params.get("view")==="scholarly"?"scholarly":"arxiv",false);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
