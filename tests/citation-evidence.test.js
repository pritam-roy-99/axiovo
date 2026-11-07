const assert=require("node:assert/strict");
const e=require("../docs/citation-evidence.js");
const arxiv={source:"arxiv",id:"2601.12345v2",title:"Quantum contextuality"};
const bio={source:"biorxiv",id:"10.1101/2026.01.01.000001",doi:"https://doi.org/10.1101/2026.01.01.000001",title:"Cell biology"};
const chem={source:"chemrxiv",doi:"10.26434/chemrxiv-2026-abc",title:"Nanomaterials"};
const crypto={source:"eprint",id:"2025/001",title:"Proof systems for quantum cryptography"};
assert.equal(e.identity(arxiv).arxiv,"2601.12345");
assert.equal(e.identity(bio).doi,"10.1101/2026.01.01.000001");
assert.equal(e.identity(crypto).eprint,"2025/001");
assert.equal(e.identity(crypto).arxiv,"");
assert(e.directories(arxiv).some(x=>x.name==="SciX"));
assert(e.directories(arxiv).some(x=>x.name==="INSPIRE-HEP"));
assert(e.directories(bio).some(x=>x.name==="Europe PMC"));
assert(e.directories(chem).some(x=>x.name==="Crossref"));
assert(e.directories(crypto).some(x=>x.name==="IACR ePrint"&&x.url==="https://eprint.iacr.org/2025/001"));
assert(!e.directories(crypto).some(x=>x.name==="INSPIRE-HEP")); // not HEP by assumption
assert(!e.directories(crypto).some(x=>x.name==="Crossref")); // no DOI claimed
assert.equal(e.resultsFor(bio,{crossref:{message:{DOI:"10.1101/2026.01.01.000001","is-referenced-by-count":12}}})[0].count,12);
assert.deepEqual(e.resultsFor(bio,{crossref:{message:{DOI:"10.1101/wrong","is-referenced-by-count":999}}}),[]);
assert.deepEqual(e.resultsFor(bio,{crossref:{message:{DOI:"10.1101/2026.01.01.000001","is-referenced-by-count":null}}}),[]);
assert.deepEqual(e.resultsFor(bio,{crossref:{message:{DOI:"10.1101/2026.01.01.000001","is-referenced-by-count":-1}}}),[]);
assert.deepEqual(e.resultsFor(bio,{openalex:{doi:"https://doi.org/10.1101/2026.01.01.000001",cited_by_count:24}}).map(x=>x.count),[24]);
assert.deepEqual(e.resultsFor(bio,{openalex:{doi:"https://doi.org/10.1234/wrong",cited_by_count:2000,locations:[{doi:"https://doi.org/10.1101/2026.01.01.000001"}]}}).map(x=>x.count),[2000]);
assert.deepEqual(e.resultsFor(bio,{openalex:{doi:"https://doi.org/10.1234/wrong",cited_by_count:2000}}),[]);
assert.deepEqual(e.resultsFor(arxiv,{semantic:{citationCount:900,externalIds:{ArXiv:"2601.12345"}}}).map(x=>x.count),[900]);
assert.deepEqual(e.resultsFor(arxiv,{semantic:{citationCount:900,externalIds:{ArXiv:"2601.12346"}}}),[]);
assert.deepEqual(e.resultsFor(arxiv,{inspire:{hits:{hits:[{metadata:{arxiv_eprints:[{value:"2601.12345"}],citation_count:15}}]}}}).map(x=>x.count),[15]);
assert.deepEqual(e.resultsFor(arxiv,{inspire:{hits:{hits:[{metadata:{arxiv_eprints:[{value:"2601.12346"}],citation_count:15}}]}}}),[]);
console.log("PASS: citation providers, exact identifier matching, partial archive provenance and no invented citation counts");
