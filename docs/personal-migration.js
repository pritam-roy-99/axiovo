/* Migration plan requires explicit approval; first create a read-only inventory. */
(function(root,factory){
 const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoPersonalMigration=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 function inventory(storage,allowlist){
  return (allowlist||[]).map(key=>{
   let value=null;
   try{value=storage.getItem(key)}catch{}
   return {key,present:value!==null,length:value===null?0:value.length};
  });
 }
 function optInMirror(storage,allowlist,{approved=false,store}={}){
  if(!approved)throw Error("Explicit migration approval required");
  const impl=store||root?.AxiovoPersonalStore;
  if(!impl)throw Error("Personal storage facade unavailable");
  return impl.mirror(storage,allowlist);
 }
 return Object.freeze({inventory,optInMirror});
});