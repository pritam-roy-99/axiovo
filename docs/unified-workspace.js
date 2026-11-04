/* Axiovo unified Discover and Library. Preserve URL search parameters and local data. */
(function(){
 "use strict";
 const discover=document.getElementById("discover-shell");
 const library=document.getElementById("workspace-panel");
 const discoverTab=document.getElementById("workflow-discover");
 const libraryTab=document.getElementById("workflow-workspace");
 if(!discover||!library)return;
 let promise=null,serial=0;
 const libraryRoute=()=>location.hash==="#workspace"||location.hash==="#library";
 const load=url=>new Promise((resolve,reject)=>{
  const s=document.createElement("script");s.src=url;
  s.onload=resolve;s.onerror=()=>reject(new Error("Unable to load "+url));document.body.append(s);
 });
 function mount(){
  if(promise)return promise;
  promise=(async()=>{
   const r=await fetch("./workspace.html",{cache:"no-store"});
   if(!r.ok)throw Error("Library view unavailable: HTTP "+r.status);
   const doc=new DOMParser().parseFromString(await r.text(),"text/html");
   const main=doc.querySelector("main.rl-workspace");
   if(!main)throw Error("Missing Library content");
   library.replaceChildren(...main.children);
   await load("./relevance.js");
   await load("./workspace.js");
   await load("./research-intelligence.js");
  })().catch(error=>{
   promise=null;
   const message=document.createElement("p");message.setAttribute("role","alert");
   message.textContent=error.message+". Use the standalone Library as a fallback.";
   const a=document.createElement("a");a.href="./workspace.html?standalone=1";a.textContent="Open standalone Library";
   library.replaceChildren(message,a);
  });
  return promise;
 }
 async function render(){
  const token=++serial,showLibrary=libraryRoute();
  discover.hidden=showLibrary;library.hidden=!showLibrary;
  for(const [control,selected] of [[discoverTab,!showLibrary],[libraryTab,showLibrary]]){
   if(!control)continue;
   if(selected)control.setAttribute("aria-current","page");
   else control.removeAttribute("aria-current");
  }
  window.dispatchEvent(new Event("axiovo:view-change"));
  if(showLibrary)await mount();
  if(token!==serial)return;
  if(showLibrary){
   window.dispatchEvent(new Event("researchlens:workspace-activated"));
   window.scrollTo(0,0);
  }else if(location.hash==="#discover"){
   document.getElementById("discover")?.scrollIntoView({block:"start"});
  }
 }
 document.addEventListener("click",event=>{
  const a=event.target.closest?.("a[href]");
  if(!a||event.defaultPrevented||event.button!==0||event.metaKey||
     event.ctrlKey||event.shiftKey||event.altKey||(a.target&&a.target!=="_self"))return;
  const u=new URL(a.href);
  if(u.origin!==location.origin||u.pathname!==location.pathname||!["#discover","#workspace","#library"].includes(u.hash))return;
  // Preserve discovery search filters for ordinary tab switches.
  // Links that explicitly provide their own query parameters still navigate normally.
  if(u.search&&u.search!==location.search)return;
  event.preventDefault();
  const next=new URL(location.href);next.hash=u.hash;
  if(next.href!==location.href)history.pushState({axiovoView:u.hash},"",next);
  render();
 });
 window.addEventListener("hashchange",render);
 window.addEventListener("popstate",render);
 // Discover's history.replaceState does not dispatch hashchange.
 window.addEventListener("researchlens:discover-navigation",render);
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);
 else render();
})();
