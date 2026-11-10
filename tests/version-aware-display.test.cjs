// Regression tests for v1-first display, independent of archive synchronization.
// Run: node tests/version-aware-display.test.cjs
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const events=[];
const root={URL,URLSearchParams,AbortSignal,Event:class{constructor(type){this.type=type}},dispatchEvent:e=>events.push(e),addEventListener(){},AxiovoArxiv:{parse(v){const m=String(v).match(/(\d{4}\.\d{4,5})(?:v(\d+))?/);return m?{base:m[1],version:m[2]?Number(m[2]):null,requested:m[0]}:null},abs:v=>"https://arxiv.org/abs/"+v,pdf:v=>"https://arxiv.org/pdf/"+v}};
root.window=root;
root.localStorage={getItem(){return null},setItem(){}};

vm.runInNewContext(fs.readFileSync("docs/archive-data.js","utf8"),root);
const api=root.AxiovoArchiveData;
const original={source:"arxiv",id:"2601.00001",recordId:"2601.00001v1",version:1,date:"2026-01-01"};
const revised={...original,recordId:"2601.00001v2",version:2,date:"2026-01-10"};
const unknown={...original,recordId:"2601.00002",version:null};
assert.equal(api.versionStatus(original),"original");
assert.equal(api.versionStatus(revised),"revised");
assert.equal(api.versionStatus(unknown),"unknown");
assert.equal(api.versionStatus({...unknown,version:""}),"unknown");
assert.deepEqual(Array.from(api.firstSubmissionsFirst([revised,unknown,original]),x=>x.recordId),[original.recordId,unknown.recordId,revised.recordId]);
assert.equal(api.versionStatus({source:"eprint",version:null}),"unknown");
assert.equal(api.versionStatus({source:"chemrxiv",version:null}),"unknown");
assert.equal(api.versionStatus({source:"biorxiv",version:1}),"original");
assert.equal(api.versionStatus({source:"biorxiv",version:3}),"revised");
console.log("Version-aware presentation regression tests passed.");
