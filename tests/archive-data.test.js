"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const storage=new Map();
const sandbox={
 URL,URLSearchParams,AbortSignal,Event,dispatchEvent(){},
 localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
 fetch:async url=>{
  assert.match(String(url),/ebi\.ac\.uk\/europepmc/);
  return {ok:true,json:async()=>({hitCount:2,resultList:{result:[
   {doi:"10.1101/123456",title:"Protein design",bookOrReportDetails:{publisher:"bioRxiv"}},
   {doi:"10.1101/234567",title:"Clinical study",bookOrReportDetails:{publisher:"medRxiv"}}
  ]}})};
 }
};
sandbox.window=sandbox;
vm.createContext(sandbox);
for(const file of ["arxiv-versions.js","archive-taxonomy.js","archive-data.js"])
 vm.runInContext(fs.readFileSync("docs/"+file,"utf8"),sandbox);
const data=sandbox.AxiovoArchiveData;
const taxonomy=sandbox.AxiovoArchiveTaxonomy;
assert.equal(taxonomy.directory("arxiv").length,155);
assert.equal(taxonomy.directory("biorxiv").length,27);
assert.equal(taxonomy.directory("chemrxiv").length,17);
const original=data.normalize("arxiv",{id:"2207.00001v1",title:"Earlier abstract",abstract:"Earlier text",categories:["cs.CV"]});
const revision=data.normalize("arxiv",{id:"2207.00001v2",title:"Revised title"});
assert.equal(data.merge([original],[revision])[0].abstract,"");
assert.equal(data.filter([original,revision],{q:"2207.00001v1"}).length,1);
assert.equal(data.addComparison(original),"added");
assert.equal(data.addComparison(revision),"added");
assert.equal(data.comparison().length,2);
assert.equal(data.save(revision),true);
assert.equal(data.saved(revision),true);
assert.equal(data.savedRecords("arxiv")[0].recordId,"2207.00001v2");
data.live("biorxiv",{q:"protein design"}).then(result=>{
 assert.equal(result.papers.length,1);
 assert.equal(result.papers[0].id,"10.1101/123456");
 console.log("Archive taxonomy, exact revision matching, shortlist storage and bioRxiv source verification passed.");
}).catch(error=>{console.error(error);process.exitCode=1});
