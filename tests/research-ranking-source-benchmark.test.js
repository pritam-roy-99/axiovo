"use strict";
/* Small manually annotated, source-linked benchmark of real published preprints.
 * Not a representative full-archive recall estimate. Original paper identifiers
 * and titles were checked against publisher/arXiv source pages in Nov 2026.
 * Labels say only that the cited title directly answers the test search topic.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const sandbox={URL,URLSearchParams,AbortSignal,
 localStorage:{getItem:()=>null,setItem(){}},fetch:async()=>{throw Error("Benchmark is offline")}};
sandbox.window=sandbox;vm.createContext(sandbox);
for(const filename of ["arxiv-versions.js","archive-data.js"])
 vm.runInContext(fs.readFileSync("docs/"+filename,"utf8"),sandbox);
const A=sandbox.AxiovoArchiveData;
const gold=[
 {field:"physics",source:"arxiv",id:"2208.12842",
  title:"Advances in device-independent quantum key distribution",
  q:"device independent quantum key distribution",url:"https://arxiv.org/abs/2208.12842"},
 {field:"mathematics",source:"arxiv",id:"2405.04709",
  title:"Quillen's Fundamental Spectral Sequences Revisited",
  q:"fundamental spectral sequences",url:"https://arxiv.org/abs/2405.04709"},
 {field:"computer science",source:"arxiv",id:"2208.04852",
  title:"Graph neural networks for the prediction of molecular structure-property relationships",
  q:"graph neural networks",url:"https://arxiv.org/abs/2208.04852"},
 {field:"biology",source:"biorxiv",doi:"10.64898/2026.07.07.737032",
  title:"Single-cell RNA-seq reveals conserved and divergent cellular states across wound types and species",
  q:"single cell RNA",url:"https://www.biorxiv.org/content/10.64898/2026.07.07.737032v1"},
 {field:"chemistry",source:"chemrxiv",doi:"10.26434/chemrxiv-2023-ztkkz",
  title:"Controlling the CO2 Reduction Reaction through Dual Atom Catalysts Embedded in Expanded Porphyrins: A DFT Study",
  q:"CO2 reduction",url:"https://doi.org/10.26434/chemrxiv-2023-ztkkz"}
];
const records=gold.map(p=>A.normalize(p.source,p));
records.forEach((p,i)=>{
 assert.ok(p,"Real source-backed paper must normalize: "+gold[i].field);
 assert.ok(p.url.startsWith("https://"),"Original source URL required");
});
const bySource={arxiv:records.filter(p=>p.source==="arxiv"),
 biorxiv:records.filter(p=>p.source==="biorxiv"),
 chemrxiv:records.filter(p=>p.source==="chemrxiv")};
let correct=0;
for(let i=0;i<gold.length;i++){
 const tc=gold[i];
 const rows=A.filter(bySource[tc.source],{q:tc.q,sort:"relevance"});
 assert.ok(rows.length,"Expected source paper to be retrievable for "+tc.field);
 const found=rows[0].id===records[i].id;
 assert.ok(found,"Correct source document must rank first for "+tc.field);
 correct+=Number(found);
}
assert.equal(correct,5);
console.log("SOURCE-LINKED sanity benchmark: 5/5 known target papers retrieved at rank 1");
console.log("This does not estimate recall over unindexed papers; n=5, editorial labels, narrow queries.");
