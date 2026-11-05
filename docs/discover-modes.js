/* Axiovo paper-first Discover modes. A thin controller over the proven
 * original filters, not a second competing search engine. */
(function(){
"use strict";
function init(){
 if(!document.body.classList.contains("axiovo-discover"))return;
 const root=document.getElementById("arxiv-discovery");
 const list=document.getElementById("local-feed-view");
 if(!root||!list)return;
 const toolbar=document.createElement("nav");toolbar.className="axiovo-reading-modes";toolbar.setAttribute("aria-label","Browse research papers");
 const buttons={};
 const choices=[["latest","Latest"],["recommended","Recommended"],["following","Following"],["saved","Saved"]];
 function activate(mode){
  for(const [key,button] of Object.entries(buttons)){
   button.setAttribute("aria-pressed",String(key===mode));
   button.classList.toggle("active",key===mode);
  }
 }
 for(const [key,title] of choices){
  const button=document.createElement("button");button.type="button";button.textContent=title;
  button.setAttribute("aria-pressed",String(key==="latest"));button.className=key==="latest"?"active":"";
  buttons[key]=button;toolbar.append(button);
  button.addEventListener("click",()=>{
   const order=document.getElementById("order");
   const saved=document.getElementById("savedOnly");
   const followed=document.getElementById("following-only");
   // Restore the underlying pre-existing filters before selecting a new mode.
   if(saved&&saved.textContent.includes("Show all"))saved.click();
   if(followed&&followed.textContent.includes("Show all"))followed.click();
   if(key==="latest"){order.value="new";order.dispatchEvent(new Event("change",{bubbles:true}))}
   if(key==="recommended"){order.value="recommended";order.dispatchEvent(new Event("change",{bubbles:true}))}
   if(key==="following")followed?.click();
   if(key==="saved")saved?.click();
   activate(key);
  });
 }
 const hint=document.createElement("p");hint.className="axiovo-reading-mode-hint";
 hint.textContent="Latest follows indexed arXiv submission timestamps. Recommended and Following use your locally saved interests. No fabricated popularity rankings.";
 const target=root.querySelector(".filters");
 if(target)target.before(toolbar,hint);else list.prepend(toolbar,hint);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();