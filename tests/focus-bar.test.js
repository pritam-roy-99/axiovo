"use strict";
const assert=require("node:assert/strict");
const C=require("../docs/focus-bar.js");
const F=require("../docs/research-fields.js");
const p=C.normalize({field:"quantum",topic:"Quantum steering",subtopic:"Network steering"},F);
assert.deepEqual(p,{field:"quantum",topic:"Quantum steering",subtopic:"Network steering"});
assert.equal(C.normalize({...p,field:"computer"},F).topic,F.FIELDS.computer.topics[0]);
assert.equal(C.normalize({field:"medicine",topic:"Clinical trials",subtopic:"Adaptive trials"},F).subtopic,"Adaptive trials");
assert.equal(C.normalize({field:"medicine",topic:"Clinical trials",subtopic:"Network steering"},F).subtopic,"");
assert.equal(C.normalize({field:"biology",topic:"Nonexistent"},F).topic,F.FIELDS.biology.topics[0]);
assert.deepEqual(C.normalize({field:"statmech",topic:"Nonequilibrium statistical mechanics",subtopic:"Fluctuation-dissipation violations"},F),{field:"statmech",topic:"Nonequilibrium statistical mechanics",subtopic:"Fluctuation-dissipation violations"});
assert.deepEqual(C.normalize({field:"condmat",topic:"Topological phases of matter",subtopic:"Topological order and anyons"},F),{field:"condmat",topic:"Topological phases of matter",subtopic:"Topological order and anyons"});
assert.equal(C.normalize({field:"not-a-field",topic:"Cybersecurity"},F).field,"quantum");
assert.equal(C.normalize({field:"mathematics",topic:F.FIELDS.mathematics.topics[0],subtopic:"Custom area",customSubtopic:true},F).subtopic,"Custom area");
for(const [id,field] of Object.entries(F.FIELDS)){
 const value=C.normalize({field:id,topic:field.topics[0],subtopic:""},F);
 assert.equal(value.field,id);assert.ok(field.topics.includes(value.topic));
 const sub=F.fieldTopics(id,field.topics[0]);
 assert.ok(sub.length>=2,"Requires at least two related subtopics: "+id);
}
console.log("Unified field-topic-subtopic focus hierarchy tests passed.");
