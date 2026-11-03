/* Regression tests for unified ResearchLens paper assistant. Run: node tests/assistant-core.test.js */
"use strict";
const assert=require("node:assert/strict");
const C=require("../docs/assistant-core.js");
const papers=[
 {id:"2608.13942v2",title:"Quantum Zeno enhancement of macroscopic nonclassicality",
  abstract:"Repeated optical measurements of massive oscillator coherence",authors:["A Scholar"],published:"2026-08-14",categories:["quant-ph"]},
 {id:"2609.36080",title:"Preparation contextuality and exclusion",
  abstract:"Generalized measurements and contextual dimensions",authors:["B Scholar"],published:"2026-09-29",categories:["quant-ph"]},
 {id:"2608.13942",title:"Duplicate paper",abstract:"Shorter",authors:[],published:"2026-08-14"}
];
assert.equal(C.arxivId("https://arxiv.org/abs/2608.13942v3"),"2608.13942");
assert.equal(C.arxivId("https://arxiv.org/pdf/2608.13942.pdf"),"2608.13942");
assert.equal(C.arxivId("garbage"),"");
const u=C.unique(papers);
assert.equal(u.length,2);
assert.equal(u[0].title,"Quantum Zeno enhancement of macroscopic nonclassicality");
const result=C.rank("contextuality generalized exclusion",papers);
assert.equal(result[0].paper.id,"2609.36080");
assert.ok(result[0].score>0);
assert.equal(C.rank("zzzzunknownnevermentioned",papers).length,0);
const comparison=C.compare(u[0],u[1]);
assert.equal(comparison.chronology,"Paper A first submitted earlier");
const report=C.evidenceReport("Does Zeno amplification work?",u,"literature");
assert.ok(report.includes("https://arxiv.org/abs/2608.13942"));
assert.ok(report.includes("not complete proofs"));
console.log("Unified research assistant core tests passed.");
