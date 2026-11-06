/* Portable public collection view excludes all notes and personal settings. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoCollectionExport=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 function portable(name,papers,citations){
  if(!citations)throw Error("Citation format adapter required");
  const records=citations.unique(papers||[]).map(p=>{
   const x=citations.normalize(p);
   return {id:x.id,source:x.source,version:x.version,title:x.title,
    authors:x.authors,doi:x.doi,url:x.url,date:x.date};
  });
  return {schema_version:1,kind:"axiovo-public-collection",
   name:String(name||"Research collection").slice(0,100),coverage:"selected-papers-only",
   records};
 }
 function validate(payload){
  if(!payload||payload.kind!=="axiovo-public-collection"||payload.schema_version!==1||
     !Array.isArray(payload.records))throw Error("Unsupported collection export");
  if(payload.records.length>5000)throw Error("Collection exceeds import limit");
  for(const r of payload.records){
   const keys=Object.keys(r);
   if(keys.some(k=>!["id","source","version","title","authors","doi","url","date"].includes(k)))
    throw Error("Private or unsupported fields in public collection");
  }
  return payload;
 }
 return Object.freeze({portable,validate});
});