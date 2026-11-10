/* Axiovo ProofLab Studio v2 enhancements; no proof status is fabricated. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const ask=$("prooflab-prompt");
$("pl-focus-prompt")?.addEventListener("click",()=>{
 document.getElementById("prooflab-chat-title")?.scrollIntoView({behavior:"smooth",block:"start"});
 ask?.focus();
});
const model=$("pl-active-model");
function refreshProvider(){
 if(!model)return;
 const local=$("ollama-model")?.value;
 const cloud=$("personal-model")?.value;
 const connected=$("personal-disconnect")&&!$("personal-disconnect").hidden;
 if(connected&&cloud){model.textContent="ChatGPT available · "+cloud;return;}
 model.textContent=local?"Ollama available · "+local:"Choose an AI model in the left panel";
}
$("ollama-model")?.addEventListener("change",refreshProvider);
document.addEventListener("change",e=>{if(e.target?.id==="personal-model")refreshProvider();});
const observer=new MutationObserver(refreshProvider);
const panel=document.querySelector(".prooflab-sidebar");
if(panel)observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
const sections=document.querySelectorAll(".pl-rail-nav a[href^='#']");
function selectRail(){
 const hash=location.hash||"#prooflab-chat-title";
 sections.forEach(link=>{
  const active=link.getAttribute("href")===hash;
  link.classList.toggle("pl-rail-active",active);
  if(active)link.setAttribute("aria-current","location");
  else link.removeAttribute("aria-current");
 });
}
addEventListener("hashchange",selectRail);
selectRail();
refreshProvider();
})();