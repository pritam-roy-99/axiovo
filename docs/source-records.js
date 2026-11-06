/* Axiovo v2 metadata adapter. Additive: existing search and saved Library
 * objects remain unchanged until individual consumers opt in.
 * This adapter does not read or write localStorage.
 */
(function(root){
"use strict";
const SOURCE_NAMES={arxiv:"arxiv",biorxiv:"biorxiv",chemrxiv:"chemrxiv"};
const ARXIV=/^(\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7})(?:v([1-9]\d*))?$/i;
const DOI=/^10\.\d{4,9}\/[-a-z0-9._;()\/:+]+$/i;
function clean(value){return String(value??"").replace(/\s+/g," ").trim()}
function source(value){return SOURCE_NAMES[clean(value).toLowerCase()]||null}
function doi(value){
 let v=clean(value).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,"").replace(/^doi:/i,"").toLowerCase();
 try{v=decodeURIComponent(v)}catch{return null}
 return DOI.test(v)?v:null;
}
function arxiv(value){
 let v=clean(value).replace(/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//i,"").replace(/\.pdf$/i,"");
 const match=v.match(ARXIV);
 if(!match)return null;
 const n=match[2]?Number(match[2]):null;
 if(n!==null&&n>9999)return null;
 return {base:match[1],version:n};
}
function fromV2(p){
 if(!p||p.schema_version!==2||!p.validation?.identity_verified)return null;
 const s=source(p.source);
 if(!s||!clean(p.title))return null;
 const pinned=p.version===null?null:Number(p.version);
 if(pinned!==null&&(!Number.isInteger(pinned)||pinned<1||pinned>9999))return null;
 let base,recordId,link,pdf,normalizedDOI=null;
 if(s==="arxiv"){
   const id=arxiv(p.source_id);
   if(!id||id.version!==null||p.id!=="arxiv:"+id.base)return null;
   base=id.base;recordId=base+(pinned?"v"+pinned:"");
   link="https://arxiv.org/abs/"+recordId;
   pdf="https://arxiv.org/pdf/"+recordId;
   normalizedDOI=p.doi?doi(p.doi):null;
 }else{
   normalizedDOI=doi(p.source_id);
   if(!normalizedDOI||p.id!==s+":"+normalizedDOI)return null;
   if(s==="biorxiv"&&!/^10\.(?:1101|64898)\//.test(normalizedDOI))return null;
   if(s==="chemrxiv"&&!normalizedDOI.startsWith("10.26434/chemrxiv"))return null;
   base=normalizedDOI;recordId=base;
   link=s==="biorxiv"?"https://www.biorxiv.org/content/"+base+(pinned?"v"+pinned:""):"https://doi.org/"+base;
   pdf=s==="biorxiv"?link+".full.pdf":null;
 }
 if(p.landing_url!==link||p.pdf_url!==pdf)return null;
 const authors=Array.isArray(p.authors)?p.authors.map(a=>clean(a?.name||a)).filter(Boolean):[];
 return Object.freeze({
   source:s,id:base,recordId,canonicalId:p.id,version:pinned,
   title:clean(p.title),abstract:clean(p.abstract),authors,
   categories:Array.isArray(p.categories)?p.categories.map(clean).filter(Boolean):[],
   date:p.submitted_date||null,announcementDate:p.announced_date||null,
   updatedDate:p.updated_date||null,doi:normalizedDOI,
   url:link,pdf,provenance:p.provenance||null,
   validation:p.validation
 });
}
function fromLegacy(s,p){
 const provider=source(s||p?.source);
 if(!provider||!p||!clean(p.title))return null;
 const parse=provider==="arxiv"?arxiv(p.recordId||p.id||p.arxiv_id||p.url):null;
 const normalizedDOI=provider!=="arxiv"?doi(p.doi||p.DOI||p.id):null;
 if(provider==="arxiv"&&!parse||provider!=="arxiv"&&!normalizedDOI)return null;
 if(provider==="biorxiv"&&!/^10\.(?:1101|64898)\//.test(normalizedDOI))return null;
 if(provider==="chemrxiv"&&!normalizedDOI.startsWith("10.26434/chemrxiv"))return null;
 const version=provider==="arxiv"?parse.version:
   (Number.isInteger(p.version)&&p.version>0?p.version:null);
 const base=provider==="arxiv"?parse.base:normalizedDOI;
 const recordId=base+(provider==="arxiv"&&version?"v"+version:"");
 const url=provider==="arxiv"?"https://arxiv.org/abs/"+recordId:
   provider==="biorxiv"?"https://www.biorxiv.org/content/"+base+(version?"v"+version:""):
   "https://doi.org/"+base;
 return Object.freeze({source:provider,id:base,recordId,canonicalId:provider+":"+base,
   version,title:clean(p.title),abstract:clean(p.abstract||p.summary),
   authors:Array.isArray(p.authors)?p.authors.map(a=>clean(a?.name||a)).filter(Boolean):[],
   categories:Array.isArray(p.categories)?p.categories:[],
   date:p.submitted_date||p.published||p.date||null,
   announcementDate:p.announced_date||p.announcement_date||null,
   doi:normalizedDOI,url,
   pdf:provider==="arxiv"?"https://arxiv.org/pdf/"+recordId:provider==="biorxiv"?url+".full.pdf":null,
   provenance:null,validation:{metadata_status:"legacy-unverified",identity_verified:false,warnings:["Legacy object: retain original source verification"]}});
}
function convert(p,sourceHint){
 return p?.schema_version===2?fromV2(p):fromLegacy(sourceHint,p);
}
const api=Object.freeze({convert,fromV2,fromLegacy,arxiv,doi});
root.AxiovoSourceRecords=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
