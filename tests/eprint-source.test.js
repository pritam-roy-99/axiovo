"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const storage=new Map([["axiovo-reading-list",'["2207.00001v2"]'],
 ["axiovo-biorxiv-reading-v1",'[]'],["axiovo-chemrxiv-reading-v1",'[]']]);
const browser={URL,URLSearchParams,AbortSignal,Event,
 dispatchEvent(){},localStorage:{
  getItem:key=>storage.has(key)?storage.get(key):null,
  setItem:(key,value)=>storage.set(key,String(value))
 },fetch:async url=>{
  if(String(url).includes("eprint.json"))return {ok:true,json:async()=>({
   generated_at:"2026-11-07T07:00:00Z",coverage:"incremental-OAI-PMH-snapshot-not-full-history",
   papers:[{id:"2026/1234",title:"Quantum key distribution with authentication",
    authors:["Researcher One"],abstract:"Quantum key distribution methods and authentication",
    date:"2026-11-05",metadata_updated:"2026-11-07",categories:["Quantum cryptography"]}]})};
  throw Error("Unexpected cross-source request: "+url)
 }};
browser.window=browser;vm.createContext(browser);
for(const p of ["arxiv-versions.js","archive-data.js"]){
 vm.runInContext(fs.readFileSync("docs/"+p,"utf8"),browser,{filename:p});
}
const api=browser.AxiovoArchiveData;
assert.equal(api.parseEprint("https://eprint.iacr.org/2026/001234"),"2026/1234");
assert.equal(api.parseEprint("2026/1234v2"),"","Do not invent ePrint revisions");
assert.equal(api.eprintIdentifier("2026/1234"),"2026/1234");
assert.equal(api.eprintIdentifier("quantum"),"");
assert.equal(api.names.eprint,"Cryptology ePrint");
const paper=api.normalize("eprint",{id:"2026/1234",title:"Secure quantum key distribution",authors:["Alice"],date:"2026-11-05"});
assert.equal(paper.url,"https://eprint.iacr.org/2026/1234");
assert.equal(paper.version,null);
assert.equal(paper.doi,"");
assert.equal(api.normalize("eprint",{id:"1010.1234",title:"Fake arXiv-like ID"}),null);
assert.equal(api.filter([paper],{q:"2026/1234"}).length,1);
assert.equal(api.filter([paper],{q:"2026/1235"}).length,0);
assert.equal(api.filter([paper],{q:"quantum",from:"2026-11-06"}).length,0);
assert.equal(api.save(paper),true);
assert.equal(api.saved(paper),true);
assert.equal(api.savedRecords("eprint").length,1);
assert.equal(storage.get("axiovo-reading-list"),'["2207.00001v2"]');
assert.equal(api.unsave(paper),true);
assert.equal(api.saved(paper),false);
(async()=>{
 const snapshot=await api.snapshot("eprint");
 assert.equal(snapshot.papers.length,1);
 assert.equal(snapshot.papers[0].url,"https://eprint.iacr.org/2026/1234");
 const live=await api.live("eprint",{q:"2026/1234"});
 assert.equal(live.papers.length,1);
 assert.match(live.provider,/partial coverage/);
 assert.equal(api.sourceLink("eprint",{q:"2026/1234"}),"https://eprint.iacr.org/2026/1234");
 assert.equal(api.sourceLink("eprint",{q:"quantum"}),"https://eprint.iacr.org/search");
 console.log("PASS: source IDs, official links, historical-coverage honesty, exact IACR matches and isolated Library preservation.");
})().catch(e=>{console.error(e);process.exitCode=1});
