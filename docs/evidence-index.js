/* Evidence index stores only literal source-located passages. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoEvidenceIndex=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 function fromAbstract(p){
  if(!p||!p.id||!p.abstract||!p.url)return [];
  const text=String(p.abstract);
  const parts=text.match(/[^.!?]+(?:[.!?]+|$)/g)||[];
  let next=0;
  return parts.map((part,i)=>{
   const value=part.trim(),start=text.indexOf(value,next);
   if(start<0)return null;
   next=start+value.length;
   return Object.freeze({passage_id:String(p.id)+":"+String(p.version??"unknown")+":abstract:"+i,
    source_id:p.id,version:p.version??null,source_url:p.url,section:"Abstract",
    page:null,start,end:next,text:value,method:"literal-abstract",extraction_status:"verified-literal"});
  }).filter(Boolean);
 }
 function retrieve(passages,question,{limit=6}={}){
  const words=[...new Set(String(question||"").toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[])];
  return (passages||[]).map(p=>{
   const t=String(p.text||"").toLowerCase(),overlap=words.filter(w=>t.includes(w)).length;
   return {passage:p,score:overlap};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.passage.passage_id.localeCompare(b.passage.passage_id))
    .slice(0,Math.max(0,Math.min(30,limit)));
 }
 return Object.freeze({fromAbstract,retrieve});
});