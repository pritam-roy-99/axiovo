/* Verified, on-demand, per-paper citation evidence.
   Provider counts have different coverage. Searches never masquerade as exact records.
   Only direct identifier matches may display a numerical count or paper detail link. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoCitationEvidence=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const DOI=/^10\.\d{4,9}\/[^\s?#]+$/i;
 const ARXIV=/^(?:\d{4}\.\d{4,5}|[a-z.-]+(?:\/[a-z.-]+)?\/\d{7})(?:v\d+)?$/i;
 const EPRINT=/^\d{4}\/\d{1,6}$/;
 const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
 const canonical=s=>String(s||"").trim().normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const cleanId=s=>String(s||"").replace(/v\d+$/i,"").trim();
 function doi(raw){
  const val=String(raw||"").trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,"").replace(/^doi:\s*/i,"");
  return DOI.test(val)?val:"";
 }
 function arxiv(p){
  const raw=String(p?.arxiv_id||p?.recordId||p?.id||"").replace(/^arxiv:/i,"").trim();
  if(p?.source!=="arxiv"&&!p?.arxiv_id)return "";
  return ARXIV.test(raw)?cleanId(raw):"";
 }
 function identity(p){
  const source=String(p?.source||"");
  const raw=String(p?.recordId||p?.id||"");
  return {source,doi:doi(p?.doi),arxiv:arxiv(p),title:String(p?.title||"").trim(),
   eprint:source==="eprint"&&EPRINT.test(raw)?raw:""};
 }
 function titleMatches(a,b){
  const left=canonical(a),right=canonical(b);
  return !!left&&!!right&&(left===right||left.length>32&&right.length>32&&(
   left.includes(right)&&right.length/left.length>.94||
   right.includes(left)&&left.length/right.length>.94));
 }
 function safePaperLink(url,host){
  try{
   const u=new URL(url);
   return u.protocol==="https:"&&(u.hostname===host||u.hostname.endsWith("."+host))?u.href:"";
  }catch{return ""}
 }
 function directories(p){
  const id=identity(p),q=id.doi||id.arxiv||('"'+id.title+'"');
  const list=[];
  if(id.doi)list.push({name:"DOI record",url:"https://doi.org/"+encodeURIComponent(id.doi),kind:"Exact DOI resolver"});
  if(id.arxiv)list.push({name:"arXiv record",url:"https://arxiv.org/abs/"+encodeURIComponent(id.arxiv),kind:"Exact arXiv identifier"});
  if(id.eprint)list.push({name:"IACR ePrint record",url:"https://eprint.iacr.org/"+id.eprint,kind:"Exact IACR identifier; not a citation count"});
  // Directory searches are explicitly optional fallbacks and never labeled verified.
  if(id.title)list.push({name:"Search Google Scholar (unverified)",url:"https://scholar.google.com/scholar?q="+encodeURIComponent('"'+id.title+'"'),kind:"Search only; may match multiple versions or other papers"});
  return list;
 }
 function resultsFor(p,responses){
  const id=identity(p),out=[];
  const add=(name,n,detail,link,verifiedBy)=>{
   const value=count(n);
   if(value===null||!link)return;
   out.push({name,count:value,identity:verifiedBy,url:link,detail});
  };
  const crossref=responses?.crossref?.message;
  if(id.doi&&crossref&&doi(crossref.DOI).toLowerCase()===id.doi.toLowerCase()){
   add("Crossref",crossref["is-referenced-by-count"],"Publisher citation index",
    "https://search.crossref.org/?q="+encodeURIComponent(id.doi),"Exact DOI");
  }
  const openalex=responses?.openalex;
  if(id.doi&&openalex&&doi(openalex.doi).toLowerCase()===id.doi.toLowerCase()&&
     /^https:\/\/openalex\.org\/W\d+$/.test(String(openalex.id||""))){
   add("OpenAlex",openalex.cited_by_count,"OpenAlex indexed citations",
    openalex.id,"Exact DOI");
  }
  const semantic=responses?.semantic;
  if(semantic){
   const external=semantic.externalIds||{};
   const verified=!!(id.doi&&doi(external.DOI).toLowerCase()===id.doi.toLowerCase()||
    id.arxiv&&cleanId(external.ArXiv).toLowerCase()===id.arxiv.toLowerCase());
   const link=/^[a-f0-9]{40}$/i.test(String(semantic.paperId||""))
     ?"https://www.semanticscholar.org/paper/"+semantic.paperId:"";
   if(verified)add("Semantic Scholar",semantic.citationCount,"Semantic Scholar indexed citations",link,
    id.arxiv&&cleanId(external.ArXiv).toLowerCase()===id.arxiv.toLowerCase()?"Exact arXiv ID":"Exact DOI");
  }
  const hits=responses?.inspire?.hits?.hits||[];
  if(id.arxiv&&Array.isArray(hits)){
   for(const hit of hits){
    const eprints=hit?.metadata?.arxiv_eprints||[];
    if(!eprints.some(e=>cleanId(e?.value).toLowerCase()===id.arxiv.toLowerCase()))continue;
    const record=String(hit?.id||"");
    if(/^\d+$/.test(record))add("INSPIRE-HEP",hit?.metadata?.citation_count,"HEP literature index",
      "https://inspirehep.net/literature/"+record,"Exact arXiv ID");
    break;
   }
  }
  return out;
 }
 function fetchJson(url,signal){
  return fetch(url,{signal,headers:{Accept:"application/json"},cache:"no-store"}).then(async r=>{
   if(!r.ok)throw Error("HTTP "+r.status);
   return r.json();
  });
 }
 async function lookup(p,signal){
  const id=identity(p),tasks={};
  if(id.doi){
   tasks.crossref=fetchJson("https://api.crossref.org/works/"+encodeURIComponent(id.doi),signal);
   tasks.openalex=fetchJson("https://api.openalex.org/works/"+encodeURIComponent("https://doi.org/"+id.doi),signal);
  }
  if(id.doi||id.arxiv){
   // arXiv is preferred for arXiv preprints; an associated journal DOI might
   // be an entirely different version in a given citation index.
   const key=id.arxiv?"ARXIV:"+id.arxiv:"DOI:"+id.doi;
   tasks.semantic=fetchJson("https://api.semanticscholar.org/graph/v1/paper/"+
    encodeURIComponent(key)+"?fields=paperId,title,externalIds,citationCount",signal);
  }
  if(id.arxiv){
   tasks.inspire=fetchJson("https://inspirehep.net/api/literature?"+
    new URLSearchParams({q:"eprint "+id.arxiv,fields:"arxiv_eprints,citation_count",size:"5"}),signal);
  }
  const keys=Object.keys(tasks),states=await Promise.allSettled(keys.map(k=>tasks[k]));
  const responses={},unavailable=[];
  states.forEach((result,i)=>result.status==="fulfilled"?responses[keys[i]]=result.value:unavailable.push(keys[i]));
  const verified=resultsFor(p,responses);
  return {counts:verified,unavailable,checkedAt:new Date().toISOString(),hasIdentifier:!!(id.doi||id.arxiv)};
 }
 function add(parent,p){
  if(!parent||!p?.title||typeof document==="undefined")return null;
  const details=document.createElement("details");details.className="axiovo-citation-evidence";
  const summary=document.createElement("summary");summary.textContent="Citation sources";details.append(summary);
  let mounted=false,requesting=false;
  details.addEventListener("toggle",()=>{
   if(!details.open||mounted)return;
   mounted=true;
   const body=document.createElement("div");body.className="axiovo-citation-evidence-body";
   const id=identity(p);
   const note=document.createElement("p");
   note.textContent="Citation counts are provider-specific, not additive. Only exact DOI or arXiv ID matches are accepted; 0 means a provider reports zero, while unknown means no verified result.";
   const heading=document.createElement("p");heading.className="axiovo-citation-heading";
   heading.textContent="Verified citation counts for this paper";
   const results=document.createElement("div");results.className="axiovo-citation-verified";
   const status=document.createElement("p");status.className="axiovo-citation-status";status.setAttribute("role","status");status.setAttribute("aria-live","polite");
   status.textContent=id.doi||id.arxiv?"Choose Check exact citations to query citation providers.":"No DOI or arXiv identifier available for exact citation lookup.";
   body.append(heading,results,status,note);
   if(id.doi||id.arxiv){
    const button=document.createElement("button");button.type="button";button.textContent="Check exact citations";
    button.addEventListener("click",async()=>{
     if(requesting)return;
     requesting=true;button.disabled=true;status.textContent="Matching provider records by DOI/arXiv identifier…";
     const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
     try{
      const outcome=await lookup(p,abort.signal);
      results.replaceChildren();
      if(outcome.counts.length){
       for(const item of outcome.counts){
        const anchor=document.createElement("a");
        anchor.href=item.url;anchor.target="_blank";anchor.rel="noopener noreferrer";
        anchor.className="axiovo-citation-count";
        anchor.textContent=item.name+": "+item.count.toLocaleString()+" citations";
        anchor.title=item.identity+" · Open the exact verified provider record";
        const proof=document.createElement("small");proof.textContent=item.identity;
        anchor.append(proof);results.append(anchor);
       }
       status.textContent="Checked "+new Date(outcome.checkedAt).toLocaleString()+". Counts may differ by database.";
      }else status.textContent="Citation count unknown: no exact provider record was verified.";
      if(outcome.unavailable.length)status.textContent+=" Unavailable or rate-limited: "+outcome.unavailable.join(", ")+".";
     }catch{status.textContent="Citation services unavailable. No unverified counts have been displayed."}
     finally{clearTimeout(timer);button.disabled=false;requesting=false}
    });
    body.append(button);
   }
   const originals=document.createElement("div");
   originals.className="axiovo-citation-directory-links";
   for(const item of directories(p)){
    const a=document.createElement("a");a.textContent=item.name;a.href=item.url;
    a.target="_blank";a.rel="noopener noreferrer";a.title=item.kind;
    originals.append(a);
   }
   const directoryHeading=document.createElement("p");
   directoryHeading.className="axiovo-citation-heading";
   directoryHeading.textContent="Original identifiers and optional search";
   body.append(directoryHeading,originals);details.append(body);
  });
  parent.append(details);return details;
 }
 return {doi,arxiv,identity,directories,resultsFor,lookup,add};
});
