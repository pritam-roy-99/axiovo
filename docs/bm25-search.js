/* Deterministic source-only BM25. Index only source-linked, validated records. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoBM25=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const K1=1.2,B=0.75;
 const WEIGHTS={title:4.2,abstract:1,authors:2,categories:2.3,identifier:6};
 const stop=new Set("a an and are as at be by for from in is it of on or that the to using via with".split(" "));
 function terms(text){
  return (String(text||"").normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+(?:[.-][\p{L}\p{N}]+)*/gu)||[])
    .filter(t=>!stop.has(t)&&t.length>1).slice(0,1200);
 }
 function key(p){
  const source=String(p.source||"").toLowerCase();
  const id=String(p.source_id||p.recordId||p.id||p.doi||"");
  return source+":"+id+":"+String(p.version??"");
 }
 function create(papers){
  const documents=[],df=new Map();let sum=0;
  for(const p of papers||[]){
   if(!p||!p.title||!p.source||!(p.landing_url||p.url))continue;
   const fields={
    title:terms(p.title),abstract:terms(p.abstract||""),
    authors:terms((p.authors||[]).map(x=>typeof x==="string"?x:x.name).join(" ")),
    categories:terms((p.categories||[]).join(" ")),
    identifier:terms((p.source_id||p.recordId||p.doi||p.id||""))
   };
   const tf=new Map(),length=Object.values(fields).reduce((n,a)=>n+a.length,0);
   for(const [field,words] of Object.entries(fields)){
    for(const word of words){
     const map=tf.get(word)||{};map[field]=(map[field]||0)+1;tf.set(word,map);
    }
   }
   for(const word of tf.keys())df.set(word,(df.get(word)||0)+1);
   documents.push({paper:p,key:key(p),tf,length});sum+=length;
  }
  return {documents,df,N:documents.length,avg:sum/Math.max(1,documents.length)};
 }
 function score(index,query,eligible=()=>true){
  const tokens=[...new Set(terms(query))],rank=[];
  if(!tokens.length)return rank;
  for(const d of index.documents){
   if(!eligible(d.paper))continue;
   let total=0;
   for(const t of tokens){
    const fields=d.tf.get(t);if(!fields)continue;
    const matches=Object.entries(fields).reduce((s,[f,n])=>s+(WEIGHTS[f]||1)*n,0);
    const idf=Math.log(1+(index.N-(index.df.get(t)||0)+0.5)/((index.df.get(t)||0)+0.5));
    total+=idf*(matches*(K1+1))/(matches+K1*(1-B+B*d.length/index.avg));
   }
   if(total>0)rank.push({paper:d.paper,id:d.key,score:total,method:"BM25"});
  }
  return rank.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 }
 return Object.freeze({terms,create,score,WEIGHTS});
});