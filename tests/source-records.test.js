"use strict";
const assert=require("node:assert/strict");
const records=require("../docs/source-records.js");

const base={
 schema_version:2,id:"arxiv:2611.00001",source:"arxiv",source_id:"2611.00001",
 version:2,title:"Verified metadata",authors:[{name:"Author One",orcid:null}],
 abstract:"The updated abstract",categories:["quant-ph"],
 submitted_date:"2026-11-05",announced_date:"2026-11-06",
 updated_date:null,doi:null,
 landing_url:"https://arxiv.org/abs/2611.00001v2",
 pdf_url:"https://arxiv.org/pdf/2611.00001v2",
 provenance:{provider:"arxiv-atom",checked_at:"2026-11-07"},
 validation:{identity_verified:true,metadata_status:"verified",warnings:[]}
};
const newer=records.fromV2(base);
assert(newer);
assert.equal(newer.id,"2611.00001");
assert.equal(newer.recordId,"2611.00001v2");
assert.equal(newer.version,2);
assert.equal(newer.announcementDate,"2026-11-06");
assert.equal(newer.authors[0],"Author One");
assert.equal(records.fromV2({...base,version:1}),null,"Version mismatch cannot silently change a URL");
assert.equal(records.fromV2({...base,validation:{identity_verified:false}}),null);
assert.equal(records.fromV2({...base,id:"arxiv:2611.00002"}),null);
const unpinned=records.fromV2({...base,version:null,
 landing_url:"https://arxiv.org/abs/2611.00001",
 pdf_url:"https://arxiv.org/pdf/2611.00001"});
assert.equal(unpinned.version,null);
assert.equal(unpinned.recordId,"2611.00001");
const bio=records.fromV2({...base,id:"biorxiv:10.1101/2026.11.05.000001",
 source:"biorxiv",source_id:"10.1101/2026.11.05.000001",version:1,
 doi:"10.1101/2026.11.05.000001",
 landing_url:"https://www.biorxiv.org/content/10.1101/2026.11.05.000001v1",
 pdf_url:"https://www.biorxiv.org/content/10.1101/2026.11.05.000001v1.full.pdf"});
assert.equal(bio.version,1);
assert.equal(records.doi("HTTPS://DOI.ORG/10.1101/ABC.2"),"10.1101/abc.2");
assert.equal(records.fromV2({...base,source:"chemrxiv"}),null);
const legacy=records.convert({id:"2207.00001v1",title:"Saved legacy paper",
 abstract:"Legacy abstract",authors:["Author A"]},"arxiv");
assert.equal(legacy.recordId,"2207.00001v1");
assert.equal(legacy.validation.metadata_status,"legacy-unverified");
assert.equal(records.arxiv("arxiv:invented"),null);
console.log("Axiovo v2 adapter: identity, revision and legacy read compatibility pass.");
