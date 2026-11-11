/* Axiovo's interactive onboarding guide uses real feature names and links.
   No fake recording, no remote API, no storage writes. */
(function(){
 "use strict";
 const steps=[
  {label:"START · RESEARCH DISCOVERY",title:"Welcome to the new Axiovo.",description:"Explore a free, open-source research workspace that helps you discover papers across four archives, verify source records, and organize your own literature.",pills:["arXiv","bioRxiv","ChemRxiv","IACR ePrint"],action:"Explore the four archives",href:"./arxiv.html"},
  {label:"01 · DISCOVER",title:"From broad subjects to specific topics.",description:"Choose a source and narrow research using a subject, subfield and subtopic. Customize research paths without losing the original archive classification.",pills:["Subject","Subfield","Subtopic","Custom paths"],action:"Browse arXiv subjects",href:"./arxiv.html"},
  {label:"02 · LATEST PAPERS",title:"Check current announcements and versions.",description:"Browse the most recent available papers, choose dates, and distinguish an arXiv first submission (v1) from later revisions. Coverage indicators warn when an archive is incomplete.",pills:["Latest announcements","v1 / revisions","Date range"],action:"Browse recent arXiv papers",href:"./arxiv.html"},
  {label:"03 · RESEARCH DESK",title:"One search across four archives.",description:"Search titles, authors, keywords and identifiers. Filter by date, select archives and inspect source-linked results. Axiovo does not claim missing papers are indexed.",pills:["Four sources","Author search","Filter / sort"],action:"Open Research Desk",href:"./desk.html"},
  {label:"04 · VERIFY",title:"Trust the original research record.",description:"Inspect source identifiers, available versions, abstracts and references. Open the original paper to verify any claim before citing it.",pills:["Original record","Exact versions","Citations"],action:"Search the evidence",href:"./desk.html"},
  {label:"05 · LIBRARY",title:"Build your private reading collection.",description:"Save interesting papers, add notes and collections, compare sources and export citations. Your browser-local data stays on your device unless you choose to export or back it up.",pills:["Save","Notes","BibTeX / RIS","Backup"],action:"Open your Library",href:"./workspace.html"},
  {label:"06 · MY FEED",title:"Follow authors and research interests.",description:"Follow authors, subjects and subtopics and revisit personalized suggestions. Check why each paper is recommended and open its source record.",pills:["Follow authors","Follow topics","My Feed"],action:"Open My Feed",href:"./feed.html"},
  {label:"07 · RESEARCH ASSISTANT",title:"Ask literature questions with evidence.",description:"Use the Research Assistant to investigate indexed papers and source-linked citations. Available local or hosted model support depends on the user's setup.",pills:["Research questions","Source links","Local-first"],action:"Open Research Assistant",href:"./copilot.html"},
  {label:"08 · PROOFLAB & TOOLS",title:"Move from reading to research work.",description:"Use ProofLab and Research Tools for structured work, PDF reading, research notes, source comparison and mathematical reasoning. Verify generated claims independently.",pills:["ProofLab","PDF tools","Comparisons"],action:"Open ProofLab",href:"./prooflab.html"},
  {label:"09 · ACCESS & APPEARANCE",title:"Make Axiovo your workspace.",description:"Install Axiovo as a browser app, choose Day or Night mode and one of five color palettes, and use the movable Need help? robot where it is available.",pills:["Install","Day / Night","Five palettes","Need help?"],action:"Open Settings",href:"./profiles.html"}
 ]
 function initialize(){
  const root=document.getElementById("axiovo-tour");if(!root)return;
  const video=document.getElementById("axiovo-home-video");
  if(video){
   const switcher=document.querySelector(".axiovo-tour-mode-switch");
   // Both modes share one stable stage below the same two buttons.
   let stage=document.getElementById("axiovo-tour-stage");
   if(!stage){
    stage=document.createElement("div");
    stage.id="axiovo-tour-stage";
    stage.className="axiovo-tour-stage";
    stage.setAttribute("aria-label","Axiovo tutorial content");
    if(switcher)switcher.after(stage);else video.before(stage);
   }
   stage.append(video,root);
   const watch=document.getElementById("axiovo-tour-show-video");
   const guide=document.getElementById("axiovo-tour-show-guide");
   const retry=document.getElementById("axiovo-tour-retry-video");
   const status=document.getElementById("axiovo-tour-media-status");
   let mode="video";
   let unavailable=false;
   let failures=0;
   let retryTimer=null;
   const MAX_RETRIES=2;
   const clearRetry=()=>{if(retryTimer!==null){clearTimeout(retryTimer);retryTimer=null}};
   const setStatus=message=>{if(status)status.textContent=message};
   function display(next){
    mode=next;
    const isVideo=next==="video";
    stage.dataset.mode=isVideo?"video":"guide";
    video.hidden=!isVideo;
    root.hidden=isVideo;
    const side=stage.querySelector(".ax-home-guide");
    if(side)side.hidden=!isVideo;
    watch?.setAttribute("aria-pressed",String(isVideo));
    guide?.setAttribute("aria-pressed",String(!isVideo));
    if(watch)watch.classList.toggle("rd-primary",isVideo);
    if(guide)guide.classList.toggle("rd-primary",!isVideo);
    if(retry)retry.hidden=!unavailable;
    if(isVideo){
     setStatus(unavailable?
      "The recorded video is currently unavailable. Retry video, or choose the interactive guide.":
      "Recorded walkthrough. Select Play to watch, or choose the interactive guide.");
    }else{
     video.pause();
     setStatus("Interactive guide selected. The recorded video remains available in the Watch tutorial tab.");
    }
   }
   function retryLoad(){
    if(!video.isConnected||mode!=="video")return;
    clearRetry();
    unavailable=false;
    if(retry)retry.hidden=true;
    setStatus("Reconnecting to the recorded tutorial…");
    // A new media request, not a page reload; saved research preferences remain untouched.
    video.load();
   }
   function videoReady(){
    clearRetry();
    failures=0;
    unavailable=false;
    if(mode==="video")display("video");
    else if(retry)retry.hidden=true;
   }
   function videoError(event){
    if(mode!=="video"){
     unavailable=true;
     if(retry)retry.hidden=false;
     return;
    }
    // Ignore late source-level events if the selected media is playable.
    // A media-element error still needs recovery after metadata has loaded.
    if(event.target!==video&&video.readyState>=HTMLMediaElement.HAVE_METADATA)return;
    if(retryTimer!==null)return;
    if(failures<MAX_RETRIES&&navigator.onLine!==false){
     failures++;
     setStatus("The tutorial is reconnecting ("+failures+"/"+MAX_RETRIES+").");
     retryTimer=setTimeout(()=>{retryTimer=null;retryLoad()},1000*failures);
     return;
    }
    unavailable=true;
    if(retry)retry.hidden=false;
    if(mode==="video")display("video");
    // Never switch the user to the interactive guide automatically.
   }
   video.addEventListener("loadedmetadata",videoReady);
   video.addEventListener("canplay",videoReady);
   video.addEventListener("error",videoError);
   video.querySelectorAll("source").forEach(source=>source.addEventListener("error",videoError));
   watch?.addEventListener("click",()=>{
    display("video");
    if(unavailable){failures=0;retryLoad()}
   });
   guide?.addEventListener("click",()=>{clearRetry();display("guide")});
   retry?.addEventListener("click",()=>{failures=0;display("video");retryLoad()});
   window.addEventListener("online",()=>{
    if(unavailable&&mode==="video"){failures=0;retryLoad()}
   });
   window.addEventListener("pagehide",clearRetry);
   window.addEventListener("pageshow",event=>{
    if(event.persisted||performance.getEntriesByType("navigation")[0]?.type==="back_forward"||
       new URLSearchParams(location.search).has("axiovo_return")){
     // BFCache restores media as well as scroll position. Reset the
     // tutorial presentation without forcing autoplay or switching guides.
     clearRetry();
     failures=0;unavailable=false;
     display("video");
     if(video.error)retryLoad();
    }else display(mode);
   });
   display("video");
   // preload=metadata is enough; don't request the MP4 repeatedly before
   // the media element reports an actual failure.
  }
  const overline=document.getElementById("axiovo-tour-overline"),title=document.getElementById("axiovo-tour-title"),description=document.getElementById("axiovo-tour-description"),illustration=document.getElementById("axiovo-tour-illustration"),counter=document.getElementById("axiovo-tour-counter"),progress=document.getElementById("axiovo-tour-progress"),action=document.getElementById("axiovo-tour-action"),prev=document.getElementById("axiovo-tour-prev"),next=document.getElementById("axiovo-tour-next");
  let current=0;const dots=[];
  progress.replaceChildren();
  steps.forEach((step,i)=>{
   const b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Go to tutorial step "+(i+1));b.addEventListener("click",()=>render(i));progress.append(b);dots.push(b);
  });
  function render(i){
   current=Math.max(0,Math.min(steps.length-1,i));const step=steps[current];
   overline.textContent=step.label;title.textContent=step.title;description.textContent=step.description;
   // Display the same modern light workspace language used by Axiovo's
   // real navigation and cards, rather than the legacy dark four-tile slide.
   const display=document.createElement("div");
   display.className="axiovo-tour-preview";
   const rail=document.createElement("div");
   rail.className="axiovo-tour-preview-rail";
   const emblem=document.createElement("strong");
   emblem.textContent="✦ AXIOVO";
   rail.append(emblem);
   for(const label of ["Explore","Research Desk","My Feed","Library","Research Assistant"]){
    const item=document.createElement("span");
    item.textContent=label;
    if((step.href.includes("desk")&&label==="Research Desk")||
       (step.href.includes("feed")&&label==="My Feed")||
       (step.href.includes("workspace")&&label==="Library")||
       (step.href.includes("copilot")&&label==="Research Assistant")||
       (!/desk|feed|workspace|copilot/.test(step.href)&&label==="Explore"))
     item.classList.add("is-active");
    rail.append(item);
   }
   const workspace=document.createElement("div");
   workspace.className="axiovo-tour-preview-main";
   const toolbar=document.createElement("div");
   toolbar.className="axiovo-tour-preview-toolbar";
   const origin=document.createElement("span");
   origin.textContent="Research workspace";
   const mode=document.createElement("span");
   mode.textContent="⌕  Search all papers     ☾";
   toolbar.append(origin,mode);
   const hero=document.createElement("div");
   hero.className="axiovo-tour-preview-hero";
   const kicker=document.createElement("small");
   kicker.textContent=step.label;
   const heading=document.createElement("strong");
   heading.textContent=step.action;
   const hint=document.createElement("span");
   hint.textContent="Source-first · free and open";
   hero.append(kicker,heading,hint);
   const features=document.createElement("div");
   features.className="axiovo-tour-preview-features";
   for(const name of step.pills){
    const chip=document.createElement("span");
    chip.className="axiovo-tour-preview-feature";
    chip.textContent=name;
    features.append(chip);
   }
   const footer=document.createElement("div");
   footer.className="axiovo-tour-preview-footer";
   footer.textContent="Open this workflow in Axiovo →";
   workspace.append(toolbar,hero,features,footer);
   display.append(rail,workspace);
   illustration.replaceChildren(display);
   counter.textContent=(current+1)+" / "+steps.length;action.textContent=step.action+" ↗";action.href=step.href;
   prev.disabled=current===0;next.textContent=current===steps.length-1?"Start again ↻":"Next step →";
   dots.forEach((b,j)=>{if(j===current)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current");});
  }
  prev.addEventListener("click",()=>render(current-1));
  next.addEventListener("click",()=>render(current===steps.length-1?0:current+1));
  root.addEventListener("keydown",e=>{if(e.target.tagName==="BUTTON"&&(e.key==="ArrowLeft"||e.key==="ArrowRight")){e.preventDefault();render(current+(e.key==="ArrowRight"?1:-1));}});
  render(0);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();
