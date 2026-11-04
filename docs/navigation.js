/* Unified top-level navigation for the static Axiovo pages. */
(function(){
 function mount(){
  const header=document.querySelector("header");if(!header)return;
  const toggle=header.querySelector(".theme-toggle");
  const logo=document.createElement("a");logo.className="rl-logo";logo.href="./";logo.setAttribute("aria-label","Axiovo home");
  const mark=document.createElement("span");mark.className="rl-logo-mark";mark.textContent="A";logo.append(mark,document.createTextNode(" Axiovo"));
  const nav=document.createElement("nav");nav.className="rl-nav";nav.setAttribute("aria-label","Axiovo navigation");
  const links=[["./#discover","Discover"],["./#workspace","Workspace"],["./lab.html","Research tools"],["./copilot.html","Research Assistant"],["./profiles.html","Profile"]];
  const path=location.pathname.split("/").pop()||"index.html";
  for(const [href,label] of links){const a=document.createElement("a");a.href=href;a.textContent=label;const p=href.startsWith("./#")?"index.html":href==="./"?"index.html":href.slice(2);if(path===p&&(!href.includes("#")||location.hash===href.slice(2)))a.setAttribute("aria-current","page");nav.append(a)}
  header.classList.add("rl-global-header");header.replaceChildren(logo,nav);if(toggle)header.append(toggle);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();
