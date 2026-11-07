const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const code=fs.readFileSync("docs/eprint-source.js","utf8");
const fixture={source:"eprint",generated_at:"2026-11-07T08:00:00Z",papers:[
 {id:"2026/1234",title:"Quantum key distribution protocols",authors:["A. Researcher"],
  abstract:"Quantum key distribution authentication",date:"2026-11-06"},
 {id:"not-an-IACR-ID",title:"Unverified paper"}]};
function app(fetcher,store={}){
 const localStorage={getItem:key=>store[key]||null,setItem:(key,val)=>{store[key]=val}};
 class AbortController{constructor(){this.signal={}}abort(){}}
 const window={localStorage};
 vm.runInNewContext(code,{window,localStorage,fetch:fetcher,AbortController,setTimeout:()=>0,clearTimeout:()=>{},URL});
 return {api:window.AxiovoEprintSource,store,window,localStorage};
}
(async()=>{
 let calls=0;
 const good=app(async()=>{calls++;if(calls===1)throw Error("local host temporarily unavailable");
  return {ok:true,json:async()=>fixture}});
 const result=await good.api.load();
 assert.equal(calls,2);
 await good.api.load();
 assert.equal(calls,2,"Repeated searches must reuse the verified in-memory snapshot");
 await good.api.load({force:true});
 assert.equal(calls,3,"Manual retry must revalidate the source");
 assert.equal(result.papers.length,1);
 assert.equal(result.papers[0].url,"https://eprint.iacr.org/2026/1234");
 assert.equal(result.papers[0].citations,null,"Unknown IACR citations must stay unknown");
 assert.equal(result.papers[0].affiliations.length,0,"Absent affiliations are not invented");

 assert.equal(good.api.filter(result.papers,{q:"2026/1234"}).length,1);
 assert.equal(good.api.filter(result.papers,{q:"https://eprint.iacr.org/2026/1234"}).length,1);
 assert.equal(good.api.filter(result.papers,{q:"eprint:2026/1234"}).length,1);
 assert.equal(good.api.filter(result.papers,{q:"2026/1235"}).length,0);
 const padded={source:"eprint",papers:[{id:"2025/001",title:"Historical verified IACR paper",authors:["Researcher"]},
 {id:"2025/000000",title:"Invalid zero identifier"}]};
 const historical=good.api.validate(padded);
 assert.equal(historical.papers.length,1);
 assert.equal(historical.papers[0].url,"https://eprint.iacr.org/2025/001");
 assert.equal(good.api.filter(historical.papers,{q:"eprint:2025/001"}).length,1);


 assert.equal(good.api.filter(result.papers,{topicTerms:["quantum key distribution"]}).length,1);
 // Shared Research Desk and My Feed use this same verified ePrint reader.
 good.window.AxiovoArxiv={parse:()=>null};
 vm.runInNewContext(fs.readFileSync("docs/archive-data.js","utf8"),{
  window:good.window,localStorage:good.localStorage,URL,URLSearchParams,
  AbortSignal,Event,fetch:async()=>{throw Error("Shared source fallback was bypassed");}
 });
 const shared=await good.window.AxiovoArchiveData.snapshot("eprint");
 assert.equal(shared.papers.length,1);
 assert.equal(shared.papers[0].url,"https://eprint.iacr.org/2026/1234");
 const viaDesk=await good.window.AxiovoArchiveData.live("eprint",{q:"2026/1234"});
 assert.equal(viaDesk.papers.length,1);
 assert.match(viaDesk.provider,/IACR OAI-PMH/);

 const down=app(async()=>{throw Error("offline")},{"axiovo-eprint-verified-fallback-v1":
  JSON.stringify({stamp:"2026-11-06",papers:fixture.papers})});
 const cached=await down.api.load();
 assert.equal(cached.cache,true);
 assert.equal(cached.papers.length,1);
 const empty=app(async()=>({ok:true,json:async()=>({source:"eprint",papers:[]})}));
 await assert.rejects(()=>empty.api.load(),/Official-source snapshot unavailable/);
 console.log("PASS: independent ePrint verified fallback, cache and filtering");
})().catch(error=>{console.error(error);process.exitCode=1});
