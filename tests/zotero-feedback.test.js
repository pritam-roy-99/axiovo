"use strict";
const assert=require("node:assert/strict");
const Zotero=require("../docs/zotero-ris.js");
const Learn=require("../docs/local-feedback.js");
const source={id:"2507.18744v2",title:"Secure one-sided device-independent quantum key distribution",
 authors:["Pritam Roy","A. S. Majumdar"],published:"2025-07-24",doi:"10.1007/s11128-026-05073-9"};
const ris=Zotero.ris(source);
assert(ris.includes("UR  - https://arxiv.org/abs/2507.18744v2"));
assert(ris.includes("AN  - arXiv:2507.18744v2"));
assert(ris.includes("DO  - 10.1007/s11128-026-05073-9"));
assert.deepEqual(Zotero.parseRIS(ris),["2507.18744v2"]);
const zoteroFile="TY  - JOUR\nTI  - Article in Zotero\nUR  - https://arxiv.org/abs/2507.18744\nER  - \n"+
"TY  - JOUR\nTI  - Other article\nUR  - https://example.org/not-arxiv\nER  - \n";
assert.deepEqual(Zotero.parseRIS(zoteroFile),["2507.18744"]);
assert.equal(Zotero.fromText("javascript:alert(1)"),"");
assert.equal(Zotero.fromText("arXiv:2507.18744v2"),"2507.18744v2");
const store=new Map();
const storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
assert.equal(Learn.set(storage,"2507.18744",1),true);
assert.equal(Learn.load(storage)["2507.18744"],1);
const papers=[
 {id:"2507.18744",title:"Quantum key distribution security",topics:["qkd"]},
 {id:"2508.10001",title:"Quantum key distribution robustness",topics:["qkd"]},
 {id:"2601.10001",title:"Chemistry synthesis reactions",topics:["chemistry"]}
];
assert(Learn.score(papers[1],papers,Learn.load(storage))>Learn.score(papers[2],papers,Learn.load(storage)));
assert.equal(Learn.set(storage,"2507.18744",0),true);
assert.equal(Learn.load(storage)["2507.18744"],undefined);
console.log("Zotero RIS interoperability and local recommendation feedback passed");
