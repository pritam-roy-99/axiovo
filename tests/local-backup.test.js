"use strict";
const assert=require("node:assert/strict");
const Backup=require("../docs/local-backup.js");
const makeStorage=(init={})=>{
 const data=new Map(Object.entries(init));
 return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>{data.set(k,v)},removeItem:k=>data.delete(k),values:data};
};
const original=makeStorage({
 "researchlens-reading-list":'["2608.13942v1"]',
 "researchlens-library-metadata-v1":'{"arxiv:2608.13942":{"note":"private research note"}}',
 "researchlens-research-projects-v1":'{"projects":[]}',
 "axiovo-biorxiv-reading-v1":'[]',
 "researchlens-theme":"dark",
 "third-party-session-token":"private-auth-credential"
});
const payload=Backup.create(original);
assert.equal(payload.version,1);
assert.equal(payload.format,"axiovo-local-backup");
assert.deepEqual(Backup.parse(JSON.stringify(payload))["researchlens-reading-list"],'["2608.13942v1"]');
assert.ok(!Object.hasOwn(payload.data,"third-party-session-token"),"Never export arbitrary tokens");
const existing=makeStorage({"researchlens-reading-list":'["my-existing-paper"]'});
const result=Backup.restore(existing,JSON.stringify(payload));
assert.equal(result.kept,1);
assert.equal(existing.getItem("researchlens-reading-list"),'["my-existing-paper"]',"No accidental overwrites");
assert.equal(existing.getItem("researchlens-library-metadata-v1"),original.getItem("researchlens-library-metadata-v1"));
assert.equal(existing.getItem("researchlens-theme"),"dark");
assert.throws(()=>Backup.parse('{"format":"other","version":1,"data":{}}'),/Unsupported/);
assert.throws(()=>Backup.parse('{"format":"axiovo-local-backup","version":1,"data":{"researchlens-reading-list":"broken"}}'),/Unexpected token|Invalid/);
const injected={...payload,data:{"third-party-session-token":"stolen","researchlens-reading-list":'["clean"]'}};
const dest=makeStorage();
Backup.restore(dest,JSON.stringify(injected));
assert.equal(dest.getItem("third-party-session-token"),null);
assert.equal(dest.getItem("researchlens-reading-list"),'["clean"]');
const interrupted=makeStorage({"researchlens-reading-list":'["prior"]'});
let fail=true;
const f={
 getItem:key=>interrupted.getItem(key),
 setItem:(key,value)=>{if(key==="researchlens-theme"&&fail){fail=false;throw Error("Quota")}interrupted.setItem(key,value)},
 removeItem:key=>interrupted.removeItem(key)
};
assert.throws(()=>Backup.restore(f,JSON.stringify(payload),{overwrite:true}),/Restore failed/);
assert.equal(interrupted.getItem("researchlens-reading-list"),'["prior"]',"Rollback existing data after partial write");
console.log("Axiovo local backup tests passed");
