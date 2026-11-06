/* Citation edges require explicit provider evidence, never title similarity. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoLiteratureGraph=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const TYPES=new Set(["cites","journal-version-of"]);
 function id(v){return String(v||"").trim().toLowerCase()}
 function edge(raw){
  if(!raw||!TYPES.has(raw.type)||!raw.from||!raw.to||!raw.provider||!raw.source_record)return null;
  const from=id(raw.from),to=id(raw.to);
  if(!/^(arxiv|biorxiv|chemrxiv):/.test(from)||!/^(arxiv|biorxiv|chemrxiv):/.test(to)||from===to)return null;
  if(!/^(https:\/\/|provider-record:)/.test(raw.source_record))return null;
  return Object.freeze({type:raw.type,from,to,provider:String(raw.provider),
   source_record:String(raw.source_record),checked_at:raw.checked_at||null,
   verification:"source-asserted"});
 }
 function build(edges){
  const seen=new Set(),accepted=[],rejected=[];
  for(const raw of edges||[]){
   const item=edge(raw);
   if(!item){rejected.push({reason:"missing-provenance-or-identity",input:raw});continue}
   const key=[item.type,item.from,item.to,item.provider,item.source_record].join("|");
   if(!seen.has(key)){seen.add(key);accepted.push(item)}
  }
  accepted.sort((a,b)=>[a.from,a.to,a.type].join("|").localeCompare([b.from,b.to,b.type].join("|")));
  return {edges:accepted,rejected_count:rejected.length,
   coverage:"explicit-provider-references-only"};
 }
 function forPaper(graph,canonicalId){
  const key=id(canonicalId);
  return (graph.edges||[]).filter(x=>x.from===key||x.to===key).map(x=>({...x,direction:x.from===key?"outgoing":"incoming"}));
 }
 return Object.freeze({edge,build,forPaper});
});