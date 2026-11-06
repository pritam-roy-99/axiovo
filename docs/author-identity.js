/* Verified researcher identifiers are optional; a display name is not identity proof. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoAuthorIdentity=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 function orcid(value){
  const raw=String(value||"").trim().replace(/^https?:\/\/orcid\.org\//i,"");
  if(!/^\d{4}-\d{4}-\d{4}-[\dX]{4}$/.test(raw))return null;
  const chars=raw.replace(/-/g,"");
  let running=0;
  for(const char of chars.slice(0,15))running=(running+Number(char))*2%11;
  const check=(12-running)%11,expected=check===10?"X":String(check);
  return chars[15]===expected?raw:null;
 }
 function openAlex(value){
  const raw=String(value||"").trim().replace(/^https?:\/\/openalex\.org\//i,"");
  return /^A[1-9]\d*$/.test(raw)?raw:null;
 }
 function candidate(data,origin){
  if(!data||typeof data!=="object"||!data.name||!origin)return null;
  const oid=orcid(data.orcid),aid=openAlex(data.openalex);
  return {name:String(data.name).trim(),orcid:oid,openalex:aid,
    provider:String(origin),confirmed:false,
    status:oid||aid?"unconfirmed-id-candidate":"unresolved-name"};
 }
 function confirmed(data,{userConfirmed=false}={}){
  if(!data||!userConfirmed)return null;
  const oid=orcid(data.orcid),aid=openAlex(data.openalex);
  if(!oid&&!aid)return null;
  return {name:String(data.name||"").trim(),orcid:oid,openalex:aid,
   provider:String(data.provider||"source-metadata"),confirmed:true};
 }
 function sameResearcher(a,b){
  if(!a?.confirmed||!b?.confirmed)return false;
  return !!((a.orcid&&b.orcid&&a.orcid===b.orcid)||
    (a.openalex&&b.openalex&&a.openalex===b.openalex));
 }
 return Object.freeze({orcid,openAlex,candidate,confirmed,sameResearcher});
});