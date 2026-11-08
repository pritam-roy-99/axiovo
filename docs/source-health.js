/* Lightweight, source-transparent health panel. Never downloads full paper datasets. */
(function(){
"use strict";
const SOURCES=[
 {id:"arxiv",name:"arXiv"},
 {id:"biorxiv",name:"bioRxiv"},
 {id:"chemrxiv",name:"ChemRxiv"},
 {id:"eprint",name:"Cryptology ePrint"}
];
async function load(url){
 const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error("HTTP "+response.status);
 return response.json();
}
function timestamp(value){
 const ms=Date.parse(value||"");
 return Number.isFinite(ms)?{ms,text:new Date(ms).toLocaleString()}:null;
}
function label(source,data){
 if(!data?.available||!Number.isInteger(data.indexed_records))
  return {status:"Unavailable",count:"Unknown",coverage:"Unverified",last:"Unavailable"};
 const clock=timestamp(data.checked_at),age=clock?Date.now()-clock.ms:null;
 const status=!clock?"Unknown":age>48*3600000?"Stale":age>24*3600000?"Delayed":"Checked recently";
 const message={
  "announcement-batch":"Announcement batch reported complete",
  "partial-or-unverified-announcements":"Announcement batch partial or unverified",
  "bounded-recent-window":"Recent window checked; archive history partial",
  "partial-window":"Recent window incomplete; archive history partial",
  "DOI-prefix-window":"DOI-prefix window checked; complete archive unverified",
  "partial-DOI-discovery":"Partial DOI discovery; complete archive unverified",
  "available-OAI-history-traversed":"Available OAI history traversed; complete census unverified",
  "partial-OAI-history":"Incremental OAI metadata; historical coverage partial"
 };
 let coverage=message[data.coverage]||"Coverage not verified";
 if(source==="arxiv"&&data.announcement_date)
  coverage="Announcement "+data.announcement_date+" · "+coverage;
 return {status,count:data.indexed_records.toLocaleString(),coverage,last:clock?.text||"Unavailable"};
}
function cell(row,value,tag="td"){
 const el=document.createElement(tag);el.textContent=value;if(tag==="th")el.scope="row";row.append(el);
}
async function show(){
 const body=document.getElementById("axiovo-source-health-rows");
 const summary=document.getElementById("axiovo-source-health-summary");
 if(!body||!summary)return;
 let manifest={};
 try{manifest=await load("./data/source-freshness.json");}
 catch(error){manifest={sources:{}};}
 const result=SOURCES.map(source=>({source,health:label(source.id,manifest.sources?.[source.id])}));
 body.replaceChildren();
 for(const {source,health} of result){
  const tr=document.createElement("tr");
  cell(tr,source.name,"th");cell(tr,health.count);cell(tr,health.last);
  cell(tr,health.status);cell(tr,health.coverage);body.append(tr);
 }
 const good=result.filter(x=>x.health.status==="Checked recently").length;
 summary.textContent=good+" of "+SOURCES.length+
  " metadata snapshots checked within 24 hours. These are local snapshots, not live source inventories. Recent checks do not prove archive completeness.";
 const details=document.getElementById("axiovo-arxiv-day-health");
 if(!details)return;
 try{
  const audit=await load("./data/literature-health.json");
  const arxiv=audit.arxiv||{},bio=audit.biorxiv||{},chem=audit.chemrxiv||{};
  details.textContent="Independent source audit: arXiv "+Number(arxiv.verified_days||0)+
   " count-checked UTC dates, "+Number(arxiv.queue_total||0)+" unverified recent dates queued."+
   " bioRxiv: "+(bio.status||"unverified")+". ChemRxiv: "+(chem.status||"unverified")+
   ". IACR ePrint: metadata coverage is reported separately. No complete historical recall is implied.";
 }catch(error){
  details.textContent="Detailed archive-completeness audit unavailable. Snapshot freshness alone is not completeness.";
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",show,{once:true});else show();
})();
