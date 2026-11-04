/* First-run, optional onboarding without accounts or tracking. */
(function(){
 "use strict";
 function init(){
  const tour=document.getElementById("axiovo-video-details");
  if(tour&&window.matchMedia("(max-width:700px)").matches)tour.open=false;
  const welcome=document.getElementById("axiovo-onboarding");
  if(!welcome)return;
  const KEY="axiovo-onboarding-dismissed-v1";
  let dismissed=false;
  try{dismissed=localStorage.getItem(KEY)==="yes"}catch{}
  welcome.hidden=dismissed;
  document.getElementById("axiovo-dismiss")?.addEventListener("click",()=>{
   welcome.hidden=true;try{localStorage.setItem(KEY,"yes")}catch{}
  });
  document.getElementById("axiovo-pick-field")?.addEventListener("click",()=>{
   const details=document.getElementById("rl-focus-field-details");
   if(!details)return;
   details.open=true;
   details.scrollIntoView({behavior:"smooth",block:"center"});
   details.querySelector("summary")?.focus();
  });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
 else init();
})();
