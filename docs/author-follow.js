/* Shared author-follow control for arXiv and scholarly paper cards.
 * arXiv public metadata does not reliably identify the submitter or corresponding author.
 * Never infer either identity from author ordering.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoAuthorFollow=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const KEY="researchlens-author-follows";
 function list(){
  try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v.filter(x=>typeof x==="string").slice(0,1000):[]}catch{return []}
 }
 function isFollowing(name){return list().includes(String(name||"").trim())}
 function toggle(name){
  name=String(name||"").trim();if(!name)return false;
  const v=list(),next=v.includes(name)?v.filter(x=>x!==name):[...v,name].slice(0,1000);
  try{localStorage.setItem(KEY,JSON.stringify(next))}catch{return false}
  if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("axiovo:author-follow-change",{detail:{name,following:next.includes(name)}}));
  return next.includes(name);
 }
 function mount(parent,names){
  if(typeof document==="undefined"||!parent)return null;
  const authors=[...new Set((Array.isArray(names)?names:[]).filter(x=>typeof x==="string").map(x=>x.trim()).filter(Boolean))];
  if(!authors.length)return null;
  const wrap=document.createElement("span");wrap.className="axiovo-author-follow";
  const chooser=document.createElement("select");chooser.className="axiovo-author-select";
  chooser.setAttribute("aria-label","Select a paper author to follow");
  for(const name of authors){const option=document.createElement("option");option.value=name;option.textContent=name;chooser.append(option)}
  const button=document.createElement("button");button.type="button";button.className="rl-paper-action axiovo-author-follow-button";
  function update(){
   const followed=isFollowing(chooser.value);
   button.textContent=followed?"★ Following author":"☆ Follow author";
   button.setAttribute("aria-pressed",String(followed));
   button.setAttribute("aria-label",(followed?"Unfollow ":"Follow ")+chooser.value);
   button.title="Follow an explicitly selected coauthor. arXiv metadata does not identify the uploader or corresponding author.";
  }
  chooser.addEventListener("change",update);
  button.addEventListener("click",()=>{toggle(chooser.value);update()});
  if(typeof window!=="undefined")window.addEventListener("axiovo:author-follow-change",update);
  wrap.append(chooser,button);parent.append(wrap);update();return wrap;
 }
 return {KEY,list,isFollowing,toggle,mount};
});