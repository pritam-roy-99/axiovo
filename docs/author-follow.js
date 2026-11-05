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
 const KEY="axiovo-author-follows";
 function list(){
  try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v.filter(x=>typeof x==="string").slice(0,1000):[]}catch{return []}
 }
 const nameKey=name=>String(name||"").trim().toLowerCase().replace(/\s+/g," ");
 function isFollowing(name){const key=nameKey(name);return Boolean(key)&&list().some(item=>nameKey(item)===key)}
 function setFollowing(name,following){
  name=String(name||"").trim().slice(0,120);if(!name)return false;
  const authors=list(),key=nameKey(name);
  const current=authors.some(item=>nameKey(item)===key);
  if(current===following)return true;
  if(following&&authors.length>=1000)return false;
  const next=following?[...authors,name]:authors.filter(item=>nameKey(item)!==key);
  try{localStorage.setItem(KEY,JSON.stringify(next))}catch{return false}
  if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("axiovo:author-follow-change",{detail:{name,following}}));
  return true;
 }
 function toggle(name){
  const next=!isFollowing(name);return setFollowing(name,next)&&next;
 }
 function mount(parent,names){
  if(typeof document==="undefined"||!parent)return null;
  const authors=[...new Set((Array.isArray(names)?names:[]).filter(x=>typeof x==="string").map(x=>x.trim()).filter(Boolean))];
  if(!authors.length)return null;
  const wrap=document.createElement("span");wrap.className="axiovo-author-follow";
  const chooser=document.createElement("select");chooser.className="axiovo-author-select";chooser.hidden=authors.length===1;
  chooser.setAttribute("aria-label","Select a paper author to follow");
  for(const name of authors){const option=document.createElement("option");option.value=name;option.textContent=name;chooser.append(option)}
  const button=document.createElement("button");button.type="button";button.className="rl-paper-action axiovo-author-follow-button";
  function update(){
   const followed=isFollowing(chooser.value);
   chooser.title=chooser.value;
   button.textContent=followed?"★ Following":"☆ Follow author";
   button.setAttribute("aria-pressed",String(followed));
   button.setAttribute("aria-label",(followed?"Unfollow ":"Follow ")+chooser.value);
   button.title="Follow the author name shown in the source metadata.";
  }
  chooser.addEventListener("change",update);
  button.addEventListener("click",()=>{
   if(setFollowing(chooser.value,!isFollowing(chooser.value)))update();
   else button.textContent="Could not update follows";
  });

  wrap.append(chooser,button);parent.append(wrap);update();return wrap;
 }
 function attach(parent,names){
  if(!names?.length)return;
  const details=document.createElement("details");details.className="axiovo-follow-details";
  const summary=document.createElement("summary");summary.textContent="Follow author";
  details.append(summary);parent.append(details);
  details.addEventListener("toggle",()=>{
   if(!details.open)return;
   details.querySelector(".axiovo-author-follow")?.remove();mount(details,names);
   if(!details.querySelector("a")){
    const link=document.createElement("a");link.href="./workspace.html#following";link.textContent="Following list →";details.append(link);
   }
  });
 }
 return {KEY,list,isFollowing,setFollowing,toggle,mount,attach};
});