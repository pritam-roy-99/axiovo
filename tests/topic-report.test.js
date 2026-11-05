"use strict";
const assert=require("node:assert/strict");
const {KEY,all,record,issue}=require("../docs/topic-report.js");
const cache=new Map(),storage={
 getItem:key=>cache.get(key)||null,
 setItem:(key,value)=>cache.set(key,value)
};
assert.equal(all(storage).length,0);
const paper={source:"arxiv",recordId:"2611.00001v2",
 title:"Official source title",url:"https://arxiv.org/abs/2611.00001v2"};
const report=record(storage,paper,"Mathematical Physics > Information", "Topological phases");
assert(report&&report.status==="saved-on-device-not-submitted");
assert.equal(all(storage).length,1);
assert.equal(JSON.parse(cache.get(KEY))[0].id,"2611.00001v2");
assert.equal(all(storage)[0].proposed_topic,"Topological phases");
assert.equal(all(storage)[0].selected_path,"Mathematical Physics > Information");
assert.equal(record(storage,paper,"Mathematical Physics > Information","Correction").proposed_topic,"Correction");
assert.equal(all(storage).length,1,"A repeated report for same paper/path replaces previous local report");
assert.equal(record(storage,{...paper,source:"fake"},"",""),false);
const url=new URL(issue(all(storage)[0]));
assert.equal(url.origin,"https://github.com");
assert.equal(url.pathname,"/pritam-roy-99/axiovo/issues/new");
assert.match(url.searchParams.get("body"),/2611\.00001v2/);
assert.match(url.searchParams.get("body"),/Correction/);
assert(!all(storage)[0].submitted_at,"Local report must not falsely claim submission");
console.log("Topic feedback: local queue, deduplication, source identity and explicit GitHub submission passed.");
