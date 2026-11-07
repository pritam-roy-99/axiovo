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
assert(!feed.overlaps("Quantum information","A history of information systems","Data systems and algorithms").matched,
  "A domain-specific topic must not match by a broad fragment");
assert(feed.overlaps("Quantum information","A new study in quantum information","").matched,
  "Exact scientific field phrases remain available for topical following");
const scoped=feed.build([
 {...papers[0],categories:["quant-ph"]},
 {...papers[4],title:papers[0].title},
 {...papers[2],title:papers[0].title,categories:["cs.CV"]}
],{directTopics:[],paths:[{source:"arxiv",category:"quant-ph",terms:["preparation contextuality"]}]},NOW);
assert.deepEqual(scoped.map(x=>x.paper.id),[papers[0].id],"Saved paths stay in their selected archive and category");
const chemistry={...papers[0],source:"chemrxiv",id:"10.26434/chemrxiv-2026-fixture-v3"};
assert.equal(feed.key(chemistry),"chemrxiv:10.26434/chemrxiv-2026-fixture");
assert.equal(feed.build([chemistry],{
 topics:["preparation contextuality"],hidden:["chemrxiv:10.26434/chemrxiv-2026-fixture-"]
},NOW).length,0,"A previously hidden ChemRxiv work stays hidden across revisions");

// Two genuine 2010–2011 arXiv-era subject areas used as name-collision fixtures.
// A shared "Pritam Roy" name is NOT a confirmed researcher identity.
const otherPritamPapers=[
 {id:"1107.2132",source:"arxiv",title:"Magnifying Lens Abstraction for Stochastic Games with Discounted and Long-run Average Objectives",
  abstract:"We study magnifying lens abstraction, stochastic games and Markov decision processes.",
  authors:["Krishnendu Chatterjee","Luca de Alfaro","Pritam Roy"],date:"2011-07-11",
  url:"https://arxiv.org/abs/1107.2132"},
 {id:"1010.5665",source:"arxiv",title:"Safety-Guarantee Controller Synthesis for Cyber-Physical Systems",
  abstract:"We study linear temporal logic and synthesis of cyber-physical controllers.",
  authors:["Pritam Roy","Paulo Tabuada","Rupak Majumdar"],date:"2010-10-27",
  url:"https://arxiv.org/abs/1010.5665"}
];
const ambiguousPrefs={authors:["Pritam Roy"],topics:["quantum information","preparation contextuality"],
 matchesAuthor:(a,b)=>a.toLowerCase()===b.toLowerCase()};
assert.equal(feed.build(otherPritamPapers,ambiguousPrefs,NOW).length,0,
 "A name alone must not inject unrelated publications by a different researcher");
const uncertain=feed.build(otherPritamPapers,{...ambiguousPrefs,includeUnverifiedNames:true},NOW);
assert.equal(uncertain.length,2,"Explicit opt-in may show uncertain name-only papers");
assert(uncertain.every(x=>x.nameOnly&&!x.identityVerified&&
 x.reasons.some(reason=>reason.includes("identity unverified"))));
const relatedPritam={...otherPritamPapers[0],id:"2611.02222",title:"Quantum information and contextuality",
 abstract:"Preparation contextuality in quantum information theory",date:"2026-11-05",
 url:"https://arxiv.org/abs/2611.02222"};
const topical=feed.build([relatedPritam],ambiguousPrefs,NOW);
assert.equal(topical.length,1,"Topical evidence may support a recommendation, not identity verification");
assert.equal(topical[0].nameOnly,false);
assert(topical[0].reasons.some(reason=>reason.includes("identity unverified")));
console.log("PASS: personalized feed ranking, names, topic coverage, dedup, exclusions, sources and freshness");
