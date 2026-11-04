/* Optional Consensus API via local Python server; never put API keys in frontend code. */
(function(){
 "use strict";
 const get=id=>document.getElementById(id);
 function query(){
  const visible=id=>{const e=get(id);return e&&!e.closest("[hidden]")?e.value?.trim():""};
  let term=visible("scholar-query")||visible("q")||visible("axiovo-biorxiv-query");
  if(!term){try{const s=JSON.parse(localStorage.getItem("researchlens-field-explorer-v1")||"{}");term=s.subtopic||s.topic||""}catch{}}
  return String(term||"").trim().slice(0,220);
 }
 function status(message){const el=get("axiovo-consensus-status");if(el)el.textContent=message}
 function resultCard(p){
  const card=document.createElement("article");card.className="axiovo-biorxiv-paper";
  const title=document.createElement("h3");title.textContent=p.title||"Untitled research work";card.append(title);
  const meta=document.createElement("p");meta.textContent=
   [p.publish_year,Array.isArray(p.authors)?p.authors.slice(0,5).join(", "):"",Number.isFinite(p.citation_count)?p.citation_count+" citations":""].filter(Boolean).join(" · ");
  card.append(meta);
  const link=p.doi&&/^10\.\d{4,9}\/.+/.test(p.doi)?"https://doi.org/"+encodeURIComponent(p.doi):
   /^https:\/\//.test(p.url||"")?p.url:"";
  if(link){const a=document.createElement("a");a.href=link;a.target="_blank";a.rel="noopener noreferrer";
   a.textContent="Verify original source";card.append(a)}
  return card;
 }
 async function search(){
  const term=query(),results=get("axiovo-consensus-results");
  if(!results)return;
  results.replaceChildren();
  if(term.length<3){status("Enter a research question or choose a topic first.");return}
  status("Checking local Consensus API…");
  const b=get("axiovo-consensus-local");if(b)b.disabled=true;
  try{
   const r=await fetch("./api/consensus?query="+encodeURIComponent(term),{cache:"no-store",
    headers:{Accept:"application/json"},signal:AbortSignal.timeout(21000)});
   const data=await r.json().catch(()=>({error:"This installation does not expose a local Consensus API."}));
   if(!r.ok)throw Error(data.error||"Provider unavailable");
   const papers=Array.isArray(data.results)?data.results:[];
   status(papers.length+" Consensus results for “"+term+"”. Verify papers and citations before using claims.");
   if(!papers.length)results.textContent="No matching papers returned. Try a more specific query.";
   papers.slice(0,20).forEach(p=>results.append(resultCard(p)));
  }catch(error){
   status(String(error.message||error)+". Use the free open searches or the official Consensus website.");
  }finally{if(b)b.disabled=false}
 }
 async function official(){
  const term=query();
  if(term){try{await navigator.clipboard.writeText(term)}catch{}}
  window.open("https://consensus.app/search/","_blank","noopener,noreferrer");
  status(term?"Research query copied when browser permissions allow. Paste it into Consensus search.":"Use Consensus's website to search published literature.");
 }
 function init(){
  get("axiovo-consensus-local")?.addEventListener("click",search);
  get("axiovo-consensus-external")?.addEventListener("click",official);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
