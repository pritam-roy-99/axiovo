"use strict";
/* Baseline: the canonical adapter must not mutate existing user storage. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const keys={
 "axiovo-reading-list":JSON.stringify(["2611.00001v2","10.1101/2026.11.05.000001"]),
 "researchlens-reading-list":JSON.stringify(["2207.00001v1"]),
 "axiovo-followed-authors-v1":JSON.stringify(["A. Researcher"]),
 "axiovo-feed-preferences-v1":JSON.stringify({topics:["quant-ph"]}),
 "axiovo-research-projects-v1":JSON.stringify([{id:"project-1",notes:"Keep this"}]),
 "axiovo-saved-searches":JSON.stringify(["quantum optics"])
};
const store=new Map(Object.entries(keys)),initial=new Map(store);
let touches=0;
const sandbox={
 localStorage:{
  getItem:key=>store.get(key)||null,
  setItem:(key,value)=>{touches++;store.set(key,String(value));},
  removeItem:key=>{touches++;store.delete(key);},
  clear:()=>{touches++;store.clear();}
 }
};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("docs/source-records.js","utf8"),sandbox);
const adapter=sandbox.AxiovoSourceRecords;
assert(adapter);
const pinned=adapter.convert({
 schema_version:2,id:"arxiv:2611.00001",source:"arxiv",
 source_id:"2611.00001",version:2,title:"Paper",authors:[],
 landing_url:"https://arxiv.org/abs/2611.00001v2",
 pdf_url:"https://arxiv.org/pdf/2611.00001v2",
 validation:{identity_verified:true}
});
assert.equal(pinned.recordId,"2611.00001v2");
assert.equal(adapter.fromLegacy("arxiv",{id:"2207.00001v1",title:"Earlier paper"}).recordId,"2207.00001v1");
assert.equal(touches,0,"Read-only source adapter must not write browser storage");
assert.deepEqual([...store],[...initial],"Saved research data must remain byte-for-byte unchanged");
for(const name of ["archive-data.js","workspace.js","feed.js","copilot.js","source-records.js"]){
 const source=fs.readFileSync("docs/"+name,"utf8");
 assert.doesNotMatch(source,/localStorage\.clear\s*\(/,name+" clears all user data");
}
console.log("Library preservation baseline: six legacy keys unchanged; source adapter is read-only.");
