/* Unified top-level navigation for the static ResearchLens pages. */
(function(){
 function mount(){
  const header=document.querySelector("header");if(!header)return;
  const toggle=header.querySelector(".theme-toggle");
  const logo=document.createElement("a");logo.className="rl-logo";logo.href="./";logo.setAttribute("aria-label","ResearchLens home");
  const mark=document.createElement("span");mark.className="rl-logo-mark";mark.textContent="R";logo.append(mark,document.createTextNode(" ResearchLens"));
  const nav=document.createElement("nav");nav.className="rl-nav";nav.setAttribute("aria-label","ResearchLens navigation");
  const links=[["./workspace.html","Workspace"],["./","arXiv feed"],["./fields.html","Explore fields"],["./lab.html","Research tools"],["./copilot.html","Copilot"],["./ai.html","AI Lab"],["./profiles.html","Profile"]];
  const path=location.pathname.split("/").pop()||"index.html";
  for(const [href,label] of links){const a=document.createElement("a");a.href=href;a.textContent=label;const p=href==="./"?"index.html":href.slice(2);if(path===p)a.setAttribute("aria-current","page");nav.append(a)}
  header.classList.add("rl-global-header");header.replaceChildren(logo,nav);if(toggle)header.append(toggle);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();
