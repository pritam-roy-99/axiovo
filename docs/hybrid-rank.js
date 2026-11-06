/* Rank fusion operates on verified candidate lists only. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoHybridRank=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 function identity(item){
  const p=item.paper||item;
  return String(p.source||"").toLowerCase()+":"+
    String(p.canonicalId||p.id||p.source_id||p.doi||"").toLowerCase()+":"+
    String(p.version??"");
 }
 function fuse(lists,{k=60,eligible=()=>true,limit=100}={}){
  const found=new Map();
  for(const [method,items] of Object.entries(lists||{})){
   if(!Array.isArray(items))continue;
   const encountered=new Set();
   items.forEach((entry,index)=>{
    const p=entry.paper||entry;
    if(!p||!p.title||!(p.url||p.landing_url)||!eligible(p))return;
    const id=identity(entry);
    if(encountered.has(id))return;
    encountered.add(id);
    const previous=found.get(id)||{paper:p,id,score:0,methods:[]};
    previous.score+=1/(k+index+1);
    if(!previous.methods.includes(method))previous.methods.push(method);
    found.set(id,previous);
   });
  }
  return [...found.values()].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,Math.max(0,Math.min(500,limit)));
 }
 return Object.freeze({identity,fuse});
});