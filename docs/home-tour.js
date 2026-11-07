/* Axiovo's interactive onboarding guide uses real feature names and links.
   No fake recording, no remote API, no storage writes. */
(function(){
 "use strict";
 const steps=[
  {label:"WELCOME TO AXIOVO",title:"Research discovery, made simpler.",description:"Start with a source, topic or question. Axiovo helps you move from finding a preprint to verifying and organizing it.",pills:["arXiv","bioRxiv","ChemRxiv","Crypto ePrint"],action:"Explore archives",href:"./arxiv.html"},
  {label:"STEP 1 · DISCOVER",title:"Find your research area.",description:"Select arXiv, bioRxiv, ChemRxiv, or Cryptology ePrint. Narrow your search using subjects, research subfields and specific topics.",pills:["Subject","Subfield","Topic"],action:"Explore arXiv",href:"./arxiv.html"},
  {label:"STEP 2 · SEARCH",title:"Search across all four archives.",description:"Search by title, keyword, author or identifier. Refine by date and sort the papers you see.",pills:["IACR IDs","Date filters","Sort papers"],action:"Open Research Desk",href:"./desk.html"},
  {label:"STEP 3 · VERIFY & SAVE",title:"Keep the papers that matter.",description:"Read source-linked abstracts, inspect original records, and save papers, notes and collections to your private Library.",pills:["Original source","Save paper","Collections"],action:"Open My Library",href:"./workspace.html"},
  {label:"STEP 4 · FOLLOW",title:"A personalized research feed.",description:"Follow authors and subtopics, then browse relevant papers and suggestions in My Feed.",pills:["Authors","Topics","My Feed"],action:"Open My Feed",href:"./feed.html"},
  {label:"STEP 5 · ANALYZE",title:"Go further with research tools.",description:"Use Research Assistant for source-linked questions and Research Tools to work with papers, citations and comparisons.",pills:["Research Assistant","Research Tools","Evidence"],action:"Open Research Assistant",href:"./copilot.html"}
 ];
 function initialize(){
  const root=document.getElementById("axiovo-tour");if(!root)return;
  const video=document.getElementById("axiovo-home-video");
  if(video){
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
    video.hidden=!isVideo;
    root.hidden=isVideo;
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
   function videoError(){
    // Source-level errors may fire while another candidate or the media
    // element is still loading. Do not react after playable data arrives.
    if(video.readyState>=HTMLMediaElement.HAVE_METADATA)return;
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
    if(event.persisted||new URLSearchParams(location.search).has("axiovo_return")){
     // BFCache restores media as well as scroll position. Reset the
     // tutorial presentation without forcing autoplay or switching guides.
     clearRetry();
     failures=0;unavailable=false;
     display("video");
     if(video.readyState===0)retryLoad();
    }else display(mode);
   });
   display("video");
   // preload=metadata is enough; don't request the MP4 repeatedly before
   // the media element reports an actual failure.
  }
  const overline=document.getElementById("axiovo-tour-overline"),title=document.getElementById("axiovo-tour-title"),description=document.getElementById("axiovo-tour-description"),illustration=document.getElementById("axiovo-tour-illustration"),counter=document.getElementById("axiovo-tour-counter"),progress=document.getElementById("axiovo-tour-progress"),action=document.getElementById("axiovo-tour-action"),prev=document.getElementById("axiovo-tour-prev"),next=document.getElementById("axiovo-tour-next");
  let current=0;const dots=[];
  steps.forEach((step,i)=>{
   const b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Go to tutorial step "+(i+1));b.addEventListener("click",()=>render(i));progress.append(b);dots.push(b);
  });
  function render(i){
   current=Math.max(0,Math.min(steps.length-1,i));const step=steps[current];
   overline.textContent=step.label;title.textContent=step.title;description.textContent=step.description;
   illustration.replaceChildren(...step.pills.map(p=>{const s=document.createElement("span");s.textContent=p;return s;}));
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
