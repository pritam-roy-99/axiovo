/* Three archive-first Discover pathways. OpenAlex is an optional
 * cross-source research tool, never presented as a fourth preprint server.
 * The archive choice is URL-addressable and survives navigation.
 */
(function(){
"use strict";
function init(){
 if(document.body.classList.contains("axiovo-home"))return;
 const panels={arxiv:document.getElementById("arxiv-discovery"),
   biorxiv:document.getElementById("biorxiv-discovery"),
   chemrxiv:document.getElementById("chemrxiv-discovery"),
   scholarly:document.getElementById("scholarly-discovery")};
 const buttons={arxiv:document.getElementById("rl-source-arxiv"),
  biorxiv:document.getElementById("rl-source-biorxiv"),
  chemrxiv:document.getElementById("rl-source-chemrxiv")};
 const wider=document.getElementById("rl-source-scholarly");
 const indicator=document.getElementById("axiovo-archive-indicator");
 if(Object.values(panels).some(x=>!x)||Object.values(buttons).some(x=>!x))return;
 let activeArchive="arxiv",isWide=false,scholarlyStarted=false;
 const valid=name=>Object.hasOwn(buttons,name)?name:"arxiv";
 function show(archive,wide=false,updateUrl=true){
  activeArchive=valid(archive);isWide=Boolean(wide);
  for(const [name,panel] of Object.entries(panels)){
   panel.hidden=(isWide?name!=="scholarly":name!==activeArchive);
  }
  for(const [name,button] of Object.entries(buttons))
    button.setAttribute("aria-pressed",String(name===activeArchive));
  if(wider)wider.setAttribute("aria-pressed",String(isWide));
  if(indicator)indicator.textContent=isWide?
    "Wider literature search uses OpenAlex metadata, not a preprint archive. Return to "+activeArchive+" using its source tab.":
    "Browsing "+({arxiv:"arXiv",biorxiv:"bioRxiv",chemrxiv:"ChemRxiv"}[activeArchive])+". Refine field → research area → subtopic. Source metadata coverage may be partial.";
  if(isWide&&!scholarlyStarted){scholarlyStarted=true;window.dispatchEvent(new Event("axiovo:scholarly-open"))}
  if(updateUrl){
    const url=new URL(location.href);
    url.searchParams.set("archive",activeArchive);
    if(isWide)url.searchParams.set("view","scholarly");else url.searchParams.delete("view");
    window.history.replaceState({archive:activeArchive,wider:isWide},"",url.pathname+url.search+"#discover");
    window.dispatchEvent(new Event("axiovo:navigate"));
  }
  window.dispatchEvent(new CustomEvent("axiovo:archive-changed",{detail:{archive:activeArchive,wider:isWide}}));
 }
 for(const [name,button] of Object.entries(buttons))button.addEventListener("click",()=>show(name));
 wider?.addEventListener("click",()=>show(activeArchive,true));
 window.addEventListener("popstate",()=>{
  const p=new URLSearchParams(location.search);
  const source=valid(p.get("archive")||(p.get("view")==="biorxiv"?"biorxiv":"arxiv"));
  show(source,p.get("view")==="scholarly",false);
 });
 window.addEventListener("axiovo:focus-change",event=>{
  const data=event.detail||{};
  const desired=data.areaSelected?(data.subtopic||data.topic||""):"";
  if(!isWide&&activeArchive!=="arxiv"&&desired){
   const el=document.getElementById(activeArchive==="biorxiv"?"axiovo-biorxiv-query":"axiovo-chemrxiv-query");
   if(el){el.value=desired;el.dispatchEvent(new Event("input",{bubbles:true}))}
  }
  // Crucially, changing a field never switches archives or opens OpenAlex.
 });
 const p=new URLSearchParams(location.search);
 const initial=p.get("archive")||(p.get("view")==="biorxiv"?"biorxiv":"arxiv");
 show(initial,p.get("view")==="scholarly",false);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();