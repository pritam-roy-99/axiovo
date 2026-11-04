/* Unified Discover mode selection, preserving deep links and existing arXiv state. */
(function(){
"use strict";
function init(){
 const arxiv=document.getElementById("arxiv-discovery");
 const scholar=document.getElementById("scholarly-discovery");
 const biology=document.getElementById("biorxiv-discovery"),c=document.getElementById("rl-source-biorxiv");
 const a=document.getElementById("rl-source-arxiv");
 const b=document.getElementById("rl-source-scholarly");
 if(!arxiv||!scholar||!a||!b)return;
 let started=false;
 function show(mode,updateUrl=true){
  const wider=mode==="scholarly",bio=mode==="biorxiv";
  arxiv.hidden=wider||bio;
  scholar.hidden=!wider;
  if(biology)biology.hidden=!bio;
  a.setAttribute("aria-pressed",String(!wider&&!bio));
  if(c)c.setAttribute("aria-pressed",String(bio));
  b.setAttribute("aria-pressed",String(wider));
  if(wider&&!started){started=true;window.dispatchEvent(new Event("researchlens:scholarly-open"))}
  if(updateUrl){
   const u=new URL(location.href);
   if(wider)u.searchParams.set("view","scholarly");
   else if(bio)u.searchParams.set("view","biorxiv");
   else u.searchParams.delete("view");
   window.history.replaceState({source:bio?"biorxiv":wider?"scholarly":"arxiv"},"",u.pathname+u.search+"#discover");
   window.dispatchEvent(new Event("axiovo:navigate"));
  }
 }
 window.addEventListener("researchlens:focus-change",e=>{
  const detail=e.detail||{};
  // A chosen field/topic/subtopic searches all arXiv-hosted literature
  // instead of restricting the researcher to the limited latest JSON feed.
  if(detail.reason!=="external")show("scholarly");
 });
 a.addEventListener("click",()=>show("arxiv"));
 b.addEventListener("click",()=>show("scholarly"));
 c?.addEventListener("click",()=>show("biorxiv"));
 window.addEventListener("popstate",()=>{const mode=new URLSearchParams(location.search).get("view");show(mode==="scholarly"||mode==="biorxiv"?mode:"arxiv",false)});
 const params=new URLSearchParams(location.search);
 let primary="general";try{primary=JSON.parse(localStorage.getItem("researchlens-field-explorer-v1")||"{}").field||"general"}catch{}
 function updateFieldLabel(){
  let field="general";try{field=JSON.parse(localStorage.getItem("researchlens-field-explorer-v1")||"{}").field||"general"}catch{}
  const config=window.ResearchLensFields;
  const name=config?.FIELDS?.[field]?.name||"your field";
  if(b.firstChild?.nodeType===Node.TEXT_NODE)b.firstChild.textContent="Explore "+name+" ";
 }
 window.addEventListener("researchlens:field-changed",updateFieldLabel);
 window.addEventListener("researchlens:choose-field",updateFieldLabel);
 updateFieldLabel();
 const requested=params.get("view");
 show(requested==="biorxiv"?"biorxiv":requested==="scholarly"||(!requested&&primary!=="general")?"scholarly":"arxiv",false);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
