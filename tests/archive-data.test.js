"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const storage=new Map([["researchlens-reading-list",'["2207.00009v1"]']]);
const requests=[];
const sandbox={
 URL,URLSearchParams,AbortSignal,Event,dispatchEvent(){},
 localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
 fetch:async url=>{
  if(String(url).startsWith("./data/")){
   const id=String(url).endsWith("feed.json")?"2207.00001v1":"2207.00001v2";
   return {ok:true,json:async()=>({papers:[{id,title:"Indexed revision "+id}]})};
  }
  const request=new URL(String(url));requests.push(request);
  if(request.hostname==="api.biorxiv.org")return {
   ok:true,json:async()=>({messages:[{status:"no posts found"}],collection:[]})
  };
  assert.match(String(url),/ebi\.ac\.uk\/europepmc/);
  const query=new URL(String(url)).searchParams.get("query");
  assert.match(query,/PUBLISHER:"bioRxiv"/);
  assert.doesNotMatch(query,/JOURNAL:/);
  return {ok:true,json:async()=>({hitCount:2,resultList:{result:[
   {doi:"10.1101/123456",title:"Protein design with spatially resolved transcriptomics",bookOrReportDetails:{publisher:"bioRxiv"}},
   {doi:"10.1101/234567",title:"Clinical study",bookOrReportDetails:{publisher:"medRxiv"}}
  ]}})};
 }
};
sandbox.window=sandbox;
vm.createContext(sandbox);
for(const file of ["arxiv-versions.js","archive-taxonomy.js","archive-data.js"])
 vm.runInContext(fs.readFileSync("docs/"+file,"utf8"),sandbox);
const data=sandbox.AxiovoArchiveData;
for(const [source,first] of Object.entries({
 arxiv:"1991-08-01",biorxiv:"2013-11-01",chemrxiv:"2017-01-01",eprint:"1996-01-01"
})){
 assert.equal(data.historyRange(source,"2026-11-07").from,first);
 assert.equal(data.historyRange(source,"2026-11-07").to,"2026-11-07");
}
assert.equal(data.sourceDateWindow("biorxiv",{from:"1991-08-01"}).from,"2013-11-01");
assert.equal(data.sourceDateWindow("chemrxiv",{from:"1991-08-01"}).from,"2017-01-01");
assert.equal(data.sourceDateWindow("biorxiv",{from:"2020-01-01"}).from,"2020-01-01");

assert.equal(storage.get("axiovo-reading-list"),'["2207.00009v1"]',"Read older saved papers when the current key is absent");
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
const bioV1=data.normalize("biorxiv",{doi:"10.1101/123456",version:1,title:"Early version"});
const bioV2=data.normalize("biorxiv",{doi:"10.1101/123456",version:2,title:"Later version"});
assert(data.save(bioV1)&&data.save(bioV2));
assert.equal(data.savedRecords("biorxiv").length,2);
assert(data.unsave(bioV1));
assert.equal(data.saved(bioV1),false);
assert.equal(data.saved(bioV2),true,"Removing one bioRxiv version must keep the other");
const criteria={category:{code:"Genomics",name:"Genomics"},topicTerms:["spatial transcriptomics","spatially resolved transcriptomics"]};
data.live("biorxiv",criteria).then(async result=>{
 assert.equal(result.papers.length,1);
 assert.equal(result.papers[0].id,"10.1101/123456");
 assert.equal(data.filter(result.papers,criteria).length,1);
 const other=data.normalize("biorxiv",{doi:"10.1101/123450",title:"Spatial transcriptomics",category:"Ecology"});
 assert.equal(data.filter([other],criteria).length,0);
 const a=data.normalize("arxiv",{id:"2611.00001",title:"Paper A",authors:["Roy, Pritam"],categories:["quant-ph","math-ph"]});
 const b=data.normalize("arxiv",{id:"2611.00002",title:"Paper B",authors:["Pritam Other","Alice Roy"]});
 assert.equal(data.filter([a,b],{author:"Pritam Roy",crosslisted:true}).length,1);
 assert.equal(data.filter([a,b],{author:"Pritam Roy"}).length,1);
 const empty=await data.live("biorxiv",{q:"10.1101/123450"});
 assert.equal(empty.total,0);
 await data.live("biorxiv",{to:"2018-03-15"});
 assert.match(requests.at(-1).searchParams.get("query"),/FIRST_PDATE:\[2013-11-01 TO 2018-03-15\]/,
  "Historical bioRxiv search must query the indexed date range instead of a recent API stream");
 await data.live("biorxiv",{q:"transcriptomics",sort:"oldest"});
 assert.equal(requests.at(-1).searchParams.get("sort"),"P_PDATE_D asc");
 await data.live("biorxiv",{q:"transcriptomics",sort:"cited"});
 assert.equal(requests.at(-1).searchParams.get("sort"),"CITED desc");
 const snapshot=await data.snapshot("arxiv");
 assert.equal(snapshot.papers.length,2,"Distinct indexed revisions remain searchable");
 assert.equal(data.filter(snapshot.papers,{q:"2207.00001v1"})[0].recordId,"2207.00001v1");
 console.log("Archive taxonomy, exact revision matching, shortlist storage and bioRxiv source verification passed.");
}).catch(error=>{console.error(error);process.exitCode=1});
