/* Friendly first-run help, dismissible per browser. */
(function(){
 "use strict";
 const KEY="axiovo-onboarding-seen-v1";
 function init(){
  const box=document.getElementById("axiovo-onboarding");
  if(!box)return;
  try{box.hidden=localStorage.getItem(KEY)==="yes"}catch{box.hidden=false}
  const dismiss=document.getElementById("axiovo-onboarding-dismiss");
  if(dismiss)dismiss.onclick=()=>{
   box.hidden=true;
   try{localStorage.setItem(KEY,"yes")}catch{}
  };
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
 else init();
})();
