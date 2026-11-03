/* Shared day/night appearance; stored only on this device. */
(function(){
 const key="researchlens-theme";let theme="light";
 try{theme=localStorage.getItem(key)||"light"}catch(err){}
 if(theme!=="dark")theme="light";
 document.documentElement.dataset.theme=theme;
 function set(t){
  theme=t;document.documentElement.dataset.theme=t;
  try{localStorage.setItem(key,t)}catch(err){}
  const b=document.querySelector(".theme-toggle");
  if(b){b.textContent=t==="dark"?"☀ Day":"☾ Night";b.setAttribute("aria-label","Switch to "+(t==="dark"?"light":"dark")+" mode")}
 }
 function install(){
  const h=document.querySelector("header");if(!h)return;
  const b=document.createElement("button");b.type="button";b.className="theme-toggle";
  b.onclick=()=>set(theme==="light"?"dark":"light");
  h.append(b);set(theme);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
