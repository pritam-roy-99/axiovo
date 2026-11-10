/* One navigation language across Axiovo; local profile remains under Settings. */
(function(){
 const HOME="./index.html?axiovo_return=1";
 // Home is an explicit navigation destination; browser Back remains historical navigation.
 const homeURL=()=>new URL(HOME,location.href).href;
 function mount(){
  const header=document.querySelector("header");if(!header)return;
  const toggle=header.querySelector(".theme-toggle");
  const logo=document.createElement("a");logo.className="rl-logo";logo.href=HOME;logo.setAttribute("aria-label","Axiovo home");
  const mark=document.createElement("span");mark.className="rl-logo-mark";
  const brandImg=document.createElement("img");brandImg.src=new URL("./icons/axiovo-approved.svg",location.href).href;
  brandImg.width=38;brandImg.height=38;brandImg.alt="";brandImg.setAttribute("aria-hidden","true");
  mark.append(brandImg);
  logo.append(mark,document.createTextNode(" Axiovo"));
  const nav=document.createElement("nav");nav.className="rl-nav";nav.setAttribute("aria-label","Main navigation");
  const file=location.pathname.split("/").pop()||"index.html";
  const archivePage=["arxiv.html","biorxiv.html","chemrxiv.html","crypto.html"].includes(file);
  const links=[
   [file==="index.html"?"#axiovo-archive-title":HOME,"Explore","Browse research subjects and preprint archives"],
   ["./desk.html","Research Desk","Search arXiv, bioRxiv, ChemRxiv and Cryptology ePrint together"],
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
   const home=document.createElement("a");home.href=HOME;home.className="axiovo-home-link";
   home.textContent="⌂ Home";home.setAttribute("aria-label","Back to Axiovo homepage");
   const back=document.createElement("button");back.type="button";back.className="axiovo-back-button";
   back.textContent="← Back";back.setAttribute("aria-label","Go to previous page, or Axiovo homepage");
   back.onclick=()=>{
    const entry=window.navigation?.currentEntry;
    // Prefer the actual previous entry. Older browsers can use the referrer
    // for normal link navigation.
    const previous=entry?window.navigation.entries()[entry.index-1]?.url:document.referrer;
    if(previous&&history.length>1){
     const url=new URL(previous),base=new URL("./",location.href);
     if(url.origin===base.origin&&url.pathname.startsWith(base.pathname)){
      history.back();
      return;
     }
    }
    // Direct entry has nowhere in Axiovo to go back to. Replace it so the
    // browser's Back button does not bounce between this page and Home.
    location.replace(homeURL());
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
  const stamp=document.createElement("span");stamp.className="axiovo-chatgpt-credit";stamp.textContent="Built with ChatGPT by OpenAI ❤️";
  const attribution=document.createElement("span");
  attribution.textContent="Independent open-source project; not an official OpenAI product.";
  const methods=document.createElement("a");methods.href="./methodology.html";methods.textContent="Methods & limitations";
  const privacy=document.createElement("a");privacy.href="./privacy.html";privacy.textContent="Privacy & device data";
  footer.append(stamp,attribution,methods,privacy);
  if(!document.querySelector(".axiovo-credit"))document.body.append(footer);
 }
 function enablePhaseOneStyles(){
  if(document.querySelector('link[data-axiovo-ui-phase1]'))return;
  const css=document.createElement("link");
  css.rel="stylesheet";
  css.href=new URL("./axiovo-ui-phase1.css?v=1",document.currentScript?.src||location.href).href;
  css.dataset.axiovoUiPhase1="true";
  document.head.append(css);
  if(!document.querySelector('link[data-axiovo-ui-phase2]')){
   const detail=document.createElement("link");detail.rel="stylesheet";
   detail.href=new URL("./axiovo-ui-phase2.css?v=1",location.href).href;
   detail.dataset.axiovoUiPhase2="true";document.head.append(detail);
  }
  if(!document.querySelector('link[data-axiovo-ui-phase3]')){
   const support=document.createElement("link");support.rel="stylesheet";
   support.href=new URL("./axiovo-ui-phase3.css?v=1",location.href).href;
   support.dataset.axiovoUiPhase3="true";document.head.append(support);
  }
 }
 function addAssistantMark(){
  if(!document.body.classList.contains("axiovo-assistant"))return;
  const heading=document.querySelector(".assistant-page .rd-desk-heading h1");
  if(!heading||heading.parentElement?.classList.contains("axiovo-v2-assistant-title"))return;
  const wrap=document.createElement("div");wrap.className="axiovo-v2-assistant-title";
  const icon=document.createElement("img");icon.src=new URL("./icons/research-assistant-evidence.svg",location.href).href;
  icon.alt="";icon.setAttribute("aria-hidden","true");icon.width=46;icon.height=46;
  heading.before(wrap);wrap.append(icon,heading);
 }
 function activateBlueprint(){
  if(document.querySelector('link[data-axiovo-blueprint]'))return;
  const sheet=document.createElement("link");sheet.rel="stylesheet";
  sheet.href=new URL("./axiovo-blueprint-ui.css?v=20261111-reference",location.href).href;
  sheet.dataset.axiovoBlueprint="true";document.head.append(sheet);
  const script=document.createElement("script");script.defer=true;
  script.src=new URL("./axiovo-blueprint-ui.js?v=20261111-single-home-v2",location.href).href;
  script.dataset.axiovoBlueprint="true";document.head.append(script);
  // Per-page design is presentational; all original handlers stay intact.
  const pageStyle=document.createElement("link");pageStyle.rel="stylesheet";
  pageStyle.href=new URL("./axiovo-page-design-v4.css?v=20261111-complete-v1",location.href).href;
  pageStyle.dataset.axiovoPageDesign="v4";document.head.append(pageStyle);
  const pageScript=document.createElement("script");pageScript.defer=true;
  pageScript.src=new URL("./axiovo-page-design-v4.js?v=20261111-complete-v1",location.href).href;
  pageScript.dataset.axiovoPageDesign="v4";document.head.append(pageScript);
 }
 function loadRobot(){
  if(document.querySelector('script[data-axiovo-robot]'))return;
  const script=document.createElement("script");script.src=new URL("./axiovo-robot-help.js?v=20261111-p0p1-v1",document.currentScript?.src||location.href).href;
  script.defer=true;script.dataset.axiovoRobot="1";document.head.append(script);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{mount();enablePhaseOneStyles();addAssistantMark();activateBlueprint();loadRobot()});
 else {mount();enablePhaseOneStyles();addAssistantMark();activateBlueprint();loadRobot()}
})();
