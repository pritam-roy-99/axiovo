/* Axiovo: field-specific followed subtopics shared by Discover and Workspace. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoInterests=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const KEY="axiovo-interests-by-field-v1";
 function clean(value){return String(value||"").trim().replace(/\s+/g," ").slice(0,100)}
 function fieldKey(field){return /^[a-z]{3,22}$/.test(field||"")?field:"quantum"}
 function topicKey(topic){return clean(topic).toLowerCase()}
 function get(data,field,topic){const list=data?.[fieldKey(field)]?.[topicKey(topic)];return Array.isArray(list)?list.filter(x=>typeof x==="string").map(clean).filter(Boolean).slice(0,20):[]}
 function toggle(data,field,topic,interest){
  const entry=clean(interest);if(!entry)return data&&typeof data==="object"?data:{};
  const key=fieldKey(field),name=topicKey(topic),next={...(data&&typeof data==="object"?data:{})};
  next[key]={...(next[key]||{})};const current=get(next,key,topic);
  next[key][name]=current.some(x=>x.toLowerCase()===entry.toLowerCase())?
   current.filter(x=>x.toLowerCase()!==entry.toLowerCase()):
   [...current,entry].slice(0,20);
  return next;
 }
 function order(items,followed){
  const f=new Set((followed||[]).map(x=>clean(x).toLowerCase()));
  return [...(items||[])].sort((a,b)=>Number(f.has(clean(b).toLowerCase()))-Number(f.has(clean(a).toLowerCase())));
 }
 return {KEY,clean,get,toggle,order};
});
