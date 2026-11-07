"use strict";
/* Deterministic parity verification: background ranking must match the exact
 * pre-existing Axiovo relevance engine, including homonym protections,
 * revisions, source-specific paths and saved-reference matching.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const core=require("../docs/feed-core.js");
const follow=require("../docs/author-follow.js");
const root=path.join(__dirname,"../docs");
let last=null;
const ctx={};
ctx.self=ctx;ctx.window=ctx;
ctx.postMessage=value=>{last=value};
vm.createContext(ctx);
ctx.importScripts=(...files)=>{
 for(const file of files){
  const text=fs.readFileSync(path.join(root,file),"utf8");
  vm.runInContext(text,ctx,{filename:file,timeout:10000});
 }
};
vm.runInContext(fs.readFileSync(path.join(root,"feed-rank-worker.js"),"utf8"),
 ctx,{filename:"feed-rank-worker.js",timeout:10000});
const papers=Array.from({length:2100},(_,i)=>({
 id:"2611."+String(i).padStart(5,"0")+"v"+(i%3+1),source:"arxiv",
 title:i%17===0?"Sequential quantum contextuality and information":"General theoretical science "+i,
 abstract:i%11===0?"Quantum information theory and preparation contextuality":"Results for distinct scientific topic "+i,
 authors:i%19===0?["Pritam Roy","A. S. Majumdar"]:["Another Researcher"],
 date:i%7===0?"2026-11-04":"2026-11-05",
 categories:i%7===0?["quant-ph"]:["math-ph"],
 url:"https://arxiv.org/abs/2611."+String(i).padStart(5,"0")+"v"+(i%3+1)
}));
const prefs={
 authors:["Pritam Roy"],directTopics:["preparation contextuality","quantum information"],
 topics:["preparation contextuality","quantum information"],
 hidden:["arxiv:2611.00001"],saved:["arxiv:2611.00000"],
 includeUnverifiedNames:false,
 paths:[{source:"arxiv",category:"quant-ph",label:"Quantum information",
  terms:["quantum information"]}],
 references:[papers[17]],
 matchesAuthor:(a,b)=>Boolean(follow.matchesName(a,b))||String(a).toLowerCase()===String(b).toLowerCase()
};
const now=Date.parse("2026-11-07T04:00:00Z");
const baseline=core.build(papers,prefs,now);
const {matchesAuthor,...plain}=prefs;
ctx.onmessage({data:{type:"rank",id:1,generation:1,papers,prefs:plain,now}});
assert.equal(last.type,"result");
assert.equal(last.generation,1);
assert.deepEqual(JSON.parse(JSON.stringify(last.items)),JSON.parse(JSON.stringify(baseline)),
 "Worker must reproduce every existing ranking, score, reason, paper and ordering");
assert.equal(last.items.length,baseline.length);
const blocked=baseline.filter(x=>x.nameOnly);
assert.equal(blocked.length,0,"No unverified name-only papers may enter default feed");
ctx.onmessage({data:{type:"rank",id:2,generation:1,prefs:{...plain,
 includeUnverifiedNames:true},now}});
const opted=core.build(papers,{...prefs,includeUnverifiedNames:true},now);
assert.deepEqual(JSON.parse(JSON.stringify(last.items)),JSON.parse(JSON.stringify(opted)),
 "Opt-in homonym rankings must match exactly");
ctx.onmessage({data:{type:"rank",id:3,generation:4,prefs:plain,now}});
assert.equal(last.type,"error","Outdated metadata generation must not return stale items");
const mutated={...papers[0],title:"New science",abstract:"Quantum information unknown"};
const first=core.build([mutated],{topics:["quantum information"]},now);
mutated.abstract="No scientific topic match";
const second=core.build([mutated],{topics:["quantum information"]},now);
assert.notDeepEqual(first.map(x=>x.key),second.map(x=>x.key),
 "Token cache must invalidate when a paper's abstract changes");
console.log("PASS: 2,100 complete records; exact worker/main ranking parity, homonym safety, cache invalidation and stale generation.");
