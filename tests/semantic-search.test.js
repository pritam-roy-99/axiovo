"use strict";
const assert=require("node:assert/strict");
const C=require("../docs/scholar-search.js");
const AI=require("../docs/semantic-search.js");
const state={field:"quantum",topic:"Contextuality",subtopic:"Preparation contextuality"};
const plan=C.plan(state,"Preparation contextuality",{today:"2026-11-03"});
const sem=AI.plan(plan,state);
assert.equal(sem.params.get("per_page"),"50");
assert.ok(sem.params.has("search.semantic"));
assert.equal(sem.params.has("search"),false);
assert.equal(sem.params.has("sort"),false);
assert.ok(sem.params.get("filter").includes("primary_topic.field.id:31|17|26"));
assert.ok(sem.description.toLowerCase().includes("preparation contextuality"));
function work(id,title,field="31",extra={}){
 return {id:"https://openalex.org/"+id,display_name:title,publication_date:"2026-08-21",
  primary_topic:{display_name:"Quantum foundations",field:{id:"https://openalex.org/fields/"+field}},...extra};
}
const good=work("W1","Preparation noncontextuality in quantum information theory");
const good2=work("W2","Prepare-and-measure contextuality and quantum state discrimination");
const unrelated=work("W3","ANA testing: pretest probability in medical screening","27");
const wrong=work("W4","Contextuality of teaching and education","31",{primary_topic:{display_name:"Physics",field:{id:"https://openalex.org/fields/31"}}});
const generic=work("W5","Quantum contextuality in sequential measurements");
const future=work("W6","Preparation contextuality in quantum networks","31",{publication_date:"2027-01-01"});
const secondary=work("W7","Preparation contextuality in quantum networks","27",{topics:[{field:{id:"https://openalex.org/fields/31"},display_name:"Quantum Physics"}]});
assert.equal(AI.screen(good,plan,state,C),true);
assert.equal(AI.screen(good2,plan,state,C),true);
assert.equal(AI.screen(unrelated,plan,state,C),false);
assert.equal(AI.screen(wrong,plan,state,C),false);
assert.equal(AI.screen(generic,plan,state,C),false);
assert.equal(AI.screen(future,plan,state,C),false);
assert.equal(AI.screen(secondary,plan,state,C),true);
const results=AI.combine([good],[good,good2,unrelated,wrong,generic,future,secondary],plan,state,C);
assert.deepEqual(results.map(x=>x.work.id),[good.id,good2.id,secondary.id]);
assert.equal(results[0].source,"keyword");
assert.equal(results[1].source,"semantic");
const typed=AI.semanticDescription({field:"quantum",topic:"Contextuality",subtopic:""}, "Bell inequality violation");
assert.ok(typed.toLowerCase().includes("bell"));
assert.ok(!typed.toLowerCase().includes("kochen specker"));
const basic=AI.plan(C.plan({field:"computer",topic:"Cybersecurity"},"adversarial attacks",{today:"2026-11-03"}),
 {field:"computer",topic:"Cybersecurity"});
assert.ok(basic.description.includes("computer science"));
console.log("OpenAlex AI semantic fallback screening tests passed");
