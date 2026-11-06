"use strict";
const assert=require("node:assert/strict");
const evidence=require("../docs/evidence-extract.js");
const abstract="We investigate edge states in lattice systems. We use numerical diagonalization. The dataset includes 120 simulations. We show robustness to weak disorder. However, this analysis is restricted to finite chains. Code is available at github.com/example/research.";
const result=evidence.extract(abstract);
for(const name of evidence.fields){
 const row=result[name];
 assert.equal(typeof row.text,"string");
 assert(abstract.slice(row.start,row.end)===row.text,"Extracted evidence must literally occur in supplied abstract: "+name);
 assert.equal(row.source,"original abstract");
}
assert.equal(evidence.extract("A short review of earlier work.")["Dataset"].text,"Not stated in the available abstract");
assert.equal(evidence.extract("")["Main result"].source,"unavailable");
assert(evidence.fields.length===6);
console.log("Evidence extraction: literal abstract spans, six fields and explicit missing evidence passed.");
