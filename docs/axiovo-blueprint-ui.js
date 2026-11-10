/* Reference layout. Keeps all application controls, data and event handlers intact. */
(function(){
 "use strict";
 if(window.__axiovoBlueprintUI)return;window.__axiovoBlueprintUI=true;
 const header=document.querySelector("header.rl-global-header");if(!header)return;
 const nav=header.querySelector(".rl-nav");if(!nav)return;
 document.body.classList.add("axiovo-reference-ui");
 const file=location.pathname.split("/").pop()||"index.html";
 const archives=["arxiv.html","biorxiv.html","chemrxiv.html","crypto.html"];
 const current=archives.includes(file)||file==="index.html"?"Explore":file==="desk.html"?"Research Desk":file==="feed.html"?"My Feed":file==="workspace.html"?"Library":file==="copilot.html"||file==="prooflab.html"?"Research Assistant":"";
 const icons=["⌕","▥","≋","▤","✦"];
 [...nav.querySelectorAll("a")].forEach((a,i)=>{
  a.dataset.axIcon=String(i);
  if(a.textContent.trim()===current)a.setAttribute("aria-current","page");
  else a.removeAttribute("aria-current");
 });
 const sidebar=document.createElement("aside");
 sidebar.className="ax-sidebar";
 sidebar.setAttribute("aria-label","Research workspace");
 sidebar.innerHTML=[
  '<a class="ax-sidebar-logo" href="./index.html"><img src="./icons/axiovo-brand.svg" width="56" height="56" alt=""> <strong>axiovo</strong></a>',
  '<div class="ax-sidebar-eyebrow">RESEARCH WORKSPACE</div>',
  '<div class="ax-sidebar-extra"><a href="./lab.html">⚗ <span>Research Tools</span></a><a href="./prooflab.html">◈ <span>ProofLab</span></a><a href="./community.html">♧ <span>Community</span></a><a href="./install.html">↓ <span>Install Axiovo</span></a></div>',
  '<div class="ax-sidebar-bottom"><a href="./profiles.html">⚙ <span>Settings</span></a><button type="button" class="ax-sidebar-night">☾ <span>Night</span></button><small>Source-first, free and open</small></div>'
 ].join("");
 header.before(sidebar);
 sidebar.querySelector(".ax-sidebar-night").addEventListener("click",()=>{
   const toggle=header.querySelector(".theme-toggle");
   if(toggle)toggle.click();else if(window.AxiovoAppearance)window.AxiovoAppearance.setTheme(window.AxiovoAppearance.getTheme()==="dark"?"light":"dark");
 });
 const homepage=document.createElement("a");homepage.className="ax-header-home";homepage.href="./index.html";homepage.textContent="⌂ Home";
 header.insertBefore(homepage,nav);
 const status=document.createElement("a");status.className="ax-header-status";status.href="./methodology.html#axiovo-source-health";status.textContent="● Source status";
 const search=document.createElement("a");search.className="ax-header-search";search.href="./desk.html";search.textContent="⌕ Search all papers";
 const appearance=header.querySelector(".axiovo-header-appearance");
 if(appearance){header.insertBefore(status,appearance);header.insertBefore(search,appearance);}
 const menu=document.createElement("details");menu.className="ax-mobile-menu";
 menu.innerHTML=['<summary aria-label="More pages">☰</summary><div class="ax-menu-panel">',
 '<a href="./index.html">Home</a><a href="./lab.html">Research Tools</a><a href="./prooflab.html">ProofLab</a>',
 '<a href="./research-hub.html">Research Hub</a><a href="./community.html">Community</a>',
 '<a href="./profiles.html">Settings and appearance</a><button type="button" class="ax-menu-theme">☾ Toggle day / night</button><a href="./install.html">Install Axiovo</a>',
 '<a href="./tutorial.html">Tutorial</a><a href="./methodology.html">Source methodology</a></div>'].join("");
 header.append(menu);
 menu.querySelector(".ax-menu-theme").addEventListener("click",()=>{const toggle=header.querySelector(".theme-toggle");if(toggle)toggle.click();menu.open=false;});
 document.addEventListener("click",event=>{if(!menu.contains(event.target))menu.open=false;});
 document.addEventListener("keydown",event=>{if(event.key==="Escape")menu.open=false;});
 if(document.body.classList.contains("axiovo-home")){
  const searchContainer=document.querySelector(".axiovo-welcome-copy");
  const before=searchContainer?.querySelector(".axiovo-name-line");
  if(before){
   const form=document.createElement("form");
   form.className="ax-home-search";form.method="get";form.action="./desk.html";form.role="search";
   form.innerHTML='<span aria-hidden="true">⌕</span><label class="rd-sr-only" for="ax-home-query">Search research papers</label><input id="ax-home-query" name="q" type="search" maxlength="220" placeholder="Paper title, author, DOI, arXiv ID, or research question"><button type="submit">Search</button>';
   before.before(form);
  }
  const video=document.querySelector("#axiovo-home-video");
  if(video){
   const guide=document.createElement("aside");guide.className="ax-home-guide";
   guide.innerHTML=['<h3>▤ Start here</h3><ol>',
   '<li><b>1</b><div><strong>Search & discover</strong><span>Find relevant papers across major archives.</span></div></li>',
   '<li><b>2</b><div><strong>Explore & verify</strong><span>Inspect source links and read the evidence.</span></div></li>',
   '<li><b>3</b><div><strong>Organize & follow</strong><span>Save, curate, and keep up with new work.</span></div></li>',
   '</ol><a href="./tutorial.html">Watch walkthrough →</a>'].join("");
   video.after(guide);
  }
 }
 const mobileRobot=document.createElement("style");
 mobileRobot.textContent="@media(max-width:760px){body #axiovo-robot{bottom:calc(83px + env(safe-area-inset-bottom,0px))!important}body #axiovo-robot .robot-panel{bottom:calc(154px + env(safe-area-inset-bottom,0px))!important;height:min(500px,calc(100dvh - 169px))!important}}";
 document.head.append(mobileRobot);
})();