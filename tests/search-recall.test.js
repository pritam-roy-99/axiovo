"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const calls=[];
const sandbox={
 URL,URLSearchParams,AbortSignal,Event,
 dispatchEvent(){},
 localStorage:{getItem(){return null},setItem(){}},
 fetch:async url=>{
  calls.push(String(url));
  const current=new URL(String(url));
  assert.equal(current.hostname,"api.biorxiv.org");
  return {ok:true,json:async()=>({
   messages:[{total:"4",status:"ok"}],
   collection:[{
    doi:"10.1101/2026.11.01.000001",
    title:"Verified genome manuscript",
    authors:"Scientist A; Scientist B",
    date:"2026-11-01",version:"1",category:"genomics"
   },{
    doi:"10.64898/2026.11.01.000002",
    title:"Second verified manuscript",
    authors:"Scientist C",
    date:"2026-11-01",version:"1",category:"genomics"
   }]
  })}
 }
};
sandbox.window=sandbox;
vm.createContext(sandbox);
for(const file of ["arxiv-versions.js","archive-data.js"]){
 vm.runInContext(fs.readFileSync("docs/"+file,"utf8"),sandbox);
}
(async()=>{
 const api=sandbox.AxiovoArchiveData;
 const result=await api.live("biorxiv",{q:"",to:"2026-11-01",sort:"recent",recentOnly:true});
 assert.equal(result.total,4);
 assert.equal(result.next,2);
 assert.ok(calls[0].includes("/2013-11-01/2026-11-01/0/json"),
  "An end date is an inclusive upper bound, including earlier source records");
 const paper=api.normalize("biorxiv",{doi:"10.1101/2026.11.01.000001",title:"Verified genome manuscript",category:"genomics"});
 assert.equal(api.filter([paper],{q:"genome",category:{name:"Genomics",code:"genomics"}}).length,1);
 const other=api.normalize("biorxiv",{doi:"10.1101/2026.11.01.000003",title:"Quantum processor",category:"neuroscience"});
 assert.equal(api.filter([other],{q:"genome",category:{name:"Genomics",code:"genomics"}}).length,0);
 console.log("Verified date-only search window, pagination, source identity and discipline filtering.");
})().catch(error=>{console.error(error);process.exitCode=1});
