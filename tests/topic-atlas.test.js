"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
global.window=global;
require("../docs/archive-taxonomy.js");
require("../docs/topic-atlas.js");
const atlas=global.AxiovoTopicAtlas;
const expected={arxiv:155,biorxiv:27,chemrxiv:17};
let count=0;
for(const [source,subjects] of Object.entries(expected)){
 const content=fs.readFileSync("docs/data/topics/"+source+".tsv","utf8");
 const catalog=atlas.parse(content,source);
 assert.equal(catalog.size,subjects);
 for(const [code,branches] of catalog){
  assert.ok(branches.length>=3,code+" needs meaningful subfields");
  for(const branch of branches)assert.ok(branch.leaves.length>=3,code+" / "+branch.name);
  count+=branches.flatMap(branch=>branch.leaves).length;
 }
 const index=atlas.makeIndex(source,catalog);
 if(source==="arxiv"){
  assert.equal(atlas.find(index,"stat.ML")[0].category,"stat.ML");
  const path=atlas.find(index,"Lieb-Robinson bounds").find(row=>row.category==="math-ph");
  assert.equal(path.topic,"quantum-many-body-theory");
  const math=atlas.subjects(source).byCode.get("math-ph");
  const custom=atlas.catalogFor(catalog,math,[{category:"math-ph",topic:"Quantum many-body theory",leaf:"Nonlocal propagation"}]);
  const branch=custom.find(row=>row.id==="quantum-many-body-theory");
  assert.ok(branch.leaves.some(row=>row.name==="Nonlocal propagation"));
  assert.equal(atlas.terms(branch,branch.leaves.at(-1))[0],"Nonlocal propagation");
  const family=atlas.subjects(source).byCode.get("cond-mat");
  assert.ok(atlas.catalogFor(catalog,family).find(row=>row.id==="topological-phases-of-matter").leaves.length>=5);
 }
 if(source==="biorxiv"){
  const path=atlas.find(index,"spatial transcriptomics")[0];
  assert.equal(path.category,"Genomics");
  assert.equal(path.subtopic,"spatial-transcriptomics");
 }
}
assert.ok(count>2100);
console.log("Topic catalog covers all 199 archive subjects with "+count+" sub-subtopics, searchable paths and personal additions.");
