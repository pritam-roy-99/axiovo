"use strict";
/* Regression: selecting the latest release must not turn a topic search into
 * an all-archive search, and date-only links must preserve saved paths.
 * Run with: node tests/latest-topic-scope.test.js
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const explorer=fs.readFileSync("docs/topic-explorer.js","utf8");
assert.match(explorer,/hasPathOverride=.*\["category","topic","subtopic","refine"\]/);
assert.match(explorer,/pathFrom\(hasPathOverride\?Object\.fromEntries\(params\):stored\?\.last\)/);
const release=explorer.slice(explorer.indexOf("async function showLatestAnnouncement"),explorer.indexOf("async function runSearch"));
assert.ok(release.includes("const c=criteriaFromForm()"));
assert.ok(release.includes("syncAnnouncementURL(c)"));
assert.ok(!release.includes("selected=pathFrom({})"),"Release must not reset the chosen field");
assert.ok(!release.includes('$("query").value=""'),"Release must not clear the keyword");
assert.ok(!release.includes('$("author").value=""'),"Release must not clear author filtering");
assert.match(explorer,/function shouldBrowseAnnouncements\(\)/,"Scoped announcement routing must exist");
assert.doesNotMatch(explorer,/else if\(shouldBrowseAnnouncements\(\)\)showLatestAnnouncement\(\)/,
 "Ordinary topic searches must not switch silently to the announcement batch");
assert.match(explorer,/if\(source==="arxiv"\)\{\s*if\(params\.get\("announced"\)==="latest"/,
 "Announcement mode must require an explicit URL parameter");
assert.match(explorer,/let viewMode=params\.get\("mode"\)==="recent"\?"recent":"indexed"/,
 "All four archives must default to the indexed relevance mode");
assert.match(explorer,/indexed search across available years/,"Result count must disclose historical scope");


const context={URL,URLSearchParams,AbortSignal,window:null,localStorage:{
 getItem(){return null},setItem(){}},fetch(){throw Error("No network in filter test")}};
context.window=context;
vm.createContext(context);
for(const file of ["arxiv-versions.js","archive-data.js"])
 vm.runInContext(fs.readFileSync("docs/"+file,"utf8"),context);
const api=context.AxiovoArchiveData;
const papers=[
 api.normalize("arxiv",{id:"2611.00001",title:"Cluster catalysis with metallic nanoparticles",
  abstract:"Catalysis in atomic and molecular clusters",categories:["physics.atm-clus"],
  announcement_date:"2026-11-06"}),
 api.normalize("arxiv",{id:"2611.00002",title:"Semigroups of matrices with dense orbits",
  abstract:"Mathematical results",categories:["math"],announcement_date:"2026-11-06"}),
 api.normalize("arxiv",{id:"2611.00003",title:"Quantum key distribution under noise",
  abstract:"Quantum cryptography",categories:["quant-ph"],announcement_date:"2026-11-06"})
];
const scoped=api.filter(papers,{q:"",category:{code:"physics.atm-clus",name:"Atomic and Molecular Clusters"},
 topicTerms:["Cluster catalysis"],sort:"recent"});
assert.deepEqual(Array.from(scoped,p=>p.id),["2611.00001"]);
const unrelated=api.filter(papers,{q:"",category:{code:"quant-ph",name:"Quantum Physics"},
 topicTerms:["Cluster catalysis"],sort:"recent"});
assert.equal(unrelated.length,0,"No matching topic must not fall back to all arXiv");
assert.equal(papers[0].date,"","Announcement date must not be confused with v1 date");
console.log("PASS: latest-release hierarchy and source-date scope");
