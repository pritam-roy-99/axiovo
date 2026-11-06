"use strict";
const assert=require("node:assert/strict");
const Sort=require("../docs/paper-sort.js");
const papers=[
 {source:"arxiv",id:"b",title:"Paper B",date:"2026-10-03",citations:5},
 {source:"arxiv",id:"a",title:"Paper A",date:"2026-10-01",citations:null},
 {source:"arxiv",id:"d",title:"Paper D",date:"2026-10-04",citations:15},
 {source:"biorxiv",id:"c",title:"Paper C",date:"",citations:undefined}
];
const ids=(records)=>records.map(x=>x.id);
assert.deepEqual(ids(Sort.sort(papers,"recent")),["d","b","a","c"],"Newest known dates first; undated last");
assert.deepEqual(ids(Sort.sort(papers,"oldest")),["a","b","d","c"],"Oldest dates first; undated last");
assert.deepEqual(ids(Sort.sort(papers,"cited")),["d","b","a","c"],"Known citations descending; missing counts last");
assert.deepEqual(ids(Sort.sort(papers,"relevance",p=>({a:10,b:5,c:0,d:4}[p.id]))),["a","b","d","c"]);
assert.deepEqual(ids(Sort.sort([papers[2],papers[0],papers[1]],"cited")),["d","b","a"]);
assert(Sort.note(papers,"cited").includes("2 of 4"));
assert(Sort.note(papers.slice(1,2),"cited").includes("unavailable"));
const source=[...papers];Sort.sort(papers,"recent");assert.deepEqual(papers,source,"Sorting may not mutate cached data");
const ranked=papers.map((paper,i)=>({paper,score:i*2}));
assert.equal(Sort.sort(ranked,"relevance",x=>x.score)[0].paper.id,"c");
assert.equal(Sort.sort(ranked,"recent")[0].paper.id,"d");
console.log("PASS: cross-archive newest/oldest/cited/relevance and missing metadata ordering");
