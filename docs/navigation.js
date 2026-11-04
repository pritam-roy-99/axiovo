/* One navigation language across Axiovo; local profile remains under Settings. */
(function(){
 function mount(){
  const header=document.querySelector("header");if(!header)return;
  const toggle=header.querySelector(".theme-toggle");
  const logo=document.createElement("a");logo.className="rl-logo";logo.href="./";logo.setAttribute("aria-label","Axiovo home");
  const mark=document.createElement("span");mark.className="rl-logo-mark";mark.textContent="A";
  logo.append(mark,document.createTextNode(" Axiovo"));
  const nav=document.createElement("nav");nav.className="rl-nav";nav.setAttribute("aria-label","Main navigation");
  const links=[["./#discover","Discover"],["./#workspace","Library"],["./copilot.html","Research AI"]];
  const file=location.pathname.split("/").pop()||"index.html";
  for(const [href,label] of links){
   const a=document.createElement("a");a.href=href;a.textContent=label;
   const target=href.startsWith("./#")?"index.html":href.slice(2);
   if(file===target&&(!href.includes("#")||location.hash===href.slice(2)))a.setAttribute("aria-current","page");
   nav.append(a);
  }
  const settings=document.createElement("a");settings.href="./profiles.html";settings.className="rl-settings-link";
  settings.textContent="Settings";settings.setAttribute("aria-label","Researcher settings and account options");
  if(file==="profiles.html")settings.setAttribute("aria-current","page");
  header.classList.add("rl-global-header");header.replaceChildren(logo,nav,settings);
  if(toggle)header.append(toggle);
  const footer=document.createElement("div");footer.className="axiovo-credit";
  const stamp=document.createElement("span");stamp.textContent="Built with ChatGPT by OpenAI ❤️";
  const attribution=document.createElement("span");
  attribution.textContent="Independent open-source project; not an official OpenAI product.";
  const methods=document.createElement("a");methods.href="./methodology.html";methods.textContent="Methods & limitations";
  const privacy=document.createElement("a");privacy.href="./privacy.html";privacy.textContent="Privacy & device data";
  footer.append(stamp,attribution,methods,privacy);
  if(!document.querySelector(".axiovo-credit"))document.body.append(footer);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);
 else mount();
})();
