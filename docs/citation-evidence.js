/* On-demand, exact-identifier citation evidence, not a fabricated universal metric.
 * Citation database coverage differs; counts must never be merged or added.
 * No third-party request until a reader explicitly clicks "Check citations".
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoCitationEvidence=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const DOI=/^10\.\d{4,9}\/[^\s?#]+$/i;
 const ARXIV=/^(?:\d{4}\.\d{4,5}|[a-z.-]+(?:\/[a-z.-]+)?\/\d{7})(?:v\d+)?$/i;
 function doi(raw){
  const value=String(raw||"").trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,"").replace(/^doi:\s*/i,"");
  return DOI.test(value)?value:"";
 }
 function arxiv(p){
  const raw=String(p?.arxiv_id||p?.recordId||p?.id||"").replace(/^arxiv:/i,"").trim();
  if(p?.source!=="arxiv"&&!p?.arxiv_id)return "";
  return ARXIV.test(raw)?raw.replace(/v\d+$/i,""):"";
 }
 function identity(p){
  return {source:p?.source||"",doi:doi(p?.doi),arxiv:arxiv(p),title:String(p?.title||"").trim(),
   eprint:p?.source==="eprint"&&/^\d{4}\/\d{1,6}$/.test(String(p?.recordId||p?.id||""))?
       String(p?.recordId||p?.id):""};
 }
 function directories(p){
  const id=identity(p);if(!id.title&&!id.doi&&!id.arxiv&&!id.eprint)return [];
  // For ePrint-only records search by the actual title: a bare year/number is ambiguous outside IACR.
  const q=id.doi||id.arxiv||('"'+id.title+'"');
  const urls=[
   {name:"Google Scholar",url:"https://scholar.google.com/scholar?q="+encodeURIComponent(q),kind:"Search, not verified count"},
   {name:"Semantic Scholar",url:"https://www.semanticscholar.org/search?q="+encodeURIComponent(q),kind:"Search results"},
   {name:"OpenAlex",url:"https://openalex.org/works?search="+encodeURIComponent(q),kind:"Search results"}
  ];
  if(id.doi)urls.push({name:"Crossref",url:"https://search.crossref.org/?q="+encodeURIComponent(id.doi),kind:"DOI bibliographic record"});
  if(id.arxiv||id.doi)urls.push({name:"SciX",url:"https://scixplorer.org/abs/"+encodeURIComponent(id.arxiv?"arXiv:"+id.arxiv:id.doi),kind:"Astronomy and physics index"});
  if(id.arxiv||id.doi)urls.push({name:"INSPIRE-HEP",url:"https://inspirehep.net/literature?q="+encodeURIComponent(id.arxiv?"eprint "+id.arxiv:"doi "+id.doi),kind:"High-energy physics index"});
  if(id.source==="biorxiv"||id.doi)urls.push({name:"Europe PMC",url:"https://europepmc.org/search?query="+encodeURIComponent(id.doi?"DOI:"+id.doi:q),kind:"Life sciences index"});
  if(id.eprint)urls.push({name:"IACR ePrint",url:"https://eprint.iacr.org/"+id.eprint,kind:"Original preprint, not a citation index"});
  return urls;
 }
 function validCount(value){return Number.isSafeInteger(value)&&value>=0?value:null}
 function resultsFor(p,responses){
  const id=identity(p),out=[];
  if(id.doi&&responses?.crossref){
   const d=responses.crossref.message||{};
   if(doi(d.DOI).toLowerCase()===id.doi.toLowerCase()){
    const count=validCount(d["is-referenced-by-count"]);
    if(count!==null)out.push({name:"Crossref",count,identity:"DOI verified"});
   }
  }
  if(id.doi&&responses?.openalex){
   const w=responses.openalex;
   const candidates=[w.doi,...(Array.isArray(w.locations)?w.locations.map(x=>x?.doi):[])];
   if(candidates.some(x=>doi(x).toLowerCase()===id.doi.toLowerCase())){
    const count=validCount(w.cited_by_count);
    if(count!==null)out.push({name:"OpenAlex",count,identity:"DOI/location verified"});
   }
  }
  if(responses?.semantic){
   const d=responses.semantic,ident=d.externalIds||{};
   const matched=(id.doi&&doi(ident.DOI).toLowerCase()===id.doi.toLowerCase())||
    (id.arxiv&&String(ident.ArXiv||"").replace(/v\d+$/i,"").toLowerCase()===id.arxiv.toLowerCase());
   const count=validCount(d.citationCount);
   if(matched&&count!==null)out.push({name:"Semantic Scholar",count,identity:id.doi?"DOI/ID verified":"arXiv ID verified"});
  }
  if(id.arxiv&&responses?.inspire){
   const hits=responses.inspire.hits?.hits||[];
   for(const hit of hits){
    const eprints=hit.metadata?.arxiv_eprints||[];
    if(!eprints.some(e=>String(e.value||"").replace(/v\d+$/i,"").toLowerCase()===id.arxiv.toLowerCase()))continue;
    const count=validCount(hit.metadata?.citation_count);
    if(count!==null){out.push({name:"INSPIRE-HEP",count,identity:"arXiv ID verified"});break}
   }
  }
  return out;
 }
 async function lookup(p,signal){
  const id=identity(p),tasks={};
  const get=async url=>{
   const res=await fetch(url,{signal,headers:{Accept:"application/json"},cache:"no-store"});
   if(!res.ok)throw Error("HTTP "+res.status);
   return res.json();
  };
  if(id.doi)tasks.crossref=get("https://api.crossref.org/works/"+encodeURIComponent(id.doi));
  if(id.doi)tasks.openalex=get("https://api.openalex.org/works/"+encodeURIComponent("https://doi.org/"+id.doi));
  if(id.doi||id.arxiv)tasks.semantic=get("https://api.semanticscholar.org/graph/v1/paper/"+
   encodeURIComponent(id.doi?"DOI:"+id.doi:"ARXIV:"+id.arxiv)+"?fields=externalIds,citationCount");
  if(id.arxiv)tasks.inspire=get("https://inspirehep.net/api/literature?"+
   new URLSearchParams({q:"eprint "+id.arxiv,fields:"arxiv_eprints,citation_count",size:"3"}));
  const keys=Object.keys(tasks),completed=await Promise.allSettled(keys.map(k=>tasks[k]));
  const ok={},unavailable=[];
  completed.forEach((x,i)=>{if(x.status==="fulfilled")ok[keys[i]]=x.value;else unavailable.push(keys[i]);});
  return {counts:resultsFor(p,ok),unavailable};
 }
 function add(parent,p){
  if(!parent||!p?.title)return null;
  const details=document.createElement("details");
  details.className="axiovo-citation-evidence";
  const summary=document.createElement("summary");summary.textContent="Citation sources";
  details.append(summary);
  const body=document.createElement("div");body.className="axiovo-citation-evidence-body";
  const links=document.createElement("div");links.className="axiovo-citation-directory-links";
  for(const {name,url,kind} of directories(p)){
   const a=document.createElement("a");a.textContent=name;a.href=url;a.target="_blank";
   a.rel="noopener noreferrer";a.title=kind;links.append(a);
  }
  body.append(links);
  const warning=document.createElement("p");
  warning.textContent="Citation counts are database-specific. A missing count is unknown, not zero. A directory search is not an exact paper match.";
  body.append(warning);
  const status=document.createElement("p");status.className="axiovo-citation-status";status.setAttribute("role","status");
  status.textContent="Use the directories above or check indexed counts by DOI/arXiv ID.";
  body.append(status);
  const id=identity(p);
  if(id.doi||id.arxiv){
   const button=document.createElement("button");button.type="button";button.textContent="Check indexed counts";
   button.addEventListener("click",async()=>{
    button.disabled=true;status.textContent="Checking publisher and citation-index identifiers…";
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8500);
    try{
     const output=await lookup(p,controller.signal);
     const matched=output.counts;
     status.replaceChildren();
     if(matched.length){
      for(const item of matched){
       const tag=document.createElement("span");tag.className="axiovo-citation-count";
       tag.textContent=item.name+": "+item.count.toLocaleString()+" citations ("+item.identity+")";
       status.append(tag);
      }
     }else status.textContent="No identifier-verified counts available from the checked services.";
     if(output.unavailable.length){
      const note=document.createElement("small");note.textContent=" Some services unavailable or rate limited: "+output.unavailable.join(", ")+".";
      status.append(note);
     }
    }catch{status.textContent="Citation providers unavailable. Open their directories directly."}
    finally{clearTimeout(timeout);button.disabled=false}
   });
   body.append(button);
  }
  details.append(body);parent.append(details);return details;
 }
 return {doi,identity,directories,resultsFor,lookup,add};
});
