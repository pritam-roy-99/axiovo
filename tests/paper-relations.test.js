"use strict";
const assert=require("node:assert/strict");
const {related}=require("../docs/paper-relations.js");
const target={source:"arxiv",id:"2610.00001",title:"Quantum contextuality in preparation noncontextuality games",
 abstract:"We investigate operational equivalences and preparation contextuality in qubit measurements.",
 categories:["quant-ph"],url:"https://arxiv.org/abs/2610.00001"};
const good={source:"arxiv",id:"2610.00002",title:"Preparation contextuality and operational equivalences in noisy qubits",
 abstract:"New quantum contextuality witnesses",categories:["quant-ph"],url:"https://arxiv.org/abs/2610.00002"};
const unrelated={source:"arxiv",id:"2610.00003",title:"Neural circuits and chromatin remodeling",
 abstract:"A different field",categories:["q-bio.NC"],url:"https://arxiv.org/abs/2610.00003"};
const otherArchive={...good,source:"biorxiv",id:"10.1101/2026.01.01.00001",url:"https://www.biorxiv.org/content/10.1101/2026.01.01.00001"};
const duplicate={...target,id:"2610.00001v2"};
const noSource={...good,id:"2610.00004",url:""};
const matches=related(target,[unrelated,good,duplicate,otherArchive,noSource]);
assert.equal(matches.length,1,"only a properly sourced same-archive related record qualifies");
assert.equal(matches[0].paper.id,good.id);
assert.ok(matches[0].reasons.length>0,"explain at least one shared metadata term");
assert.equal(related(target,[unrelated]).length,0,"unrelated results should be absent");
assert.equal(related(target,[good],0).length,1,"zero limit defaults to a small capped list");
console.log("PASS: source-grounded related papers, deduplication, transparent evidence and conservative exclusions");
