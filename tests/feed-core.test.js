"use strict";
const assert=require("node:assert/strict");
const feed=require("../docs/feed-core.js");
const NOW=Date.parse("2026-11-06T12:00:00Z");
const papers=[
 {id:"2611.00001v1",source:"arxiv",title:"Preparation contextuality and quantum dimension witnessing",
  abstract:"New exclusion game inequalities",authors:["Archan S Majumdar"],date:"2026-11-05",
  url:"https://arxiv.org/abs/2611.00001v1"},
 {id:"2611.00001v2",source:"arxiv",title:"Preparation contextuality and quantum dimension witnessing",
  abstract:"New exclusion game inequalities",authors:["Archan S Majumdar"],date:"2026-11-06",
  url:"https://arxiv.org/abs/2611.00001v2"},
 {id:"2611.00002",source:"arxiv",title:"Quantum many body nonlocality tests",
  abstract:"Operational nonlocality bounds",authors:["Other Person"],date:"2026-11-04",
  url:"https://arxiv.org/abs/2611.00002"},
 {id:"2611.00003",source:"arxiv",title:"Educational robotics beyond ROS",
  abstract:"Robot controllers in computer science",authors:["Another Person"],date:"2026-11-05",
  url:"https://arxiv.org/abs/2611.00003"},
 {id:"10.1101/2026.11.03.101010",source:"biorxiv",title:"Single cell sequencing and genomics of brain tissue",
  abstract:"Cellular transcriptomics",authors:["Bio Researcher"],date:"2026-11-03",
  url:"https://www.biorxiv.org/content/10.1101/2026.11.03.101010"}
];
const options={authors:["A. S. Majumdar"],topics:["preparation contextuality","single cell sequencing"],
 matchesAuthor:(a,b)=>a==="A. S. Majumdar"&&b==="Archan S Majumdar"};
const ranked=feed.build(papers,options,NOW);
assert.equal(ranked.length,2,"Only followed author and genuinely related research topics qualify");
assert.equal(ranked.filter(x=>x.paper.source==="arxiv").length,1,"arXiv revisions deduplicate");
assert(ranked.some(x=>x.paper.source==="biorxiv"),"Cross-source relevant biology appears");
assert(!ranked.some(x=>x.paper.title.includes("robotics")),"No spurious one-word matches");
assert(ranked[0].reasons.some(x=>x.includes("Following")),"Explain why every paper appears");
assert.equal(feed.select(ranked,"related").length,2);
assert.equal(feed.select(ranked,"latest").length,2);
const hidden=feed.build(papers,{...options,hidden:["arxiv:2611.00001"]},NOW);
assert.equal(hidden.length,1,"Not relevant hides only chosen paper");
assert.equal(feed.build(papers,{authors:[],topics:[]},NOW).length,0,"No followed interests means no fabricated recommendations");
console.log("PASS: personalized feed ranking, names, topic coverage, dedup, exclusions, sources and freshness");
