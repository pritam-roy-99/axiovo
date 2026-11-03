/* Run with: node tests/relevance.test.js */
"use strict";
const assert=require("node:assert/strict");
const {rank,normalizeId,tokens,cleanProject}=require("../docs/relevance.js");
const papers=[
 {id:"2601.00123",title:"Quantum steering and device independent sensing",abstract:"We study steering witnesses for metrology.",published:"2026-10-30T00:00:00Z",authors:["Researcher One"],categories:["quant-ph"],topics:["steering"]},
 {id:"2601.00124",title:"Quantum error correction using topological codes",abstract:"Stabilizer formalism.",published:"2026-10-31T00:00:00Z",authors:["Researcher Two"],categories:["quant-ph"],topics:["error correction"]},
 {id:"2501.00123v2",title:"Nonlocality and preparation contextuality",abstract:"An operational witness.",published:"2025-01-03T00:00:00Z",authors:["Researcher Three"],categories:["quant-ph"],topics:["contextuality"]}
];
assert.equal(normalizeId("https://arxiv.org/abs/2501.00123v3"),"2501.00123");
assert.deepEqual(tokens("The quantum steering and steering witness"),["steering","witness"]);
const opts={interests:["steering"],projects:[],now:"2026-11-03T00:00:00Z"};
const a=rank(papers,opts);assert.equal(a.length,1);assert.equal(a[0].paper.id,"2601.00123");assert(a[0].reasons.some(x=>x.includes("steering")));
const b=rank(papers,{projects:[{title:"Steering based sensing",keywords:"metrology sensing"}],now:"2026-11-03T00:00:00Z"});
assert.equal(b[0].paper.id,"2601.00123");assert(b[0].reasons[0].startsWith("Related terms"));
const c=rank(papers,{interests:["steering"],hidden:["2601.00123"]});assert.equal(c.length,0);
const d=rank(papers,{authors:["Researcher Two"],saved:["2601.00124"]});
assert.equal(d.length,1);assert(d[0].reasons.includes("Followed author"));assert(d[0].reasons.includes("Already saved"));
assert.equal(cleanProject({id:"one",title:" Test ",keywords:" steering ",status:"unexpected",paper_ids:["2501.00123v2","2501.00123"]}).paper_ids.length,1);
assert.equal(cleanProject({id:"",title:"Missing identifier"}),null);
console.log("Relevance and project data regression tests passed");
