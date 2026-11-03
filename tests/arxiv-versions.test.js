"use strict";
const assert=require("node:assert/strict");
const A=require("../docs/arxiv-versions.js");
for(const [raw,base,version] of [
 ["2608.13942v1","2608.13942",1],["https://arxiv.org/abs/2608.13942v12","2608.13942",12],
 ["https://arxiv.org/pdf/2608.13942v2.pdf","2608.13942",2],
 ["cond-mat/0207270v1","cond-mat/0207270",1],
 ["arxiv:2608.13942","2608.13942",null]
]){assert.equal(A.parse(raw).base,base);assert.equal(A.parse(raw).version,version)}
assert.equal(A.parse("bad stuff"),null);
assert.equal(A.parse("2608.13942v0"),null);
assert.equal(A.abs("2608.13942v3"),"https://arxiv.org/abs/2608.13942v3");
assert.equal(A.pdf("2608.13942v3"),"https://arxiv.org/pdf/2608.13942v3");
assert.equal(A.abs("2608.13942"),"https://arxiv.org/abs/2608.13942");
const w={locations:[{landing_page_url:"https://arxiv.org/abs/2608.13942v1"},
 {pdf_url:"https://arxiv.org/pdf/2608.13942v2.pdf"},
 {landing_page_url:"https://other.org/repository/2608.13942"}]};
assert.deepEqual(A.candidates(w).map(x=>x.requested),["2608.13942v1","2608.13942v2"]);
assert.equal(A.resolve(w,"2608.13942v3").requested.requested,"2608.13942v3");
assert.equal(A.resolve(w,"2608.13942v3").verified,true);
assert.equal(A.resolve(w,"2501.00001v1").verified,false);
assert.equal(A.officialSearchUrl("2608.13942v1"),"https://arxiv.org/abs/2608.13942v1");
console.log("arXiv version and canonical URL tests passed");
