/* Axiovo Android / desktop install experience. Native install prompt when available;
 * accessible browser-menu instructions otherwise. No permissions or tracking.
 */
(function(){
 "use strict";
 let installEvent=null;
 function setup(){
  const buttons=[...document.querySelectorAll("[data-axiovo-install]")];
  const standalone=window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone===true;
  if(standalone)buttons.forEach(button=>button.hidden=true);
  function instructions(){
   let dialog=document.getElementById("axiovo-install-guide");
   if(!dialog){
    dialog=document.createElement("dialog");dialog.id="axiovo-install-guide";dialog.className="axiovo-install-guide";
    const title=document.createElement("h2");title.textContent="Install Axiovo on your phone";
    const p=document.createElement("p");p.textContent="Open Axiovo in Google Chrome on Android, tap the three-dot menu, then choose Install app or Add to Home screen. Confirm to add Axiovo to your apps.";
    const close=document.createElement("button");close.type="button";close.className="btn primary";close.textContent="Got it";close.onclick=()=>dialog.close();
    dialog.append(title,p,close);document.body.append(dialog);
   }
   dialog.showModal();
  }
  for(const button of buttons)button.addEventListener("click",async()=>{
   if(!installEvent){instructions();return}
   const event=installEvent;installEvent=null;
   try{await event.prompt();await event.userChoice}catch{instructions()}
  });
  window.addEventListener("beforeinstallprompt",event=>{
   event.preventDefault();installEvent=event;
  });
  window.addEventListener("appinstalled",()=>{installEvent=null;buttons.forEach(button=>button.hidden=true)});
  if(!("serviceWorker" in navigator)||!window.isSecureContext)return;
  window.addEventListener("load",()=>{
   navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"}).catch(err=>{
    console.info("Axiovo offline support unavailable:",err.message||err)
   });
  });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);
 else setup();
})();
