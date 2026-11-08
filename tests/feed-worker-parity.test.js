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
const eprint={id:"2026/1234",title:"Quantum information cryptography",
 abstract:"Quantum information for cryptography",authors:["A. Researcher"],date:"2026-11-07"};
const ctx={AbortSignal,AbortController,URLSearchParams,URL,setTimeout,clearTimeout,
 fetch:async url=>{
  if(String(url).endsWith("/eprint.json"))return {ok:true,json:async()=>({source:"eprint",papers:[eprint]})};
  if(String(url).endsWith("/feed.json"))return {ok:true,json:async()=>({papers})};
  return {ok:false,status:503};
 }};
ctx.self=ctx;ctx.window=ctx;
ctx.postMessage=value=>{last=value};
vm.createContext(ctx);
ctx.importScripts=(...files)=>{
 for(const file of files){
  const text=fs.readFileSync(path.join(root,file.split("?")[0]),"utf8");
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
const {matchesAuthor,...plain}=prefs;
const same=(a,b,message)=>assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),message);
(async()=>{
 let id=0;
 async function request(method,...args){
  const sent=++id;
  await ctx.onmessage({data:{id:sent,method,args}});
  assert.equal(last.id,sent);
  assert.equal(last.error,undefined);
  return last.value;
 }
 const loaded=await request("snapshot","arxiv",false);
 assert.equal(loaded.count,papers.length,"Worker fetches and indexes the full snapshot");
 assert.equal(loaded.papers,undefined,"Full snapshots stay in the worker");
 const loadedEprint=await request("snapshot","eprint",false);
 assert.equal(loadedEprint.count,papers.length+1);
 assert.equal(loadedEprint.eprint.papers[0].id,eprint.id,"Verified ePrint fallback survives worker mode");
 const archive=ctx.AxiovoArchiveData;
 const normalized=archive.merge(papers.map(p=>archive.normalize("arxiv",p)),[ctx.AxiovoEprintSource.normalize(eprint)]);
 const baseline=core.build(normalized,prefs,now);
 same(await request("rank",plain,now),baseline,"Exact worker/main ranking parity");
 assert.equal(baseline.filter(x=>x.nameOnly).length,0,"No unverified name-only papers enter default feed");
 const opted={...plain,includeUnverifiedNames:true};
 same(await request("rank",opted,now),core.build(normalized,{...opted,matchesAuthor},now),
  "Opt-in homonym rankings must match exactly");
 const mutated={...papers[0],title:"New science",abstract:"Quantum information unknown"};
 const first=core.build([mutated],{topics:["quantum information"]},now);
 mutated.abstract="No scientific topic match";
 const second=core.build([mutated],{topics:["quantum information"]},now);
 assert.notDeepEqual(first.map(x=>x.key),second.map(x=>x.key),
  "Token cache must invalidate when a paper's abstract changes");
 console.log("PASS: 2,101 records indexed in the worker with exact ranking parity and homonym safety.");
})().catch(error=>{console.error(error);process.exitCode=1});
