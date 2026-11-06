/* Feature-flagged lexical/hybrid retrieval. Legacy search remains default. */
(function(root,factory){
 const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoSearchCore=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 function search(candidates,request,{lexical,hybrid,contract,semanticResults=[]}={}){
  const filters=contract||root?.AxiovoSearchContract;
  const bm=lexical||root?.AxiovoBM25,rrf=hybrid||root?.AxiovoHybridRank;
  if(!filters||!bm||!rrf)throw Error("Search dependencies not loaded");
  const q=filters.canonical(request);
  const valid=(candidates||[]).filter(p=>filters.eligible(p,q));
  let lexicalRank;
  if(q.identity){
   lexicalRank=valid.map(p=>({paper:p,id:rrf.identity(p),score:1}));
  }else{
   lexicalRank=bm.score(bm.create(valid),q.q,()=>true);
  }
  const hybridEnabled=q.mode==="hybrid" && !q.identity && semanticResults.length>0;
  // Semantic candidates may rank but never introduce unverified bibliography.
  // Only exact identities already present in the source-validated candidate corpus are eligible.
  const validById=new Map(valid.map(p=>[rrf.identity(p),p]));
  const semantic=hybridEnabled?semanticResults.map(row=>{
   const p=row.paper||row,verified=validById.get(rrf.identity(p));
   return verified?{paper:verified,id:rrf.identity(verified)}:null;
  }).filter(Boolean):[];
  const ranked=hybridEnabled?rrf.fuse({lexical:lexicalRank,semantic}):lexicalRank;
  const getDate=p=>String(p.date||p.submitted_date||p.published||"");
  const getCite=p=>p.citations===null||p.citations===undefined||p.citations===""?null:(Number.isFinite(Number(p.citations))?Number(p.citations):null);
  if(q.sort==="newest")ranked.sort((a,b)=>getDate(b.paper).localeCompare(getDate(a.paper))||a.id.localeCompare(b.id));
  if(q.sort==="oldest")ranked.sort((a,b)=>getDate(a.paper).localeCompare(getDate(b.paper))||a.id.localeCompare(b.id));
  if(q.sort==="title")ranked.sort((a,b)=>String(a.paper.title).localeCompare(String(b.paper.title))||a.id.localeCompare(b.id));
  if(q.sort==="cited")ranked.sort((a,b)=>{
   const n=getCite(a.paper),m=getCite(b.paper);
   return (m===null?-1:m)-(n===null?-1:n)||a.id.localeCompare(b.id);
  });
  const start=(q.page-1)*q.pageSize;
  return {query:q,method:q.identity?"exact-identifier":hybridEnabled?"hybrid-rrf":"bm25",
   coverage:"candidate-corpus-only",total:ranked.length,items:ranked.slice(start,start+q.pageSize)};
 }
 return Object.freeze({search});
});