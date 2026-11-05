/* Helpers for reading-list entries not present in the rolling arXiv snapshot.
 * The saved arXiv ID itself is authoritative only as an identifier, not metadata.
 */
(function(root,factory){"use strict";const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.AxiovoLibraryOutsideCache=api;})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const RE=/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7})(?:v\d+)?$/i;
 function validId(id){return RE.test(String(id||"").trim())}
 function missing(saved,all){
  const known=new Set((Array.isArray(all)?all:[]).map(p=>String(p.id||"")));
  const bases=new Set([...known].map(id=>id.replace(/v\d+$/i,"")));
  return [...new Set((Array.isArray(saved)?saved:[]).map(String))].filter(id=>
   validId(id)&&!known.has(id)&&(!bases.has(id.replace(/v\d+$/i,""))||/v\d+$/i.test(id)));
 }
 function source(id){if(!validId(id))throw Error("Invalid arXiv ID");return "https://arxiv.org/abs/"+id}
 function exportRecords(saved,all){
  const used=new Set(),result=[];
  const papers=Array.isArray(all)?all:[];
  for(const id of (Array.isArray(saved)?saved:[])){
   if(!validId(id)||used.has(id))continue;
   used.add(id);
   const metadata=papers.find(p=>p.id===id||String(p.id||"").replace(/v\d+$/i,"")===id.replace(/v\d+$/i,""));
   result.push(metadata?{...metadata,id}:{id,title:"arXiv:"+id+" (metadata not in local index)",authors:[],published:""});
  }
  return result;
 }
 return {validId,missing,source,exportRecords};
});