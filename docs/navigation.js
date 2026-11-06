/* One navigation language across Axiovo; local profile remains under Settings. */
(function(){
 function mount(){
  const header=document.querySelector("header");if(!header)return;
  const toggle=header.querySelector(".theme-toggle");
  const logo=document.createElement("a");logo.className="rl-logo";logo.href="./";logo.setAttribute("aria-label","Axiovo home");
  const mark=document.createElement("span");mark.className="rl-logo-mark";mark.textContent="A";
  logo.append(mark,document.createTextNode(" Axiovo"));
  const nav=document.createElement("nav");nav.className="rl-nav";nav.setAttribute("aria-label","Main navigation");
  const file=location.pathname.split("/").pop()||"index.html";
  const archivePage=["arxiv.html","biorxiv.html","chemrxiv.html"].includes(file);
  const links=[
   ["./#axiovo-archive-title","Explore","Browse research subjects and preprint archives"],
   ["./desk.html","Research Desk","Search arXiv, bioRxiv and ChemRxiv together"],
   ["./feed.html","My Feed","New papers from your followed authors and research subtopics"],
   ["./workspace.html","Library","View saved papers, notes and research collections"],
   ["./copilot.html","Research Assistant","Inspect papers and compare source-linked evidence"]
  ];
  for(const [href,label,purpose] of links){
   const a=document.createElement("a");a.href=href;a.textContent=label;a.title=purpose;a.setAttribute("aria-label",label+": "+purpose);
   const target=href.split("#")[0].slice(2);
   if((archivePage&&href.includes("#"))||file===target)a.setAttribute("aria-current","page");
   nav.append(a);
  }
  const settings=document.createElement("a");settings.href="./profiles.html";settings.className="rl-settings-link";
  settings.textContent="Settings";settings.setAttribute("aria-label","Researcher settings and account options");
  if(file==="profiles.html")settings.setAttribute("aria-current","page");
  const appearance=document.createElement("div");
  appearance.className="axiovo-header-appearance";
  appearance.setAttribute("role","group");
  appearance.setAttribute("aria-label","Settings and appearance");
  appearance.append(settings);
  header.classList.add("rl-global-header");
  header.replaceChildren(logo,nav,appearance);
  // Explicit, reliable home/back controls. Back returns to the immediately
  // previous same-origin page; a direct visit falls back to the homepage.
  if(file!=="index.html"){
   const home=document.createElement("a");home.href="./";home.className="axiovo-home-link";
   home.textContent="⌂ Home";home.setAttribute("aria-label","Back to Axiovo homepage");
   const back=document.createElement("button");back.type="button";back.className="axiovo-back-button";
   back.textContent="← Back";back.setAttribute("aria-label","Go to previous page, or Axiovo homepage");
   back.onclick=()=>{
    let sameOrigin=false;
    try{
     const previous=new URL(document.referrer);
     const appBase=new URL("./",location.href);
     sameOrigin=Boolean(document.referrer)&&previous.origin===appBase.origin
      &&previous.pathname.startsWith(appBase.pathname);
    }catch{}
    if(sameOrigin&&history.length>1)history.back();
    else location.assign(new URL("./",location.href).href);
   };
   const actions=document.createElement("div");actions.className="axiovo-nav-return";
   actions.append(back,home);
   header.insertBefore(actions,nav);
  }
  if(toggle)appearance.append(toggle);
  else if(window.AxiovoAppearance){
   const fallback=document.createElement("button");
   fallback.type="button";fallback.className="theme-toggle";
   fallback.addEventListener("click",()=>window.AxiovoAppearance.setTheme(
    window.AxiovoAppearance.getTheme()==="dark"?"light":"dark"));
   appearance.append(fallback);
   window.AxiovoAppearance.setTheme(window.AxiovoAppearance.getTheme());
  }
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
