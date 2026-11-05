/* Axiovo: one Discover ↔ Library workflow, with revision-safe navigation.
 * Fetches the legacy Workspace markup without changing existing browser data.
 */
(function(){
 "use strict";
 const discover=document.getElementById("discover-shell");
 const workspace=document.getElementById("workspace-panel");
 const discoverTab=document.getElementById("workflow-discover");
 const workspaceTab=document.getElementById("workflow-workspace");
 if(!discover||!workspace)return;
 let mountPromise=null,renderVersion=0;
 function loadScript(src){
  return new Promise((resolve,reject)=>{
   const s=document.createElement("script");s.src=src;s.onload=resolve;
   s.onerror=()=>reject(new Error("Unable to load "+src));document.body.append(s);
  });
 }
 function mount(){
  if(mountPromise)return mountPromise;
  mountPromise=(async()=>{
   const response=await fetch("./workspace.html",{cache:"no-store"});
   if(!response.ok)throw Error("Workspace unavailable (HTTP "+response.status+")");
   const doc=new DOMParser().parseFromString(await response.text(),"text/html");
   const main=doc.querySelector("main.rl-workspace");
   if(!main)throw Error("Workspace content missing");
   workspace.replaceChildren(...Array.from(main.children));
   await loadScript("./relevance.js");
   await loadScript("./workspace.js");
   await loadScript("./research-intelligence.js");
  })().catch(err=>{
   mountPromise=null;workspace.replaceChildren();
   const p=document.createElement("p");p.setAttribute("role","alert");p.textContent=String(err.message||err);
   const a=document.createElement("a");a.href="./workspace.html?standalone=1";a.textContent="Open standalone library";
   workspace.append(p,a);
  });
  return mountPromise;
 }
 const onLibrary=()=>location.hash==="#workspace"||location.hash==="#library";
 function highlight(tab,on){
  if(!tab)return;
  if(on)tab.setAttribute("aria-current","page");
  else tab.removeAttribute("aria-current");
 }
 async function render(){
  const version=++renderVersion,showLibrary=onLibrary();
  discover.hidden=showLibrary;workspace.hidden=!showLibrary;
  highlight(discoverTab,!showLibrary);highlight(workspaceTab,showLibrary);
  document.querySelectorAll(".rl-nav a").forEach(link=>{
   if(link.hash==="#workspace")highlight(link,showLibrary);
   if(link.hash==="#discover")highlight(link,!showLibrary);
  });
  if(showLibrary)await mount();
  if(version!==renderVersion)return;
  if(showLibrary)window.dispatchEvent(new Event("axiovo:workspace-activated"));
  if(showLibrary)window.scrollTo(0,0);
 }
 // Keep view switching on the same page, retaining the active search filters.
 document.addEventListener("click",event=>{
  const anchor=event.target.closest?.("a[href]");
  if(!anchor||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||
     event.altKey||event.shiftKey||(anchor.target&&anchor.target!=="_self"))return;
  const next=new URL(anchor.href);
  if(next.origin!==location.origin||next.pathname!==location.pathname ||
     !["#discover","#workspace","#library"].includes(next.hash))return;
  if(next.search&&next.search!==location.search)return; // Preserve intentional deep links
  event.preventDefault();
  const current=new URL(location.href);current.hash=next.hash;
  if(current.href!==location.href)history.pushState({}, "", current.href);
  render();
 });
 window.addEventListener("hashchange",render);
 window.addEventListener("popstate",render);
 window.addEventListener("axiovo:navigate",render);
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);
 else render();
})();
