/* Strict literal quote verification: no automatic theorem or scientific validity certification. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoClaimVerifier=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 function verify(claim,evidenceIndex){
  if(!claim||typeof claim!=="object")return {valid:false,reason:"missing-claim"};
  if(!claim.source_id||!claim.passage_id)return {valid:false,reason:"citation-anchor-missing"};
  const passage=evidenceIndex?.[claim.passage_id];
  if(!passage||passage.source_id!==claim.source_id)return {valid:false,reason:"wrong-paper-or-missing-passage"};
  if(claim.version!==undefined&&claim.version!==passage.version)return {valid:false,reason:"revision-mismatch"};
  const quote=String(claim.quote||"").trim(),source=String(passage.text||"");
  if(!quote||!source.includes(quote))return {valid:false,reason:"quotation-not-in-source"};
  if(!passage.source_url||!/^https:\/\//.test(passage.source_url))return {valid:false,reason:"source-link-missing"};
  return {valid:true,reason:"literal-span-present",source_url:passage.source_url,
    note:"Literal presence does not establish scientific support for a paraphrased claim"};
 }
 function checkAll(claims,index){return (claims||[]).map(c=>verify(c,index))}
 return Object.freeze({verify,checkAll});
});