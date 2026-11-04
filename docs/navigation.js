/* One predictable Axiovo navigation with four main destinations.
 * Research Tools and local identity moved under More, not removed.
 */
(function(){
 "use strict";
 const MAIN=[["./#discover","Discover"],["./#workspace","Library"],["./copilot.html","Research AI"],["./community.html","Community"]];
 function route(){const path=location.pathname.split("/").pop()||"index.html";
  if(path==="index.html")return location.hash==="#workspace"||location.hash==="#library"?"./#workspace":"./#discover";
  return "./"+path;
 }
 function link(href,label,active){
  const a=document.createElement("a");a.href=href;a.textContent=label;
  if(active)a.setAttribute("aria-current","page");
  return a;
 }
 function mount(){
  const header=document.querySelector("header");if(!header)return;
  if(!document.querySelector('link[href="./axiovo-ux.css"]')){
   const css=document.createElement("link");css.rel="stylesheet";css.href="./axiovo-ux.css";document.head.append(css);
  }
  const theme=header.querySelector(".theme-toggle");
  const logo=link("./","Axiovo",false);logo.className="rl-logo";logo.setAttribute("aria-label","Axiovo home");
  const mark=document.createElement("span");mark.className="rl-logo-mark";mark.textContent="A";
  logo.replaceChildren(mark,document.createTextNode(" Axiovo"));
  const nav=document.createElement("nav");nav.className="rl-nav";nav.setAttribute("aria-label","Main navigation");
  const mobile=document.createElement("nav");mobile.className="axiovo-mobile-nav";mobile.setAttribute("aria-label","Mobile navigation");
  function refresh(){
   const selected=route();
   for(const item of [...nav.querySelectorAll("a"),...mobile.querySelectorAll("a")]){
    const href=item.getAttribute("href");
    if(href===selected)item.setAttribute("aria-current","page");
    else item.removeAttribute("aria-current");
   }
  }
  for(const [href,label] of MAIN){nav.append(link(href,label,false));mobile.append(link(href,label,false))}
  const more=document.createElement("details");more.className="axiovo-more";
  const summary=document.createElement("summary");summary.textContent="More";summary.setAttribute("aria-label","More tools and settings");
  const menu=document.createElement("div");menu.className="axiovo-more-menu";
  menu.append(link("./lab.html","PDF & research tools",false),link("./profiles.html","Settings & local profile",false),
    link("./methodology.html","Coverage & methodology",false));
  more.append(summary,menu);nav.append(more);
  const utilities=document.createElement("div");utilities.className="axiovo-header-utilities";
  const settings=link("./profiles.html","Settings",false);settings.className="axiovo-settings-link";
  utilities.append(settings);if(theme)utilities.append(theme);
  header.classList.add("rl-global-header");
  header.replaceChildren(logo,nav,utilities);
  if(!document.querySelector(".axiovo-mobile-nav"))document.body.append(mobile);
  if(!document.querySelector(".axiovo-credit")){
   const footer=document.createElement("footer");footer.className="axiovo-credit";
   const text=document.createElement("span");
   text.textContent="Developed with ChatGPT by OpenAI ❤️ · Independent open-source project";
   footer.append(text);
   const source=link("https://github.com/pritam-roy-99/researchlens","View source",false);
   source.rel="noopener noreferrer";footer.append(source);
   document.body.append(footer);
  }
  refresh();
  window.addEventListener("hashchange",refresh);
  window.addEventListener("popstate",refresh);
  window.addEventListener("axiovo:view-change",refresh);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);
 else mount();
})();
