"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const records=[
 {DOI:"10.26434/chemrxiv-2024-hsvp",title:["Synthetic relevant chemistry work"],
  author:[{given:"A",family:"Scientist"}],subject:["Catalysis"],abstract:"Chemical reaction catalysis"},
 {DOI:"10.26434/chemrxiv.987654",title:["Synthetic archived chemistry work"],
  author:[{given:"B",family:"Scientist"}]},
 {DOI:"10.26434/other-nonchemrxiv",title:["Non-ChemRxiv work"]},
 {DOI:"10.99999/chemrxiv-2024-invalid",title:["Different DOI prefix"]}
];
const requests=[];
const root={URL,URLSearchParams,AbortSignal,Event,dispatchEvent(){},localStorage:{getItem(){return null},setItem(){}},
 fetch:async url=>{
  assert.match(String(url),/api\.crossref\.org\/prefixes\/10\.26434\/works/);
  requests.push(new URL(String(url)).searchParams);
  return {ok:true,json:async()=>({message:{items:records,"total-results":records.length}})};
 }};
root.window=root;vm.createContext(root);
for(const file of ["arxiv-versions.js","paper-sort.js","archive-data.js"])
 vm.runInContext(fs.readFileSync("docs/"+file,"utf8"),root);
const data=root.AxiovoArchiveData;
(async()=>{
 assert(data.normalize("chemrxiv",{doi:"10.26434/chemrxiv-2024-hsvp",title:"Valid"}));
 assert(!data.normalize("chemrxiv",{doi:"10.26434/other-nonchemrxiv",title:"Invalid"}));
 const result=await data.live("chemrxiv",{q:"",sort:"recent"});
 assert.equal(result.papers.length,2,"Both legitimate ChemRxiv DOI formats must survive ingestion");
 assert(result.papers.some(p=>p.id==="10.26434/chemrxiv-2024-hsvp"));
 assert(result.papers.some(p=>p.id==="10.26434/chemrxiv.987654"));
 assert(!result.papers.some(p=>p.id.includes("other-nonchemrxiv")));
 const first=data.normalize("chemrxiv",{doi:"10.26434/chemrxiv-2026-fixture",title:"Base record"});
 const v3=data.normalize("chemrxiv",{doi:first.doi+"-v3",title:"Older revision",abstract:"Older text"});
 const v4=data.normalize("chemrxiv",{doi:first.doi+"-v4",title:"Newer revision"});
 const revisions=data.merge([v4,v3,first]);
 assert.equal(revisions.length,1,"A ChemRxiv work must appear once in a browse result");
 assert.equal(revisions[0].url,"https://doi.org/"+v4.doi,"Keep the exact DOI of the selected revision");
 assert.equal(revisions[0].abstract,"","Do not borrow abstract text from a different revision");
 assert.equal(data.filter([v3,v4],{q:v3.doi})[0].recordId,v3.doi);
 await data.live("chemrxiv",{q:"catalysis",sort:"oldest"});
 assert.equal(requests.at(-1).get("sort"),"published");
 assert.equal(requests.at(-1).get("order"),"asc");
 await data.live("chemrxiv",{q:"catalysis",sort:"cited"});
 assert.equal(requests.at(-1).get("sort"),"is-referenced-by-count");
 assert.equal(requests.at(-1).get("order"),"desc");
 console.log("PASS: hyphenated and dotted ChemRxiv DOI ingestion excludes unrelated records");
})().catch(e=>{console.error(e);process.exitCode=1});
