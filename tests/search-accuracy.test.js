"use strict";
/* Source-first relevance and official arXiv announcement freshness checks. */
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const storage=new Map();
const fixture={
 "feed.json":{generated_at:"2026-11-05T20:00:00Z",papers:[{
  id:"2611.00001",title:"Quantum steering witnesses",abstract:"Information theoretic tests",
  published:"2026-11-05",categories:["quant-ph"]
 }]},
 "oai-recent.json":{papers:[]},
 "announcements.json":{date_type:"announcement",announcement_date:"2026-11-06",checked_at:"2026-11-06T05:00:00Z",count:1,
  complete:true,papers:[{id:"2611.00002",title:"Lieb-Robinson bounds for information propagation",
   abstract:"Rigorous spin propagation bounds",categories:["math-ph"],announcement_date:"2026-11-06",
   metadata_source:"official arXiv RSS"}]}
};
const root={URL,URLSearchParams,AbortSignal,localStorage:{
 getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)
},fetch:async path=>{
 const key=String(path).split("/").at(-1);
 if(!fixture[key])throw Error("Unexpected fixture "+key);
 return {ok:true,json:async()=>fixture[key]};
}};
root.window=root;
vm.createContext(root);
for(const file of ["arxiv-versions.js","archive-data.js"])
 vm.runInContext(fs.readFileSync("docs/"+file,"utf8"),root);
const data=root.AxiovoArchiveData;
(async()=>{
 const snapshot=await data.snapshot("arxiv");
 const latest=await data.latestArxivAnnouncement();
 assert.equal(latest.date,"2026-11-06");
 assert.equal(latest.papers.length,1);
 assert.equal(latest.papers[0].announcementDate,"2026-11-06");
 assert.equal(latest.papers[0].date,"","Announcement date cannot be used as first submission date");
 assert.equal(latest.complete,true,"Official batch completeness must require exact record count");

 assert.equal(snapshot.papers.length,2,"Announcements must be searchable alongside earlier indexed metadata");
 const announced=snapshot.papers.find(x=>x.id==="2611.00002");
 assert.equal(announced.announcementDate,"2026-11-06");
 assert.equal(announced.date,"","Announcement time must never masquerade as first-submission date");
 const dated=data.normalize("arxiv",{id:"2611.00002",title:announced.title,
  published:"2026-11-05",categories:["math-ph"]});
 const combined=data.merge([dated],[announced])[0];
 assert.equal(combined.date,"2026-11-05","Same-revision RSS records must not erase verified submission dates");
 assert.equal(combined.announcementDate,"2026-11-06");
 assert.equal(data.filter(snapshot.papers,{q:"Lieb-Robinson"}).length,1);
 assert.equal(data.filter(snapshot.papers,{q:"ion"}).length,0,"Substring false positives prohibited");
 assert.equal(data.filter(snapshot.papers,{q:"steering"})[0].id,"2611.00001");
 assert.equal(data.filter(snapshot.papers,{from:"2026-11-06",to:"2026-11-06"}).length,0,
  "Unverified first-submission date cannot satisfy exact date filter");
 const title=data.normalize("arxiv",{id:"2611.00010",title:"Quantum steering experiments",
  abstract:"New measurement results",published:"2026-11-01",categories:["quant-ph"]});
 const abstract=data.normalize("arxiv",{id:"2611.00011",title:"Experimental instruments",
  abstract:"We analyze quantum steering experiments",published:"2026-11-01",categories:["quant-ph"]});
 assert.equal(data.filter([abstract,title],{q:"quantum steering"})[0].id,"2611.00010",
  "Full title phrase should outrank the same query appearing only in an abstract");
 const chemOther=data.normalize("chemrxiv",{doi:"10.26434/chemrxiv.12345",title:"Synthesis of organic catalysts",abstract:"Carbon bond activation",provenance:"Crossref subject query"});
 assert.equal(data.filter([chemOther],{q:"",category:{name:"Quantum chemistry",code:"quantum chemistry"},categoryTerms:["quantum chemistry"]}).length,0,
  "Crossref subject-query provenance alone must not qualify unrelated chemistry papers");
 const chemMatch=data.normalize("chemrxiv",{doi:"10.26434/chemrxiv.12346",title:"Quantum chemistry of molecular excited states",provenance:"Crossref subject query"});
 assert.equal(data.filter([chemMatch],{q:"",category:{name:"Quantum chemistry",code:"quantum chemistry"},categoryTerms:["quantum chemistry"]}).length,1,
  "Evidence in a paper title may support a category when source tags are absent");
 console.log("PASS: arXiv announcements, exact dates, whole-term lexical relevance, and title-first ranking");
})().catch(e=>{console.error(e);process.exitCode=1});
