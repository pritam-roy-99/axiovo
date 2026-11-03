/* arXiv ID/version helpers. Source URLs always point to arxiv.org.
 * Local snapshots are NOT a completeness authority for historical papers.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.ResearchLensArxiv=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const PATTERN=/^(?:arxiv:)?((?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7}))(?:v([1-9]\d*))?$/i;
 function parse(value){
  if(typeof value!=="string")return null;
  let v=value.trim();
  v=v.replace(/^https?:\/\/(?:export\.|www\.)?arxiv\.org\/(?:abs|pdf)\//i,"").replace(/\.pdf(?:\?.*)?$/i,"");
  v=v.replace(/\?.*$/,"").replace(/#.*$/,"");
  const m=v.match(PATTERN);
  if(!m)return null;
  const version=m[2]?Number(m[2]):null;
  if(version!==null&&(!Number.isSafeInteger(version)||version>9999))return null;
  const base=m[1];
  return {base,version,requested:base+(version?"v"+version:""),explicit:version!==null};
 }
 function abs(value){const p=parse(value);return p?"https://arxiv.org/abs/"+p.requested:null}
 function pdf(value){const p=parse(value);return p?"https://arxiv.org/pdf/"+p.requested:null}
 function base(value){return parse(value)?.base||""}
 function candidates(work){
  const entries=[...(work?.locations||[]),work?.primary_location,work?.best_oa_location].filter(Boolean);
  const out=new Map();
  for(const loc of entries){
   for(const raw of [loc.landing_page_url,loc.pdf_url]){
    const p=parse(raw);if(!p)continue;
    // Do not substitute metadata 'submittedVersion' for arXiv's actual vN.
    if(!out.has(p.requested))out.set(p.requested,p);
   }
  }
  return [...out.values()].sort((a,b)=>a.base.localeCompare(b.base)||(a.version||0)-(b.version||0));
 }
 function resolve(work,preferred){
  const p=parse(preferred||"");
  const found=candidates(work);
  if(p){
   const same=found.find(x=>x.base.toLowerCase()===p.base.toLowerCase());
   return {requested:p,verified:Boolean(same),source:same||p};
  }
  return found.length?{requested:found[0],verified:true,source:found[0]}:null;
 }
 function officialSearchUrl(text){
  const p=parse(text);if(p)return abs(p.requested);
  const qs=new URLSearchParams({query:String(text||"").trim(),searchtype:"all",abstracts:"show",order:"-announced_date_first",size:"50"});
  return "https://arxiv.org/search/?"+qs;
 }
 return {parse,abs,pdf,base,candidates,resolve,officialSearchUrl};
});