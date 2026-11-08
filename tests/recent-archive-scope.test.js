"use strict";
// Regression for recent topic discovery across all four preprint archives.
// Run: node tests/recent-archive-scope.test.js
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const explorer=fs.readFileSync("docs/topic-explorer.js","utf8");
const crypto=fs.readFileSync("docs/crypto.js","utf8");
const archive=fs.readFileSync("docs/archive-data.js","utf8");
assert.match(explorer,/let viewMode=params\.get\("mode"\)==="indexed"\?"indexed":"recent"/);
assert.match(explorer,/recentOnly=\(source==="biorxiv"\|\|source==="chemrxiv"\)/);
assert.match(explorer,/Object\.assign\(c,recentWindow\(\),\{sort:c\.sort==="relevance"\?"recent":c\.sort,recentOnly:true\}\)/);
assert.match(explorer,/state\.recentOnly\?"No matching papers in the latest 7 days/);
assert.match(explorer,/viewMode=source==="arxiv"\?"indexed":"recent"/);
assert.match(explorer,/showLatestAnnouncement\(\)/);
assert.match(archive,/criteria\.recentOnly\|\|parseDOI\(criteria\.q\)/,
 "Recent bioRxiv search must favor the native posting-date API");
assert.match(crypto,/recentOnly=viewMode==="recent"/);
assert.match(crypto,/c\.from=daysBefore\(6\);c\.to=utcDay\(\)/);
assert.match(crypto,/viewMode="indexed"/);
assert.match(crypto,/firstPathNotification/,"Restoring a saved topic must retain an indexed-history deep link");
for(const file of ["arxiv","biorxiv","chemrxiv","crypto"]){
 const html=fs.readFileSync("docs/"+file+".html","utf8");
 assert.match(html,/recent-scope-v4/,"Archive cache version must be refreshed: "+file);
}
const storage=new Map();
const root={
 URL,URLSearchParams,AbortSignal,
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
 fetch(){throw Error("Network forbidden in regression fixture")}
};
root.window=root;vm.createContext(root);
for(const file of ["arxiv-versions.js","archive-data.js","eprint-source.js"]){
 vm.runInContext(fs.readFileSync("docs/"+file,"utf8"),root,{filename:file});
}
const make=(source,id,title,date,category)=>{
 const meta={title,abstract:"Laboratory research",authors:["A Scientist"],published:date,category,categories:category?[category]:[]};
 if(source==="arxiv")meta.id=id;
 else if(source==="eprint")meta.id=id;
 else meta.doi=id;
 return root.AxiovoArchiveData.normalize(source,meta);
};
const start="2026-11-03",end="2026-11-09";
const bio=[make("biorxiv","10.1101/2026.11.08.123456","Cell signaling", "2026-11-08","cell biology"),
 make("biorxiv","10.1101/2021.01.01.999999","Cell signaling", "2021-01-01","cell biology"),
 make("biorxiv","10.1101/2026.11.08.123457","Neural mapping", "2026-11-08","neuroscience")];
assert.deepEqual(Array.from(root.AxiovoArchiveData.filter(bio,
 {from:start,to:end,topicTerms:["Cell signaling"]}),p=>p.id),["10.1101/2026.11.08.123456"]);
const chem=[make("chemrxiv","10.26434/chemrxiv.2026a","Cluster catalysis", "2026-11-08","chemistry"),
 make("chemrxiv","10.26434/chemrxiv.2020a","Cluster catalysis", "2020-11-08","chemistry")];
assert.equal(root.AxiovoArchiveData.filter(chem,{from:start,to:end,topicTerms:["Cluster catalysis"]}).length,1);
const cryptoList=[make("eprint","2026/321","Lattice signatures","2026-11-08"),
 make("eprint","2023/245","Lattice signatures","2023-09-01"),
 make("eprint","2026/322","Secure computation","2026-11-08")];
const eprint=root.AxiovoEprintSource.filter(cryptoList,
 {from:start,to:end,topicAnyTerms:["lattice"],sort:"recent"});
assert.deepEqual(Array.from(eprint,p=>p.id),["2026/321"]);
assert.equal(root.AxiovoEprintSource.filter(cryptoList,
 {from:start,to:end,topicAnyTerms:["nonexistent topic"]}).length,0);
console.log("PASS: archive-specific seven-day date bounds, topic scope and no historical fallback");
