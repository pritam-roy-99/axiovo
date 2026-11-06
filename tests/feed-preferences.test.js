"use strict";
const assert=require("node:assert/strict");
const p=require("../docs/feed-preferences.js");
const entries=new Map();
const store={
 getItem:key=>entries.has(key)?entries.get(key):null,
 setItem:(key,value)=>entries.set(key,String(value))
};
const put=(key,value)=>store.setItem(key,JSON.stringify(value));
assert.deepEqual(p.derive(store),{directTopics:[],topics:[],authors:[],paths:[]});
put("axiovo-field-explorer-v1",{topic:"Numerical relativity",subtopic:"Binary merger simulations"});
put("axiovo-topic-explorer-arxiv-v1",{last:{category:"gr-qc",topic:"numerical-relativity"}});
assert.deepEqual(p.derive(store),{directTopics:[],topics:[],authors:[],paths:[]},
 "Browsing any subject must not enroll it as a follow");
assert(p.updateTopic(store,"Numerical relativity",true));
assert(p.derive(store).topics.includes("Numerical relativity"),"An explicit follow remains available");
assert(p.updateTopic(store,"Numerical relativity",false));
put("axiovo-author-follows",["A.S. Majumdar"]);
put("axiovo-research-interest-settings-v1",{authors:["Archan S Majumdar"],interests:["preparation contextuality"]});
put("axiovo-topic-explorer-arxiv-v1",{followed:[
 {category:"quant-ph",topic:"quantum information",subtopic:"quantum dimension witnessing",
  label:"Quantum Physics / Quantum Information / Quantum dimension witnessing"}]});
put("axiovo-topic-explorer-biorxiv-v1",{followed:[
 {category:"neuroscience",topic:"single cell genomics",label:"Single cell genomics"}]});
put("axiovo-topic-explorer-chemrxiv-v1",{followed:[
 {category:"physical chemistry",topic:"molecular catalysts",label:"Molecular catalysts"}]});
put("axiovo-interests-by-field-v1",{quantum:{"contextuality":["Parity-oblivious exclusion"]}});
const derived=p.derive(store);
for(const term of ["quantum dimension witnessing","single cell genomics","molecular catalysts",
 "preparation contextuality","Parity-oblivious exclusion"]){
 assert(derived.topics.some(x=>x.toLowerCase()===term.toLowerCase()),"Missing followed topic "+term);
}
assert(derived.authors.includes("A.S. Majumdar"));
assert.equal(derived.paths.length,3);
assert(!derived.topics.includes("quantum information"),"A saved subtopic must not also follow its parent");
assert(p.updateTopic(store,"non-Markovianity",true));
assert(p.derive(store).topics.includes("non-Markovianity"));
assert(p.updateTopic(store,"non-Markovianity",false));
assert(!p.derive(store).topics.includes("non-Markovianity"));
assert(p.derive(store).topics.some(term=>term.toLowerCase()==="quantum dimension witnessing"),"Unfollowing manual topic must preserve Discover paths");
console.log("PASS: existing author follows, all three Discover paths, specialized field interests and reversible feed follows");
