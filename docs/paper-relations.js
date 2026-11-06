/* Source-only related-paper suggestions; never invent records or citations. */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoPaperRelations=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const STOP=new Set(("the and for from with without into under over between through based using use uses "+
 "paper study studies result results approach method methods model models novel new effect effects "+
 "analysis experimental theoretical quantum physics biology chemistry mathematics computer science "+
 "toward towards their these those this that have has were are was which while such all").split(" "));
 function tokens(value){
  return [...new Set(String(value||"").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"").match(/[a-z][a-z0-9-]{2,}/g)||[])]
    .filter(t=>!STOP.has(t)).slice(0,70);
 }
 function key(p){return String(p?.source||"")+":"+String(p?.id||p?.doi||"").toLowerCase().replace(/\/v\d+$/,"")}
 function related(target, candidates, limit=3){
  if(!target?.title||!target?.url)return [];
  const titleTerms=new Set(tokens(target.title)), abstractTerms=new Set(tokens(target.abstract));
  if(titleTerms.size<2)return [];
  const results=[];
  for(const paper of candidates||[]){
   if(!paper||!paper.url||!paper.title||key(paper)===key(target)||paper.source!==target.source)continue;
   const title=tokens(paper.title), abstract=new Set(tokens(paper.abstract));
   const shared=title.filter(term=>titleTerms.has(term));
   const sharedAbstract=title.filter(term=>abstractTerms.has(term));
   const inAbstract=[...titleTerms].filter(term=>abstract.has(term));
   const unique=[...new Set([...shared,...sharedAbstract,...inAbstract])];
   const commonCategories=(paper.categories||[]).filter(x=>(target.categories||[]).includes(x));
   const evidence=shared.length>=2 || (shared.length>=1 && inAbstract.length>=2);
   if(!evidence)continue;
   const score=shared.length*8+inAbstract.length*2+sharedAbstract.length+
     (commonCategories.length?2:0);
   results.push({paper,score,reasons:[...new Set([...shared,...inAbstract])].slice(0,4)});
  }
  return results.sort((a,b)=>b.score-a.score||
    String(b.paper.date||"").localeCompare(String(a.paper.date||""))||
    String(a.paper.id||"").localeCompare(String(b.paper.id||"")))
    .slice(0,Math.max(0,Math.min(5,Number(limit)||3)));
 }
 return {tokens,related};
});
