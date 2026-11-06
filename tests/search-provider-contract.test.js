"use strict";
/* Source-provider contracts: canonical arXiv DOI, pagination and subject fidelity.
 * Synthetic DataCite fixtures test parsing, not live coverage or paper existence.
 */
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const storage=new Map(),requests=[];
const make=(id,{url,subjects=[],title="Synthetic source record",doi}={})=>({
 attributes:{
  doi:doi||"10.48550/arXiv."+id,
  url:url||"https://doi.org/10.48550/arXiv."+id,
  titles:[{title}],subjects,creators:[{name:"Researcher, A."}],
  descriptions:[{descriptionType:"Abstract",description:"Preparation contextuality and operational tests."}],
  dates:[{dateType:"Submitted",dateInformation:"v1",date:"2026-11-01"}]
 }
});
const first=make("2611.12001",{subjects:[{subjectScheme:"arXiv",subject:"Quantum Physics (quant-ph)"}]});
const second=make("2611.12002",{subjects:[{subjectScheme:"arXiv",subject:"quant-ph"}]});
const other=make("2611.12003",{subjects:[{subjectScheme:"arXiv",subject:"Computer Science (cs.CV)"}]});
const invalid=make("2611.12004",{doi:"10.48550/arXiv.2611.12004",url:"https://arxiv.org/abs/2611.12999"});
const root={
 URL,URLSearchParams,AbortSignal,Event,dispatchEvent(){},
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
 fetch:async url=>{
  const u=new URL(String(url));requests.push(u);
  assert.equal(u.hostname,"api.datacite.org");
  const cursor=u.searchParams.get("page[number]");
  const data=cursor==="2"?[second,other,invalid]:[first];
  return {ok:true,json:async()=>({
   data,meta:{total:4},links:{next:cursor==="2"?null:
    "https://api.datacite.org/dois?page%5Bnumber%5D=2"}
  })};
 }
};
root.window=root;vm.createContext(root);
for(const path of ["arxiv-versions.js","paper-sort.js","archive-data.js"])
 vm.runInContext(fs.readFileSync("docs/"+path,"utf8"),root);
const api=root.AxiovoArchiveData;
(async()=>{
 const query={q:"",sort:"recent"};
 const one=await api.live("arxiv",query);
 assert.equal(one.papers.length,1,"DOI resolver landing URL must not hide legitimate arXiv DOI");
 assert.equal(one.papers[0].recordId,"2611.12001");
 assert.deepEqual([...one.papers[0].categories],["quant-ph"]);
 assert.equal(one.papers[0].date,"2026-11-01");
 assert.equal(one.next,"2");
 const two=await api.live("arxiv",query,undefined,one.next);
 assert.equal(two.papers.length,2,"Reject contradictory arXiv URLs without losing valid records");
 assert.equal(two.next,null);
 assert.equal(two.papers[0].id,"2611.12002");
 assert.deepEqual([...two.papers[0].categories],["quant-ph"]);
 assert.deepEqual([...two.papers[1].categories],["cs.CV"]);
 const parsedCitation=api.normalize("arxiv",{id:"2611.12005",title:"Synthetic cited source",citations:"17"});
 const missingCitation=api.normalize("arxiv",{id:"2611.12006",title:"Synthetic unknown citation count",citations:""});
 assert.equal(parsedCitation.citations,17,"Numeric source counts should sort correctly");
 assert.equal(missingCitation.citations,null,"Missing citations must not be fabricated as zero");
 const category={code:"quant-ph",name:"Quantum Physics"};
 assert.equal(api.filter([...one.papers,...two.papers],{category}).length,2,
  "Both arXiv subject encoding variants must survive official category filtering");
 assert.equal(api.filter([...one.papers,...two.papers],{category:{code:"cs.CV",name:"Computer Vision"}}).length,1);
 assert.equal(requests[0].searchParams.get("page[number]"),"1");
 assert.equal(requests[0].searchParams.get("sort"),"-published");
 assert.equal(requests[1].searchParams.get("page[number]"),"2");
 await api.live("arxiv",{q:"prepare-and-measure",sort:"relevance"});
 assert.equal(requests.at(-1).searchParams.get("sort"),"relevance");
 await api.live("arxiv",{q:"",sort:"cited"});
 assert.equal(requests.at(-1).searchParams.get("sort"),"-citation-count");
 await api.live("arxiv",{q:"",sort:"oldest"});
 assert.equal(requests.at(-1).searchParams.get("sort"),"published");
 console.log("PASS: DataCite canonical arXiv ID, category codes, source-ranked pagination and requested sort modes");
})().catch(err=>{console.error(err);process.exitCode=1});
