/* One-time, non-destructive migration from the previous application namespace.
   Retain old keys so older tabs/releases cannot erase a user's saved work. */
try {
  for (let i = 0; i < localStorage.length; i++) {
    const oldKey = localStorage.key(i);
    if (!oldKey || !/^researchlens(?:-|$)/i.test(oldKey)) continue;
    const newKey = oldKey.replace(/^researchlens/i, "axiovo");
    if (localStorage.getItem(newKey) === null) {
      const value = localStorage.getItem(oldKey);
      if (value !== null) localStorage.setItem(newKey, value);
    }
  }
} catch (_) { /* storage may be unavailable in private browsing */ }
/* Local appearance settings shared across Axiovo, without accounts or trackers. */
(function(){
 "use strict";
 const KEY="axiovo-theme",PALETTE_KEY="axiovo-palette-v1";
 const allowed=["ocean","forest","violet","rose","amber"];
 let theme="light",palette="ocean";
 try{theme=localStorage.getItem(KEY)==="dark"?"dark":"light";
     palette=localStorage.getItem(PALETTE_KEY)||"ocean"}catch{}
 if(!allowed.includes(palette))palette="ocean";
 document.documentElement.dataset.theme=theme;
 document.documentElement.dataset.accent=palette;
 function applyTheme(value){
  theme=value==="dark"?"dark":"light";
  document.documentElement.dataset.theme=theme;
  try{localStorage.setItem(KEY,theme)}catch{}
  for(const button of document.querySelectorAll(".theme-toggle")){
   button.textContent=theme==="dark"?"☀ Day":"☾ Night";
   button.setAttribute("aria-label","Switch to "+(theme==="dark"?"light":"dark")+" mode");
   button.setAttribute("aria-pressed",String(theme==="dark"));
  }
  const mobile=document.querySelector(".ax-menu-theme");
  if(mobile)mobile.textContent=theme==="dark"?"☀ Switch to Day":"☾ Switch to Night";
 }
 function applyPalette(value){
  if(!allowed.includes(value))return false;
  palette=value;document.documentElement.dataset.accent=value;
  try{localStorage.setItem(PALETTE_KEY,value)}catch{}
  for(const select of document.querySelectorAll("[data-axiovo-palette]"))select.value=value;
  return true;
 }
 window.AxiovoAppearance={palettes:allowed.slice(),setPalette:applyPalette,getPalette:()=>palette,
  setTheme:applyTheme,getTheme:()=>theme};
 function install(){
  const header=document.querySelector("header");
  if(header&&!header.querySelector(".theme-toggle")){
   const b=document.createElement("button");b.type="button";b.className="theme-toggle";
   b.onclick=()=>applyTheme(theme==="light"?"dark":"light");header.append(b);
  }
  applyTheme(theme);applyPalette(palette);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);
 else install();
 window.addEventListener("storage",e=>{
  if(e.key===PALETTE_KEY)applyPalette(e.newValue||"ocean");
  if(e.key===KEY)applyTheme(e.newValue||"light");
 });
})();