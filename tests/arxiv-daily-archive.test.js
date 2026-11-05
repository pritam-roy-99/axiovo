"use strict";
const assert=require("node:assert/strict");
const Archive=require("../docs/arxiv-daily-archive.js");
(async()=>{
 const days=Archive.dates("2026-11-03","2026-11-05");
 assert.deepEqual(days,["2026-11-03","2026-11-04","2026-11-05"]);
 assert.throws(()=>Archive.dates("2026-11-05","2026-11-03"),/Invalid/);
 assert.throws(()=>Archive.dates("2026-01-01","2026-11-01"),/exceeds/);
 const official=new URL(Archive.officialDateSearchUrl({from:"2024-11-05",to:"2024-11-08",query:"quantum key distribution"}));
 assert.equal(official.hostname,"arxiv.org");
 assert.equal(official.searchParams.get("date-filter_by"),"date_range");
 assert.equal(official.searchParams.get("date-from_date"),"2024-11-05");
 assert.equal(official.searchParams.get("date-to_date"),"2024-11-08");
 assert.equal(official.searchParams.get("date-date_type"),"submitted_date_first");
 assert.equal(official.searchParams.get("terms-0-term"),"quantum key distribution");
 const papers=Array.from({length:150},(_,i)=>({
  id:"2611."+String(i+1).padStart(5,"0"),title:"Study "+i,
  abstract:"Research across quantum mathematics biology",
  authors:["Researcher "+i],categories:[i%2?"quant-ph":"math.AG"],
  primary_category:i%2?"quant-ph":"math.AG",published:"2026-11-05T12:00:00Z"
 }));
 assert.equal(Archive.filterAndSort(papers,"","").length,150,
  "The date batch is never truncated to the previous 30-result cached sample");
 assert.equal(Archive.filterAndSort(papers,"","quant-ph").length,75);
 assert.equal(Archive.filterAndSort(papers,"Researcher 12","").length,1);
 const manifest={days:{
  "2026-11-04":{complete:true,count:1},
  "2026-11-05":{complete:true,count:150}
 }};
 const requested=[];
 const fetcher=async url=>{
  requested.push(url);
  if(url.endsWith("manifest.json"))return{ok:true,json:async()=>manifest};
  const day=url.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1];
  const records=day==="2026-11-04"?[{
   id:"2611.00000",title:"Earlier mathematics paper",published:"2026-11-04",
   authors:["Researcher Zero"],categories:["math.AG"]}]:papers;
  return{ok:true,json:async()=>({
   complete:true,date:day,paper_count:records.length,
   source_total:records.length,papers:records
  })};
 };
 const results=await Archive.search({from:"2026-11-04",to:"2026-11-05",fetcher});
 assert.equal(results.complete,true);
 assert.equal(results.totalHarvested,151);
 assert.equal(results.papers.length,151);
 assert.equal(results.coveredDays,2);
 assert.equal(requested.length,3);
 const missing=await Archive.search({from:"2026-11-03",to:"2026-11-05",fetcher});
 assert.equal(missing.complete,false);
 assert.deepEqual(missing.missing,["2026-11-03"]);
 const altered=async url=>{
  const r=await fetcher(url);
  if(url.endsWith("2026-11-04.json"))return{ok:true,json:async()=>({...await r.json(),source_total:50})};
  return r;
 };
 const invalid=await Archive.search({from:"2026-11-04",to:"2026-11-05",fetcher:altered});
 assert.equal(invalid.complete,false,"Disagreement between index and day shards must not claim completeness");
 const partialFetcher=async url=>{
  if(url.endsWith("manifest.json"))return{ok:true,json:async()=>({
   schema:1,complete_submission_dates:false,days:{"2026-11-05":{complete:false,count:2}}
  })};
  const records=[papers[0],papers[1]];
  return{ok:true,json:async()=>({date:"2026-11-05",complete:false,paper_count:2,papers:records})};
 };
 const partial=await Archive.partialSearch({from:"2026-11-05",to:"2026-11-05",fetcher:partialFetcher});
 assert.equal(partial.complete,false);
 assert.equal(partial.available,true);
 assert.equal(partial.papers.length,2);
 assert.equal(partial.coveredDays,1);
 assert(partial.reason.includes("partial"));
 const noPartial=await Archive.partialSearch({from:"2026-11-04",to:"2026-11-05",fetcher:partialFetcher});
 assert.deepEqual(noPartial.missing,["2026-11-04"]);
 assert.equal(noPartial.papers.length,2);
 console.log("Daily arXiv exact-date coverage and unbounded result paging tests passed");
})().catch(err=>{console.error(err);process.exitCode=1});
