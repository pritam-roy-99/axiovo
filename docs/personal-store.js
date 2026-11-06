/* Opt-in mirror: migration never removes or modifies legacy localStorage keys. */
(function(root,factory){
 const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoPersonalStore=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 const DB_NAME="axiovo-personal-v2",STORE="snapshots",VERSION=1;
 function available(){return !!(root&&root.indexedDB)}
 function open(){
  if(!available())return Promise.reject(Error("IndexedDB unavailable"));
  return new Promise((resolve,reject)=>{
   const req=root.indexedDB.open(DB_NAME,VERSION);
   req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"key"})};
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error("IndexedDB failed"));
  });
 }
 async function snapshot(storage,keys){
  const values=[];
  for(const key of keys){
   const raw=storage.getItem(key);
   if(raw!==null)values.push({key,raw});
  }
  return values;
 }
 async function mirror(storage,keys){
  const entries=await snapshot(storage,keys);
  let db;
  try{
   db=await open();
   await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite"),out=tx.objectStore(STORE);
    for(const x of entries)out.put({...x,mirrored_at:new Date().toISOString()});
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error("Migration failed"));
    tx.onabort=()=>reject(tx.error||Error("Migration aborted"));
   });
   return {mode:"indexeddb-mirror",copied:entries.length,legacyRetained:true};
  }catch(error){
   return {mode:"localstorage-fallback",copied:0,legacyRetained:true,error:String(error.message||error)};
  }finally{db?.close()}
 }
 async function get(key,{storage}={}){
  const legacy=storage||root?.localStorage;
  if(legacy){
   try{const old=legacy.getItem(key);if(old!==null)return old}catch{}
  }
  let db;
  try{
   db=await open();
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readonly");
    const req=tx.objectStore(STORE).get(key);
    req.onsuccess=()=>resolve(req.result?.raw??null);
    req.onerror=()=>reject(req.error);
   });
  }catch{return null}finally{db?.close()}
 }
 return Object.freeze({available,snapshot,mirror,get,DB_NAME});
});