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
 return {api:window.AxiovoEprintSource,store};
}
(async()=>{
 let calls=0;
 const good=app(async()=>{calls++;if(calls===1)throw Error("local host temporarily unavailable");
  return {ok:true,json:async()=>fixture}});
 const result=await good.api.load();
 assert.equal(calls,2);
 assert.equal(result.papers.length,1);
 assert.equal(result.papers[0].url,"https://eprint.iacr.org/2026/1234");
 assert.equal(good.api.filter(result.papers,{q:"2026/1234"}).length,1);
 assert.equal(good.api.filter(result.papers,{q:"https://eprint.iacr.org/2026/1234"}).length,1);
 assert.equal(good.api.filter(result.papers,{q:"eprint:2026/1234"}).length,1);
 assert.equal(good.api.filter(result.papers,{q:"2026/1235"}).length,0);

 assert.equal(good.api.filter(result.papers,{topicTerms:["quantum key distribution"]}).length,1);
 const down=app(async()=>{throw Error("offline")},{"axiovo-eprint-verified-fallback-v1":
  JSON.stringify({stamp:"2026-11-06",papers:fixture.papers})});
 const cached=await down.api.load();
 assert.equal(cached.cache,true);
 assert.equal(cached.papers.length,1);
 const empty=app(async()=>({ok:true,json:async()=>({source:"eprint",papers:[]})}));
 await assert.rejects(()=>empty.api.load(),/Official-source snapshot unavailable/);
 console.log("PASS: independent ePrint verified fallback, cache and filtering");
})().catch(error=>{console.error(error);process.exitCode=1});
