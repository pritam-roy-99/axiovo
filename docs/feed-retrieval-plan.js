/* Fair, resumable scheduling of explicit follows. Does not perform network requests. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoFeedRetrievalPlan=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 function plan({authors=[],topics=[],paths=[],source=null,cursor=0,budget=8}={}){
  const items=[],seen=new Set();
  function push(kind,value,archive){
   const name=String(value||"").trim(),s=String(archive||source||"arxiv").toLowerCase();
   if(!name||!["arxiv","biorxiv","chemrxiv"].includes(s))return;
   const key=[s,kind,name.toLowerCase()].join("|");
   if(seen.has(key))return;seen.add(key);
   items.push({key,source:s,kind,value:name});
  }
  for(const a of authors)push("author",typeof a==="string"?a:a.name,a.source);
  for(const t of topics)push("topic",typeof t==="string"?t:t.name,t.source);
  for(const p of paths)push("path",p.path||p.label||p.topic,p.source);
  items.sort((a,b)=>a.key.localeCompare(b.key));
  const start=items.length?Math.max(0,Math.floor(cursor))%items.length:0;
  const length=Math.min(items.length,Math.max(1,Math.floor(budget)));
  const slice=[];
  for(let i=0;i<length;i++)slice.push(items[(start+i)%items.length]);
  return {queries:slice,total:items.length,coveredThisScan:slice.length,
   nextCursor:items.length?(start+length)%items.length:0,
   completeInOneScan:items.length<=length,
   coverage:"scheduled-only-not-a-confirmed-provider-fetch"};
 }
 return Object.freeze({plan});
});