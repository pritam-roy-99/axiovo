"use strict";
/* Transparent, reproducible cross-discipline query benchmark.
 * Prompts are real research questions; metadata candidates are explicitly
 * SYNTHETIC testing fixtures, not purported scholarly publications.
 * This is a regression smoke benchmark, not a measured real-world recall rate.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const origin={URL,URLSearchParams,AbortSignal,
 localStorage:{getItem:()=>null,setItem(){}},fetch:async()=>{throw Error("No network in benchmark")}};
origin.window=origin;
vm.createContext(origin);
for(const file of ["arxiv-versions.js","archive-data.js"]){
 vm.runInContext(fs.readFileSync("docs/"+file,"utf8"),origin);
}
const api=origin.AxiovoArchiveData;
const questions=[
 {field:"physics",question:"How does device independent quantum key distribution work?",q:"device independent quantum key distribution",core:"Device independent quantum key distribution with optical photons"},
 {field:"mathematics",question:"How are spectral sequences used in algebraic topology?",q:"spectral sequences algebraic topology",core:"Spectral sequences in algebraic topology of fiber bundles"},
 {field:"computer science",question:"How can graph neural networks perform molecular property prediction?",q:"graph neural networks molecular property prediction",core:"Graph neural networks for molecular property prediction"},
 {field:"biology",question:"How can single cell RNA sequencing reveal cell states?",q:"single cell RNA sequencing",core:"Single cell RNA sequencing for cell state discovery"},
 {field:"chemistry",question:"How does electrochemical carbon dioxide reduction depend on catalysts?",q:"electrochemical carbon dioxide reduction",core:"Electrochemical carbon dioxide reduction with molecular catalysts"}
];
const metrics=[];
questions.forEach((test,i)=>{
 const id=n=>"2610."+String(10000+i*10+n).padStart(5,"0");
 const p=(n,title,abstract)=>api.normalize("arxiv",{id:id(n),title,abstract,authors:["Synthetic Test Author"],published:"2026-10-01",categories:["physics.gen-ph"]});
 const positive=p(1,test.core,"A controlled synthetic example for retrieval.");
 const hardNegative=p(2,"General methods and applications",test.q+" appears only in this synthetic example abstract.");
 const irrelevant=p(3,"Analysis of unrelated seasonal rainfall patterns","This is an unrelated synthetic test record.");
 const candidates=[hardNegative,irrelevant,positive];
 const rows=api.filter(candidates,{q:test.q,sort:"relevance"});
 const correctFirst=rows[0]?.id===positive.id;
 const precisionOne=correctFirst?1:0;
 const recallOne=correctFirst?1:0;
 assert.ok(correctFirst,test.field+" should rank a specific title match above an abstract-only hit");
 assert.ok(!rows.some(x=>x.id===irrelevant.id),test.field+" must reject unrelated candidate");
 metrics.push({field:test.field,precision_at_1:precisionOne,recall_at_1:recallOne,returned:rows.length});
});
const mean=metrics.reduce((acc,row)=>acc+row.precision_at_1,0)/metrics.length;
assert.equal(mean,1);
console.log("Synthetic cross-field search regression (NOT a real literature-recall evaluation)");
console.log(JSON.stringify({cases:metrics.length,precision_at_1:mean,fields:metrics},null,2));
