/* Axiovo source health. Source timestamps and verified scopes, never global totals. */
(function(){
"use strict";
const SOURCES=[
 {id:"arxiv",name:"arXiv",url:"./data/announcements.json"},
 {id:"biorxiv",name:"bioRxiv",url:"./data/biorxiv.json"},
 {id:"chemrxiv",name:"ChemRxiv",url:"./data/chemrxiv.json"}
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
 const count=Array.isArray(data.papers)?data.papers.length:null;
 if(count===null)return {status:"Invalid snapshot",count:"Unknown",coverage:"Unverified",last:"Unknown"};
 const clock=timestamp(data.checked_at||data.generated_at);
 const age=clock?Date.now()-clock.ms:null;
 const freshness=!clock?"Unknown":age>48*3600000?"Stale":age>24*3600000?"Delayed":"Checked recently";
 let coverage;
 if(source==="arxiv")coverage=data.complete===true&&data.count===count?
   "Announcement batch reported complete":"Announcement batch partial or unverified";
 else if(source==="biorxiv")coverage=data.complete_window===true?
   "Recent date window paginated in full; archive partial":"Recent date window partial; archive partial";
 else coverage=data.prefix_exhausted===true?
   "ChemRxiv DOI-prefix query exhausted; full archive unverified":"Partial DOI discovery; full archive unverified";
 return {status:freshness,count:count.toLocaleString(),coverage,last:clock?clock.text:"Unavailable"};
}
function cell(row,text,tag="td"){
 const el=document.createElement(tag);el.textContent=text;if(tag==="th")el.scope="row";row.append(el);
}
async function show(){
 const host=document.getElementById("axiovo-source-health");
 if(!host)return;
 const body=document.getElementById("axiovo-source-health-rows");
 const summary=document.getElementById("axiovo-source-health-summary");
 const result=await Promise.all(SOURCES.map(async source=>{
  try{return {source,health:label(source.id,await load(source.url))}}
  catch(error){return {source,health:{status:"Unavailable",count:"Unknown",coverage:"Cannot verify",last:"Unavailable"}}}
 }));
 body.replaceChildren();
 for(const {source,health} of result){
  const tr=document.createElement("tr");
  cell(tr,source.name,"th");cell(tr,health.count);cell(tr,health.last);
  cell(tr,health.status);cell(tr,health.coverage);body.append(tr);
 }
 const good=result.filter(x=>x.health.status==="Checked recently").length;
 summary.textContent=good+" of 3 metadata snapshots checked within the past 24 hours. Recent checks do not prove full archive coverage.";
 const details=document.getElementById("axiovo-arxiv-day-health");
 if(details){
  try{
   const audit=await load("./data/literature-health.json");
   const arxiv=audit.arxiv||{};
   const bio=audit.biorxiv||{};
   const chem=audit.chemrxiv||{};
   details.textContent="Independent source audit: arXiv "+Number(arxiv.verified_days||0)+
    " count-checked UTC dates, "+Number(arxiv.queue_total||0)+" unchecked or invalid recent dates queued for re-harvest."+
    " bioRxiv: "+(bio.status||"unverified")+". ChemRxiv: "+(chem.status||"unverified")+
    ". None of these counts establishes complete historical archive coverage.";
  }catch(error){
   // Older deployments may not yet include the independent audit.
   const manifest=await load("./data/arxiv-days/manifest.json");
   const rows=Object.entries(manifest.days||{});
   const verified=rows.filter(([,v])=>v.complete===true&&Number.isInteger(v.count)&&v.count>0);
   details.textContent="arXiv has "+verified.length+
    " manifest-listed positive-count dates. Independent shard audit not published yet; completeness is unverified.";
  }
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",show,{once:true});else show();
})();
