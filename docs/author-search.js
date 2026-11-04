/* Axiovo Author Finder: resolve name variants to OpenAlex identities before finding papers.
 * Name-only matching is only used for a clearly marked, limited local fallback.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoAuthorSearch=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const SOURCE="S4306400194";
 function clean(value){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ")}
 function rankName(name,query){
  const n=clean(name),q=clean(query);if(!n||!q)return 0;if(n===q)return 100;
  const nWords=n.split(" "),qWords=q.split(" ");
  if(n.startsWith(q+" ")||q.startsWith(n+" "))return 88;
  if(qWords.length>1&&qWords.every(part=>nWords.some(w=>w===part||w.startsWith(part))))return 80;
  if(nWords.length>1&&qWords.length>1&&nWords[nWords.length-1]===qWords[qWords.length-1]){
   let score=62;
   if(nWords[0]===qWords[0])score+=20;
   else if(nWords[0][0]===qWords[0][0])score+=12;
   return score;
  }
  if(n.includes(q)||q.includes(n))return 55;
  let dist=0;
  const prev=Array.from({length:q.length+1},(_,i)=>i);
  for(let i=1;i<=n.length;i++){
   const curr=[i];
   for(let j=1;j<=q.length;j++)curr[j]=Math.min(curr[j-1]+1,prev[j]+1,prev[j-1]+(n[i-1]===q[j-1]?0:1));
   prev.splice(0,prev.length,...curr);dist=curr[q.length];
  }
  return Math.max(0,Math.round((1-dist/Math.max(n.length,q.length))*50));
 }
 function canonicalId(raw){
  const m=String(raw||"").match(/(?:^|\/)(A\d{5,14})$/i);return m?m[1].toUpperCase():"";
 }
 function searchParams(query){
  const p=new URLSearchParams({search:String(query||"").trim(),per_page:"25",
   select:"id,display_name,display_name_alternatives,orcid,works_count,last_known_institutions"});
  return p
 }
 function worksParams(id){
  const author=canonicalId(id);if(!author)throw Error("Invalid author identifier");
  return new URLSearchParams({
   filter:"authorships.author.id:"+author,
   sort:"publication_date:desc",per_page:"200",
   select:"id,display_name,publication_date,publication_year,authorships,locations,primary_location,doi"
  })
 }
 function rankAuthors(rows,query){
  return (Array.isArray(rows)?rows:[]).filter(a=>canonicalId(a.id)).map(a=>({
   ...a,__similarity:Math.max(rankName(a.display_name,query),...(a.display_name_alternatives||[]).slice(0,15).map(x=>rankName(x,query)))
  })).sort((a,b)=>b.__similarity-a.__similarity||Number(b.works_count||0)-Number(a.works_count||0)).slice(0,20)
 }
 function arxivFromCache(work,feed){
  const title=clean(work?.display_name||work?.title);
  if(title.length<12)return null;
  const names=(work?.authorships||[]).map(a=>clean(a.author?.display_name)).filter(Boolean);
  return (Array.isArray(feed)?feed:[]).find(p=>clean(p.title)===title&&
    (p.authors||[]).some(a=>names.includes(clean(a))))||null;
 }
 function init(){
  const form=document.getElementById("axiovo-author-form"),input=document.getElementById("axiovo-author-query");
  const candidates=document.getElementById("axiovo-author-candidates"),papers=document.getElementById("axiovo-author-papers");
  const status=document.getElementById("axiovo-author-status");if(!form||!input||!candidates||!papers||!status)return;
  const arxiv=window.ResearchLensArxiv;
  let controller=null;
  function abort(){if(controller)controller.abort();controller=new AbortController();return controller}
  function element(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
  function anchor(parent,label,url){
   const a=element("a",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";parent.append(a);return a;
  }
  async function semanticScholarFallback(query){
   try{
    const params=new URLSearchParams({query,limit:"12",fields:"name,aliases,affiliations,paperCount"});
    const r=await fetch("https://api.semanticscholar.org/graph/v1/author/search?"+params);
    if(!r.ok)throw Error("Semantic Scholar HTTP "+r.status);
    const data=await r.json();
    const authors=(Array.isArray(data.data)?data.data:[]).filter(a=>/^\d+$/.test(String(a.authorId||"")))
     .map(a=>({...a,__score:Math.max(rankName(a.name,query),...(a.aliases||[]).map(x=>rankName(x,query)))}))
     .sort((a,b)=>b.__score-a.__score).slice(0,12);
    if(!authors.length)return false;
    candidates.replaceChildren();papers.replaceChildren();
    status.textContent="OpenAlex unavailable. Semantic Scholar researcher identities found. Select a name to inspect its arXiv-linked papers; identical names may represent different people.";
    for(const author of authors){
     const box=element("div",undefined,"axiovo-author-identity");
     const b=element("button",author.name+" · S2:"+author.authorId,"axiovo-author-choice");b.type="button";
     box.append(b,element("small",(author.affiliations||[]).join("; ")+" · "+(author.paperCount||0)+" indexed works · Semantic Scholar"));
     b.onclick=async()=>{
      const id=author.authorId;const c=abort();
      papers.replaceChildren();status.textContent="Retrieving indexed papers by "+author.name+"…";
      try{
       const api="https://api.semanticscholar.org/graph/v1/author/"+id+
        "/papers?"+new URLSearchParams({limit:"100",fields:"title,year,externalIds,authors,publicationDate"});
       const response=await fetch(api,{signal:c.signal});
       if(!response.ok)throw Error("Semantic Scholar HTTP "+response.status);
       const result=await response.json();if(c.signal.aborted)return;
       const matched=(result.data||[]).map(p=>({p,id:arxiv?.parse(p.externalIds?.ArXiv)})).filter(x=>x.id);
       status.textContent=matched.length+" arXiv IDs found in Semantic Scholar for "+author.name+". This provider may have missing publications.";
       for(const item of matched){const card=element("article",undefined,"axiovo-author-paper");
        anchor(card,item.p.title||"Untitled work",arxiv.abs(item.id.base));
        card.append(element("small",String(item.p.publicationDate||item.p.year||"Date unavailable")+" · Semantic Scholar index date (not arXiv v1)"));
        papers.append(card)}
       if(!matched.length)papers.append(element("p","No arXiv identifiers present in this provider's returned author publications."));
      }catch(e){if(!c.signal.aborted)status.textContent="Semantic Scholar paper retrieval failed. Try again or visit the original arXiv author search."}
     };
     candidates.append(box)
    }
    return true;
   }catch(e){return false}
  }
  async function localFallback(query){
   try{
    const response=await fetch("./data/feed.json",{cache:"no-store"});
    if(!response.ok)throw Error("Local feed unavailable");
    const data=await response.json(),feed=Array.isArray(data.papers)?data.papers:[];
    const names=[...new Set(feed.flatMap(p=>p.authors||[]).filter(a=>typeof a==="string"))];
    const matches=names.map(name=>({name,score:rankName(name,query)})).filter(x=>x.score>=55)
     .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,14);
    candidates.replaceChildren();
    if(!matches.length){status.textContent="Author identity service unavailable. No matching names in the limited local paper snapshot.";return}
    status.textContent="Local-only name matches. Identity not verified: identical names may belong to different researchers.";
    for(const row of matches){
     const b=element("button",row.name+" · search cached papers","axiovo-author-choice");
     b.type="button";b.onclick=()=>{
      papers.replaceChildren();
      const related=feed.filter(p=>(p.authors||[]).some(name=>clean(name)===clean(row.name))).slice(0,40);
      for(const p of related){const box=element("article",undefined,"axiovo-author-paper");
       anchor(box,p.title||"Untitled paper","https://arxiv.org/abs/"+encodeURIComponent(p.id));
       box.append(element("small",(p.published||"").slice(0,10)+" · arXiv first submission · "+(p.authors||[]).join(", ")));
       papers.append(box)}
      if(!related.length)papers.append(element("p","No matching cached papers."));
     };candidates.append(b)
    }
   }catch(e){status.textContent="Author search unavailable. Try the official arXiv author search."; }
  }
  async function showWorks(author){
   const ctl=abort(),id=canonicalId(author.id);if(!id)return;
   papers.replaceChildren();status.textContent="Searching research by "+author.display_name+" ("+id+")…";
   let feed=[],works=[],problem="";
   try{
    const response=await fetch("./data/feed.json",{signal:ctl.signal,cache:"no-store"});
    if(response.ok){const snapshot=await response.json();feed=Array.isArray(snapshot.papers)?snapshot.papers:[];}
   }catch(error){if(ctl.signal.aborted)return}
   try{
    const response=await fetch("https://api.openalex.org/works?"+worksParams(id),{signal:ctl.signal});
    if(!response.ok)throw Error("OpenAlex HTTP "+response.status);
    const data=await response.json();works=Array.isArray(data.results)?data.results:[];
   }catch(error){if(ctl.signal.aborted)return;problem=String(error.message||error)}
   if(ctl.signal.aborted)return;
   const verified=[],seen=new Set();
   for(const work of works){
    const record=arxiv?.candidates(work)?.[0],cached=record?null:arxivFromCache(work,feed);
    const idFound=record?.base||cached?.id;if(!idFound||seen.has(idFound))continue;
    seen.add(idFound);
    verified.push({work,id:idFound,source:record?"arXiv location indexed":"arXiv preprint matched by title and coauthor"});
   }
   for(const row of verified){
    const box=element("article",undefined,"axiovo-author-paper");
    anchor(box,row.work.display_name||"Untitled work","https://arxiv.org/abs/"+encodeURIComponent(row.id));
    box.append(element("small",(row.work.publication_date||"Date unknown")+
      " · OpenAlex publication date · "+row.source));
    papers.append(box);
   }
   const possible=feed.filter(p=>!seen.has(p.id)&&
    (p.authors||[]).some(name=>rankName(name,author.display_name)>=78))
    .sort((a,b)=>String(b.published||"").localeCompare(String(a.published||""))).slice(0,30);
   if(possible.length){
    papers.append(element("h3","Additional cached arXiv matches (author identity not verified)"));
    for(const record of possible){
     const box=element("article",undefined,"axiovo-author-paper");
     anchor(box,record.title||"Untitled work","https://arxiv.org/abs/"+encodeURIComponent(record.id));
     box.append(element("small",String(record.published||"").slice(0,10)+
       " · arXiv first submitted · matching name; could be another researcher"));
     papers.append(box);
    }
   }
   status.textContent=verified.length+" arXiv-linked works associated with OpenAlex author "+id+
    (possible.length?"; "+possible.length+" additional name-only matches.":"")+
    (problem?" OpenAlex unavailable: "+problem+".":"")+
    (!verified.length&&!possible.length?" No matches in these sources; this does not mean the author has no arXiv papers.":"");
  }
  form.addEventListener("submit",async e=>{
   e.preventDefault();const query=input.value.trim();if(query.length<2){status.textContent="Enter at least two characters of an author's name.";return}
   const ctl=abort();candidates.replaceChildren();papers.replaceChildren();
   status.textContent="Finding matching and similar researcher names…";
   try{
    const r=await fetch("https://api.openalex.org/authors?"+searchParams(query),{signal:ctl.signal,headers:{Accept:"application/json"}});
    if(!r.ok)throw Error("OpenAlex HTTP "+r.status);
    const data=await r.json();if(ctl.signal.aborted)return;
    const matches=rankAuthors(data.results,query);
    if(!matches.length){status.textContent="No OpenAlex identities found. Trying another scholarly index…";if(!await semanticScholarFallback(query))await localFallback(query);return}
    status.textContent="Select a researcher identity below. Similar names are suggestions, not proof of the same person. Check institution or ORCID when available.";
    for(const author of matches){
     const wrap=element("div",undefined,"axiovo-author-identity");
     const affiliation=(author.last_known_institutions||[]).map(x=>x.display_name).filter(Boolean).slice(0,2).join("; ");
     const heading=element("button",author.display_name+" · "+canonicalId(author.id),"axiovo-author-choice");
     heading.type="button";heading.onclick=()=>showWorks(author);wrap.append(heading);
     wrap.append(element("small",(affiliation||"Affiliation not listed")+
       " · "+Number(author.works_count||0)+" indexed works"+
       (author.orcid?" · ORCID listed":"")+
       (clean(author.display_name)===clean(query)?" · Exact name":" · Similar name")));
     if(/^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-[\dX]{4}$/i.test(String(author.orcid||"")))anchor(wrap,"View ORCID ↗",author.orcid);
     candidates.append(wrap)
    }
   }catch(err){if(!ctl.signal.aborted){if(!await semanticScholarFallback(query))await localFallback(query)}}
  });
  const urlQuery=new URLSearchParams(location.search).get("author");
  if(urlQuery){input.value=urlQuery.slice(0,120);form.requestSubmit()}
 }
 if(typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
 }
 return {clean,rankName,canonicalId,searchParams,worksParams,rankAuthors};
});