/* Browser-only reading recommendations. Nothing is sent to a ranking service. */
(function(root,factory){
 "use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoLocalFeedback=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const KEY="axiovo-paper-feedback-v1";
 const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9 ]+/g," ").split(/\s+/).filter(x=>x.length>3);
 function load(storage){
  try{const x=JSON.parse(storage.getItem(KEY)||"{}");return x&&typeof x==="object"&&!Array.isArray(x)?x:{}}catch{return {}}
 }
 function set(storage,id,rating){
  id=String(id||"").trim();if(!id||id.length>150||![-1,0,1].includes(rating))return false;
  const values=load(storage);
  if(rating===0)delete values[id];else values[id]=rating;
  const trimmed=Object.fromEntries(Object.entries(values).slice(-2000));
  try{storage.setItem(KEY,JSON.stringify(trimmed));return true}catch{return false}
 }
 function score(p,all,rated){
  const thisTopics=new Set(p.topics||[]);
  const thisWords=new Set(norm(p.title).slice(0,30));
  let total=Number(rated[p.id]||0)*25;
  for(const related of all){
   const sign=Number(rated[related.id]||0);if(!sign||related.id===p.id)continue;
   const topics=(related.topics||[]).filter(t=>thisTopics.has(t)).length;
   const titleWords=norm(related.title).filter(w=>thisWords.has(w)).length;
   total+=sign*(topics*5+Math.min(4,titleWords)*2);
  }
  return total
 }
 return {KEY,load,set,score};
});