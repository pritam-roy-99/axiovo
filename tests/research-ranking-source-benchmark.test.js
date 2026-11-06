"use strict";
/* Source-grounded known-item research ranking benchmark, Nov 2026.
 * Titles, identifiers and original URLs reference real publisher/preprint
 * records; the search labels are small editorial judgements, not ground truth
 * for all literature. Each query is evaluated against MULTIPLE candidate
 * papers; it is not valid to call this a global recall evaluation.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const sandbox={URL,URLSearchParams,AbortSignal,
 localStorage:{getItem:()=>null,setItem(){}},
 fetch:async()=>{throw Error("Benchmark is offline")}};
sandbox.window=sandbox;vm.createContext(sandbox);
for(const filename of ["arxiv-versions.js","archive-data.js"])
 vm.runInContext(fs.readFileSync("docs/"+filename,"utf8"),sandbox);
const A=sandbox.AxiovoArchiveData;
const references=[
 {source:"arxiv",id:"2208.12842",field:"physics",
  title:"Advances in device-independent quantum key distribution",
  url:"https://arxiv.org/abs/2208.12842"},
 {source:"arxiv",id:"2405.04709",field:"mathematics",
  title:"Quillen's Fundamental Spectral Sequences Revisited",
  url:"https://arxiv.org/abs/2405.04709"},
 {source:"arxiv",id:"2208.04852",field:"computer science",
  title:"Graph neural networks for the prediction of molecular structure-property relationships",
  url:"https://arxiv.org/abs/2208.04852"},
 {source:"biorxiv",doi:"10.64898/2026.07.07.737032",field:"biology",
  title:"Single-cell RNA-seq reveals conserved and divergent cellular states across wound types and species",
  url:"https://www.biorxiv.org/content/10.64898/2026.07.07.737032v1"},
 {source:"biorxiv",doi:"10.1101/2025.02.05.636714",field:"biology",
  title:"scGPT-spatial: Continual Pretraining of Single-Cell Foundation Model for Spatial Transcriptomics",
  url:"https://www.biorxiv.org/content/10.1101/2025.02.05.636714v1"},
 {source:"biorxiv",doi:"10.64898/2026.09.28.754546",field:"biology",
  title:"Genome-resolved ecology and evolution of the microbiome enabled by quantitative long-read metagenomics",
  url:"https://www.biorxiv.org/content/10.64898/2026.09.28.754546v1"},
 {source:"chemrxiv",doi:"10.26434/chemrxiv-2023-ztkkz",field:"chemistry",
  title:"Controlling the CO2 Reduction Reaction through Dual Atom Catalysts Embedded in Expanded Porphyrins: A DFT Study",
  url:"https://doi.org/10.26434/chemrxiv-2023-ztkkz"},
 {source:"chemrxiv",doi:"10.26434/chemrxiv-2024-hsvp",field:"chemistry",
  title:"Stable 25 % Efficiency Inorganic Perovskite/Organic Tandem Solar Cells Enabled by Methoxy-free D-A-D'-A-D Interconnecting Layer",
  url:"https://doi.org/10.26434/chemrxiv-2024-hsvp"},
 {source:"chemrxiv",doi:"10.26434/chemrxiv-2024-lnz4f",field:"chemistry",
  title:"Photocatalysis of Viologen-radical-driven Hydrogen Evolution from Water Using Macrocyclic Co-NHC Catalysts",
  url:"https://doi.org/10.26434/chemrxiv-2024-lnz4f"}
];
const candidates=references.map(item=>{
 const record=A.normalize(item.source,item);
 assert.ok(record,"A source-backed paper must normalize: "+item.title);
 assert.ok(record.url.startsWith("https://"),"Paper must have a source-backed link");
 return record;
});
const queries=[
 {field:"physics",source:"arxiv",q:"device independent quantum key distribution",gold:"2208.12842"},
 {field:"mathematics",source:"arxiv",q:"fundamental spectral sequences",gold:"2405.04709"},
 {field:"computer science",source:"arxiv",q:"graph neural networks",gold:"2208.04852"},
 {field:"biology",source:"biorxiv",q:"single cell RNA",gold:"10.64898/2026.07.07.737032"},
 {field:"chemistry",source:"chemrxiv",q:"CO2 reduction",gold:"10.26434/chemrxiv-2023-ztkkz"}
];
let hitAtOne=0,reciprocalRank=0;
for(const test of queries){
 const pool=candidates.filter(x=>x.source===test.source);
 assert.ok(pool.length>=3,"Benchmark must include at least 3 genuine source records");
 const ranked=A.filter(pool,{q:test.q,sort:"relevance"});
 const rank=ranked.findIndex(x=>x.id===test.gold)+1;
 assert.ok(rank>0,"Known relevant paper must be retrievable: "+test.field);
 assert.equal(rank,1,"Known relevant paper must rank ahead of source-linked distractors: "+test.field);
 hitAtOne+=Number(rank===1);reciprocalRank+=1/rank;
}
assert.equal(hitAtOne,queries.length);
console.log("Real source-linked known-item ranking: "+hitAtOne+"/"+queries.length+" top-1 across "+candidates.length+
 " distinct publisher-linked candidate papers, MRR="+(reciprocalRank/queries.length).toFixed(2));
console.log("Scope: five hand-labelled navigational queries, small and curated pools; NOT a live provider recall, precision, or broad relevance estimate.");
