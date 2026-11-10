/* Axiovo page-level UI specification: page identity only, never research state. */
(function(){
 "use strict";
 if(window.__axiovoPageDesignV4)return;
 window.__axiovoPageDesignV4=true;
 const route=(location.pathname.split("/").pop()||"index.html").replace(/\.html$/,"");
 const table={
  "index":["home","RESEARCH DISCOVERY",null],
  "arxiv":["archive","ARCHIVE EXPLORER","Explore"],
  "biorxiv":["archive","ARCHIVE EXPLORER","Explore"],
  "chemrxiv":["archive","ARCHIVE EXPLORER","Explore"],
  "crypto":["archive","ARCHIVE EXPLORER","Explore"],
  "desk":["desk","CROSS-ARCHIVE DISCOVERY","Research Desk"],
  "feed":["feed","PERSONAL DISCOVERY","My Feed"],
  "workspace":["workspace","YOUR RESEARCH WORKSPACE","Library"],
  "copilot":["assistant","SOURCE-LINKED RESEARCH","Research Assistant"],
  "prooflab":["prooflab","FORMAL RESEARCH WORKSPACE","Research Assistant"],
  "lab":["lab","RESEARCH TOOLS","Research Desk"],
  "paper":["paper","PAPER WORKSPACE","Library"],
  "compare":["compare","EVIDENCE COMPARISON","Research Desk"],
  "community":["community","OPEN RESEARCH DISCUSSION","Library"],
  "profiles":["settings","YOUR PREFERENCES",null],
  "install":["install","INSTALL AXIOVO",null],
  "tutorial":["tutorial","GETTING STARTED",null],
  "methodology":["methodology","SOURCE METHODOLOGY",null],
  "privacy":["privacy","DEVICE DATA & PRIVACY",null],
  "why-axiovo":["why","WHY AXIOVO",null],
  "research-hub":["hub","RESEARCH CONNECTIONS","Library"]
 };
 const config=table[route];
 if(!config)return;
 document.body.classList.add("ax4","ax4-"+config[0]);
 document.documentElement.dataset.ax4Route=route;
 const main=document.querySelector("main");
 if(!main)return;
 const title=main.querySelector("h1");
 if(title && config[1]){
  const container=title.parentElement;
  const prior=title.previousElementSibling;
  if(!prior||(!prior.matches(".rd-kicker,.rl-eyebrow,.ax4-eyebrow") && !prior.querySelector?.(".rd-kicker,.rl-eyebrow"))){
   const label=document.createElement("p");
   label.className="ax4-eyebrow";
   label.textContent=config[1];
   title.before(label);
  }
 }
 const parent=config[2];
 if(parent){
  const nav=document.querySelector("header.rl-global-header .rl-nav");
  if(nav&&!nav.querySelector('[aria-current="page"]')){
   const link=[...nav.querySelectorAll("a")].find(a=>a.textContent.trim()===parent);
   if(link)link.setAttribute("aria-current","page");
  }
 }
 const skip=document.createElement("a");
 skip.href="#axiovo-main-content";
 skip.className="ax4-skip";
 skip.textContent="Skip to content";
 if(!main.id)main.id="axiovo-main-content";
 else skip.href="#"+main.id;
 document.body.prepend(skip);
})();