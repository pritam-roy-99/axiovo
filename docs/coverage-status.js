/* Transparent, read-only coverage from the actual normalized shard manifest. */
(function(){
"use strict";
async function show(){
 const root=document.getElementById("axiovo-coverage-live");
 if(!root)return;
 const tbody=document.getElementById("axiovo-coverage-rows");
 const status=document.getElementById("axiovo-coverage-status");
 const last=document.getElementById("axiovo-coverage-source-times");
 const review=document.getElementById("axiovo-coverage-review");
 try{
  const response=await fetch("./data/index/v1/manifest.json",{cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error("Index manifest unavailable");
  const manifest=await response.json();
  if(manifest.schema_version!==1||!Array.isArray(manifest.shards)||!manifest.by_source)throw Error("Invalid coverage manifest");
  tbody.replaceChildren();
  for(const [key,label] of [["arxiv","arXiv"],["biorxiv","bioRxiv"],["chemrxiv","ChemRxiv"]]){
   const tr=document.createElement("tr");
   const name=document.createElement("th");name.scope="row";name.textContent=label;
   const count=document.createElement("td");count.textContent=Number(manifest.by_source[key]||0).toLocaleString();
   const shards=document.createElement("td");shards.textContent=String(manifest.shards.filter(s=>s.source===label).length);
   tr.append(name,count,shards);tbody.append(tr);
  }
  const total=Object.values(manifest.by_source).reduce((sum,v)=>sum+Number(v||0),0);
  status.textContent=total.toLocaleString()+" unique verified records represented in the current local shards. These are partial snapshots, NOT complete archive totals.";
  if(total!==manifest.unique_papers)status.textContent+=" Warning: manifest count mismatch.";
  // Optional v2 audit layer: supplemental provenance evidence, NOT a claim
  // of complete archive coverage. Keep the legacy count view working.
  try{
   const latest=await fetch("./data/index/v2/manifest.json",{
    cache:"no-store",signal:AbortSignal.timeout(12000)
   });
   if(latest.ok){
    const audit=await latest.json();
    const shards=Array.isArray(audit.shards)?audit.shards:[];
    const count=shards.reduce((sum,row)=>sum+Number(row.count||0),0);
    const hashesValid=shards.every(row=>/^[a-f0-9]{64}$/.test(row.sha256||""));
    if(audit.schema_version===2&&
       audit.coverage_status==="partial-snapshots-not-full-archives"&&
       count===audit.record_count&&hashesValid){
      status.textContent+=" Canonical v2 audit: "+count.toLocaleString()+
        " version-specific records in "+shards.length+
        " SHA-256-indexed shards. Archive completeness remains unverified.";
    }
   }
  }catch(_error){
   // Older deployments may not contain v2; the existing v1 view remains valid.
  }
  review.textContent=Number(manifest.pending_subtopic_review||0).toLocaleString()+
   " papers await evaluated topic tagging. Confidence is currently unscored; no ML assignment is claimed.";
  const lines=Object.entries(manifest.input_sync_dates||{}).map(([source,date])=>source+": "+(date||"not yet synchronized"));
  last.replaceChildren();
  for(const line of lines){const li=document.createElement("li");li.textContent=line;last.append(li)}
 }catch(error){
  status.textContent="Coverage counts are unavailable; no totals will be inferred. "+String(error.message||error);
  review.textContent="Topic-tag confidence unavailable.";
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",show,{once:true});
else show();
})();
