/* Run node tests/field-taxonomy.test.js */
"use strict";
const assert=require("node:assert/strict");
const {FIELDS,SUBTOPICS,fieldTopics,fieldKey}=require("../docs/research-fields.js");
assert.equal(Object.keys(FIELDS).length,13);
for(const [field,spec] of Object.entries(FIELDS)){
 assert.ok(spec.name && spec.topics.length>=8,"field has credible research areas: "+field);
 for(const topic of spec.topics){
  const subs=fieldTopics(field,topic);
  assert.ok(subs.length>=2,"missing field-specific interests: "+field+" / "+topic);
  assert.ok(new Set(subs).size===subs.length,"duplicate subtopic in "+topic);
  assert.ok(subs.every(x=>typeof x==="string"&&x.length>5));
 }
}
assert.deepEqual(fieldTopics("quantum","Quantum steering"),["Multipartite steering","Network steering","Measurement incompatibility"]);
assert.deepEqual(fieldTopics("medicine","Clinical trials"),["Randomized controlled trials","Adaptive trials","Clinical trial meta-analysis"]);
assert.equal(fieldKey("general"),"general");
assert.equal(fieldKey("biology"),"biology");
assert.equal(fieldKey("statmech"),"statmech");
assert.equal(fieldKey("condmat"),"condmat");
assert.equal(fieldKey("highenergy"),"highenergy");
assert.ok(fieldTopics("highenergy","Scattering amplitudes").includes("Spinor-helicity and on-shell methods"));
for(const id of ["statmech","condmat","highenergy"]){
 assert.equal(FIELDS[id].topics.length,12);
 assert.ok(Object.values(SUBTOPICS[id]).every(x=>x.length>=4));
}
assert.ok(fieldTopics("statmech","Nonequilibrium statistical mechanics").includes("Fluctuation-dissipation violations"));
assert.ok(fieldTopics("condmat","Topological phases of matter").includes("Topological order and anyons"));
assert.equal(fieldKey("not-a-field"),"general");
console.log("Field taxonomy: "+Object.keys(FIELDS).length+" disciplines, "+Object.values(SUBTOPICS).reduce((n,x)=>n+Object.values(x).reduce((a,y)=>a+y.length,0),0)+" curated subtopics; tests passed.");
