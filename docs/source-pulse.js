/* Light metadata freshness: a tiny manifest, no large record downloads. */
(function(){
 "use strict";
 const SOURCES=[["arxiv","arXiv"],["biorxiv","bioRxiv"],["chemrxiv","ChemRxiv"],["eprint","Cryptology ePrint"]];
 const root=document.getElementById("axiovo-source-pulse");
 if(!root)return;
 function show(data){
  const list=document.getElementById("axiovo-source-pulse-list");
  if(!list)return;
  list.replaceChildren();
  for(const [id,label] of SOURCES){
   const item=data?.sources?.[id];
   const card=document.createElement("li");card.className="axiovo-source-pulse-item";
   const strong=document.createElement("strong");strong.textContent=label;
   const status=document.createElement("span");
   if(!item?.available){status.textContent="Source snapshot unavailable";card.dataset.state="missing"}
   else if(!item.checked_at){status.textContent="Check time unavailable";card.dataset.state="unknown"}
   else{
    const time=Date.parse(item.checked_at),age=Date.now()-time;
    const valid=Number.isFinite(time)&&age>=0;
    card.dataset.state=valid&&age<=24*3600*1000?"recent":valid?"older":"unknown";
    status.textContent=valid?"Checked "+new Date(time).toLocaleString():"Check time unavailable";
   }
   const note=document.createElement("small");
   note.textContent=item?.coverage==="available-OAI-history-traversed"?
    "OAI harvest checked, not a full archive census":
    item?.coverage==="announcement-batch"?"Announcement snapshot, not full history":
    item?.coverage==="bounded-recent-window"?"Recent verified window":
    item?.coverage==="DOI-prefix-window"?"DOI-prefix window":
    "Partial or unverified coverage";
   card.append(strong,status,note);list.append(card);
  }
 }
 async function load(){
  try{
   const response=await fetch("./data/source-freshness.json",{
    cache:"no-cache",signal:AbortSignal.timeout(7500)
   });
   if(!response.ok)throw Error("HTTP "+response.status);
   const obj=await response.json();
   if(obj.schema_version!==1||!obj.sources)throw Error("Invalid source freshness metadata");
   show(obj);
  }catch{
   show({sources:{}});
  }
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load,{once:true});
 else load();
})();
