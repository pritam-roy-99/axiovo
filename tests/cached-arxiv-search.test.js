"use strict";
const assert=require("node:assert/strict");
const Cache=require("../docs/cached-arxiv-search.js");
const papers=[
 {id:"2610.00001",title:"Bell nonlocality and CHSH inequalities in entangled qubits",
  abstract:"An operational Bell test under noise with quantum correlations.",authors:["Physicist A"],
  published:"2026-10-01T00:00:00Z",categories:["quant-ph"],primary_category:"quant-ph"},
 {id:"2503.01234",title:"Quantum nonlocal correlations under measurement imperfections",
  abstract:"Violation of a Bell inequality by entangled quantum states.",authors:["Physicist B"],
  published:"2025-03-12T00:00:00Z",categories:["quant-ph"],primary_category:"quant-ph"},
 {id:"2611.00009",title:"Bell inequality tests and nonlocal physics",
  abstract:"Measurement choices in quantum Bell experiments.",published:"2026-11-02T00:00:00Z",
  categories:["quant-ph"],primary_category:"quant-ph"},
 {id:"2609.10000",title:"Contextual education and employment statistics",
  abstract:"A survey of housing in Jakarta.",published:"2026-09-01",
  categories:["econ.GN"],primary_category:"econ.GN"},
 {id:"2608.00012",title:"Quantum computing with stabilizer measurements",
  abstract:"Quantum error correction and logical circuits.",published:"2026-08-01",
  categories:["quant-ph"],primary_category:"quant-ph"},
 {id:"2701.00001",title:"Bell nonlocality future test",
  abstract:"Quantum CHSH correlations.",published:"2027-01-01",
  categories:["quant-ph"],primary_category:"quant-ph"}
];
const window=Cache.find({papers},{field:"quantum",query:"Bell nonlocality",from:"2026-11-01",to:"2026-11-03",today:"2026-11-03"});
assert.deepEqual(window.items.map(w=>w.id),["https://arxiv.org/abs/2611.00009"]);
assert.equal(window.outsideDates,false);
const missing=Cache.find({papers},{field:"quantum",query:"Bell nonlocality",from:"2026-11-03",to:"2026-11-03",today:"2026-11-03"});
assert.equal(missing.outsideDates,true);
assert.equal(missing.items.length,3);
assert.equal(missing.items[0].primary_location.source.display_name,"arXiv");
assert.equal(missing.items[0].__source,"local-arxiv");
assert.equal(Cache.find(papers,{field:"quantum",query:"Bell nonlocality",today:"2026-11-03"}).items.length,3);
assert.equal(Cache.find(papers,{field:"medicine",query:"Bell nonlocality",today:"2026-11-03"}).items.length,0);
assert.equal(Cache.find(papers,{field:"quantum",query:"Quantum computing",today:"2026-11-03"}).items.length,1);
assert.equal(Cache.find(papers,{field:"quantum",query:"Random unrelated phrase",today:"2026-11-03"}).items.length,0);
const physicsExtra=[
 {id:"2610.00122",title:"Nonequilibrium statistical mechanics of driven diffusive systems",
  abstract:"Critical phenomena and entropy production",published:"2026-10-02",
  categories:["cond-mat.stat-mech"],primary_category:"cond-mat.stat-mech"},
 {id:"2610.00123",title:"Superconductivity in twisted bilayer graphene",
  abstract:"Correlated electron transport and moiré materials",published:"2026-10-02",
  categories:["cond-mat.supr-con"],primary_category:"cond-mat.supr-con"},
 {id:"2610.00124",title:"Stock market trends",
  abstract:"Financial time series",published:"2026-10-02",
  categories:["q-fin.ST"],primary_category:"q-fin.ST"}
];
assert.equal(Cache.find(physicsExtra,{field:"statmech",query:"Nonequilibrium statistical mechanics",today:"2026-11-03"}).items.length,1);
assert.equal(Cache.find(physicsExtra,{field:"condmat",query:"Superconductivity",today:"2026-11-03"}).items.length,1);
assert.equal(Cache.find(physicsExtra,{field:"statmech",query:"Stock market",today:"2026-11-03"}).items.length,0);
const particlePapers=[
 {id:"2610.00130",title:"Higgs boson collider physics",abstract:"LHC precision measurement",published:"2026-10-05",categories:["hep-ex"],primary_category:"hep-ex"},
 {id:"2610.00131",title:"Renormalization in quantum field theory",abstract:"Perturbative gauge theories",published:"2026-10-05",categories:["hep-th"],primary_category:"hep-th"},
 {id:"2610.00132",title:"Medical treatment analysis",abstract:"Clinical trial",published:"2026-10-05",categories:["q-bio.MN"],primary_category:"q-bio.MN"}
];
assert.equal(Cache.find(particlePapers,{field:"highenergy",query:"Higgs boson",today:"2026-11-03"}).items.length,1);
assert.equal(Cache.find(particlePapers,{field:"highenergy",query:"Renormalization quantum field theory",today:"2026-11-03"}).items.length,1);
assert.equal(Cache.find(particlePapers,{field:"highenergy",query:"Medical treatment",today:"2026-11-03"}).items.length,0);
console.log("Cached arXiv fallback under OpenAlex rate limiting passed");
