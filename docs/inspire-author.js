/* Optional exact-author bibliography lookup through the public INSPIRE-HEP API.
 * Coverage is physics-oriented and intentionally not presented as full arXiv search.
 * Only source-provided arXiv identifiers are linkable.
 */
(function(root,factory){"use strict";const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.AxiovoInspireAuthors=api})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const ID=/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7})(?:v\d+)?$/i;
 function clean(v){return String(v||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ")}
 function person(name){
  const s=String(name||"").trim();
  if(s.includes(",")){const parts=s.split(",").map(clean);if(parts.length>=2)return{given:parts.slice(1).join(" "),family:parts[0]}}
  const parts=clean(s).split(" ").filter(Boolean);return{given:parts.slice(0,-1).join(" "),family:parts[parts.length-1]||""};
 }
 function sameAuthor(indexed,query){
  const a=person(indexed),q=person(query);
  if(!a.given||!q.given||a.family!==q.family)return false;
  if(a.given===q.given)return true;
  // An initial is ambiguous, so do not silently call it a verified full-name match.
  if(a.given.length===1||q.given.length===1)return false;
  return a.given.split(" ")[0]===q.given.split(" ")[0];
 }
 function params(query){
  const p=person(query);if(!p.given||!p.family)throw Error("Enter a full given name and surname");
  return new URLSearchParams({q:"ea "+p.family+", "+p.given,size:"50",fields:"titles,authors,arxiv_eprints,earliest_date",sort:"mostrecent"});
 }
 function normalize(payload,query){
  const hits=Array.isArray(payload?.hits?.hits)?payload.hits.hits:[];
  const rows=[],seen=new Set();
  for(const hit of hits){
   const m=hit.metadata||{};
   const names=(m.authors||[]).map(a=>a.full_name).filter(Boolean);
   if(!names.some(name=>sameAuthor(name,query)))continue;
   const title=String(m.titles?.[0]?.title||"").trim();
   for(const entry of (m.arxiv_eprints||[])){
    const id=String(entry.value||"").replace(/^arxiv:/i,"").trim();
    if(!ID.test(id)||seen.has(id)||!title)continue;
    seen.add(id);rows.push({id,title,date:String(m.earliest_date||""),authors:names,source:"INSPIRE-HEP"});
   }
  }
  return rows;
 }
 async function search(query,signal){
  const r=await fetch("https://inspirehep.net/api/literature?"+params(query),{signal,headers:{Accept:"application/json"}});
  if(!r.ok)throw Error("INSPIRE-HEP HTTP "+r.status);
  return normalize(await r.json(),query);
 }
 return {person,sameAuthor,params,normalize,search}
});