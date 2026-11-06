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
const root={URL,URLSearchParams,AbortSignal,Event,dispatchEvent(){},localStorage:{getItem(){return null},setItem(){}},
 fetch:async url=>{
  assert.match(String(url),/api\.crossref\.org\/prefixes\/10\.26434\/works/);
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
 console.log("PASS: hyphenated and dotted ChemRxiv DOI ingestion excludes unrelated records");
})().catch(e=>{console.error(e);process.exitCode=1});
