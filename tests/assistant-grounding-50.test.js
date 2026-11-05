/* Real-source, deterministic retrieval/citation regression.
 * Uses 50 actual records from the checked-in arXiv Atom-derived feed.
 * This DOES NOT evaluate hosted model reasoning or passage-level factuality.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const Core=require("../docs/assistant-core.js");
const raw=JSON.parse(fs.readFileSync("docs/data/feed.json","utf8"));
const all=(raw.papers||[]).filter(p=>{
 const parsed=Core.arxivId(p.id||"");
 return parsed&&typeof p.title==="string"&&p.title.trim().length>25;
});
const unique=Core.unique(all);
assert(unique.length>=50,"At least 50 verified indexed arXiv papers are required");
const byTitle=new Map();
for(const p of unique){
 const title=p.title.toLowerCase().replace(/\s+/g," ").trim();
 if(!byTitle.has(title))byTitle.set(title,p);
}
const distinct=[...byTitle.values()];
assert(distinct.length>=50,"At least 50 nonduplicate actual paper titles are required");
// Sample across the time-ordered cache, not only the first few selected records.
const cases=Array.from({length:50},(_,i)=>distinct[Math.floor(i*(distinct.length-1)/49)]);
const pool=distinct.slice(0,Math.min(400,distinct.length));
for(const original of cases){
 if(!pool.some(p=>p.id===original.id))pool.push(original);
}
let targetRetrieved=0,authenticLinks=0,citationsValid=0;
const failures=[];
for(const original of cases){
 const result=Core.rank(original.title,pool,8);
 const found=result.some(row=>row.paper.id===original.id);
 if(found)targetRetrieved++;
 const source=result.find(row=>row.paper.id===original.id)?.paper;
 if(source&&source.url==="https://arxiv.org/abs/"+Core.arxivId(original.id))authenticLinks++;
 const report=source?Core.evidenceReport(original.title,[source],"bibliographic retrieval"):"";
 if(source&&report.includes(source.url)&&report.includes(source.title))citationsValid++;
 if(!found)failures.push({id:original.id,type:"title-retrieval"});
}
const retrieval=targetRetrieved/50,link=authenticLinks/50,citation=citationsValid/50;
const result={count:50,retrieval_at_top_8:retrieval,original_url_precision:link,
 citation_rendering: citation,scope:"Bibliographic/source-level only, not passage-grounded LLM evaluation",
 examples_failed:failures.slice(0,10)};
console.log(JSON.stringify(result,null,2));
assert(citation>=.95,"Less than 95% of grounded source citations were rendered correctly");
assert(link>=.95,"Less than 95% of original paper URLs matched canonical source records");
assert(retrieval>=.95,"Fewer than 95% of exact-title queries retrieved the source at top 8");
