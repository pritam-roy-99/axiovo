"use strict";
const assert=require("node:assert/strict");
const I=require("../docs/inspire-author.js");
assert.deepEqual(I.person("Sarkar, Shubhayan"),{given:"shubhayan",family:"sarkar"});
assert.deepEqual(I.person("Shubhayan Sarkar"),{given:"shubhayan",family:"sarkar"});
assert.equal(I.sameAuthor("Sarkar, Shubhayan","Shubhayan Sarkar"),true);
assert.equal(I.sameAuthor("Sarkar, Siddhartha","Shubhayan Sarkar"),false);
assert.equal(I.sameAuthor("Sarkar, Sourav","Shubhayan Sarkar"),false);
assert.equal(I.sameAuthor("Sarkar, S.","Shubhayan Sarkar"),false,"Initial-only names are ambiguous");
assert.equal(I.params("Shubhayan Sarkar").get("q"),"ea sarkar, shubhayan");
const fixture={hits:{hits:[
 {metadata:{titles:[{title:"Network steering with arbitrarily low detection efficiency"}],earliest_date:"2026-08-27",
   authors:[{full_name:"Sarkar, Shubhayan"}],arxiv_eprints:[{value:"2608.27582"}]}},
 {metadata:{titles:[{title:"Unrelated paper"}],authors:[{full_name:"Sarkar, Siddhartha"}],arxiv_eprints:[{value:"2608.12345"}]}},
 {metadata:{titles:[{title:"Invalid linked record"}],authors:[{full_name:"Sarkar, Shubhayan"}],arxiv_eprints:[{value:"javascript:alert(1)"}]}}
]}};
const papers=I.normalize(fixture,"Shubhayan Sarkar");
assert.equal(papers.length,1);
assert.equal(papers[0].id,"2608.27582");
assert.equal(papers[0].title,"Network steering with arbitrarily low detection efficiency");
console.log("INSPIRE author fallback precise-name and arXiv ID checks passed");
