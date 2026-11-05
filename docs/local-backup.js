/* Axiovo local-only data export and conservative import.
 * Explicit allowlist prevents third-party authentication/session tokens leaking into backups.
 * Existing keys are never renamed: old app versions remain compatible.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoLocalBackup=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const KEYS=[
  "researchlens-reading-list","researchlens-read","researchlens-hidden",
  "researchlens-followed-topics","researchlens-author-follows","researchlens-last-visit","axiovo-paper-feedback-v1",
  "researchlens-library-metadata-v1","researchlens-field-saved-v1",
  "researchlens-field-explorer-v1","researchlens-research-projects-v1","axiovo-paper-collections-v1",
  "researchlens-research-interest-settings-v1","researchlens-interests-by-field-v1",
  "researchlens-pdf-notes-v1","researchlens-comparisons-v1",
  "researchlens-local-profile","researchlens-theme","axiovo-palette-v1",
  "axiovo-custom-taxonomy-v1","axiovo-biorxiv-reading-v1","axiovo-biorxiv-notes-v1",
  "axiovo-onboarding-dismissed-v1","researchlens-alert-seen-v1"
 ];
 const MAX_FILE=5*1024*1024, MAX_ENTRY=2*1024*1024;
 const RAW=new Set(["researchlens-theme","axiovo-palette-v1","axiovo-onboarding-dismissed-v1","researchlens-last-visit"]);
 function checkRaw(key,value){
  if(typeof value!=="string"||value.length>MAX_ENTRY)throw Error("Invalid backup value for "+key);
  if(RAW.has(key))return true;
  const parsed=JSON.parse(value);
  if(parsed===null||typeof parsed!=="object")throw Error("Invalid structured data for "+key);
  if(Array.isArray(parsed))return true;
  if(Object.getPrototypeOf(parsed)!==Object.prototype)throw Error("Unsupported data for "+key);
  return true;
 }
 function create(storage){
  const data=Object.create(null);
  for(const key of KEYS){
   const raw=storage.getItem(key);
   if(raw===null)continue;
   try{checkRaw(key,raw);data[key]=raw}catch{/* Skip corrupt values rather than damaging backup */}
  }
  return {format:"axiovo-local-backup",version:1,exported_at:new Date().toISOString(),data};
 }
 function parse(input){
  if(typeof input!=="string"||input.length>MAX_FILE)throw Error("Backup file is too large or invalid");
  let payload;try{payload=JSON.parse(input)}catch{throw Error("Not a valid JSON backup")}
  if(!payload||payload.format!=="axiovo-local-backup"||payload.version!==1||
     !payload.data||typeof payload.data!=="object"||Array.isArray(payload.data))
     throw Error("Unsupported Axiovo backup format");
  const selected=Object.create(null);
  for(const key of KEYS){
   if(!Object.prototype.hasOwnProperty.call(payload.data,key))continue;
   checkRaw(key,payload.data[key]);
   selected[key]=payload.data[key];
  }
  return selected;
 }
 function restore(storage,input,{overwrite=false}={}){
  const data=typeof input==="string"?parse(input):parse(JSON.stringify(input));
  const changes=[],skipped=[];
  for(const key of KEYS){
   if(!Object.prototype.hasOwnProperty.call(data,key))continue;
   if(!overwrite&&storage.getItem(key)!==null){skipped.push(key);continue}
   changes.push([key,data[key]]);
  }
  // All-or-nothing: on quota or privacy-mode failure undo partial writes.
  const previous=changes.map(([key])=>[key,storage.getItem(key)]);
  try{for(const [key,value] of changes)storage.setItem(key,value)}
  catch(error){
   for(const [key,value] of previous){
    try{if(value===null)storage.removeItem(key);else storage.setItem(key,value)}catch{}
   }
   throw Error("Restore failed; previous local data was kept where browser storage permitted");
  }
  return {restored:changes.length,kept:skipped.length,available:Object.keys(data).length};
 }
 function mount(){
  const exportBtn=document.getElementById("axiovo-full-export");
  const importBtn=document.getElementById("axiovo-full-import");
  const file=document.getElementById("axiovo-full-file");
  const status=document.getElementById("axiovo-backup-status");
  if(!exportBtn||!importBtn||!file||!status)return;
  exportBtn.onclick=()=>{
   try{
    const payload=create(localStorage),content=JSON.stringify(payload,null,2);
    if(content.length>MAX_FILE)throw Error("Backup exceeds 5 MB. Export individual notes separately.");
    const url=URL.createObjectURL(new Blob([content],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="axiovo-device-backup.json";
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent="Exported "+Object.keys(payload.data).length+" local data sections. Keep this private file somewhere safe.";
   }catch(e){status.textContent=String(e.message||e)}
  };
  importBtn.onclick=()=>file.click();
  file.onchange=async()=>{
   try{
    const selected=file.files?.[0];if(!selected)return;
    if(selected.size>MAX_FILE)throw Error("Backup exceeds 5 MB");
    const content=await selected.text();
    const data=parse(content);
    if(!confirm("Restore "+Object.keys(data).length+" saved sections? Existing data on this device will be preserved, not overwritten."))return;
    const result=restore(localStorage,content);
    status.textContent="Restored "+result.restored+" missing sections; preserved "+result.kept+" existing sections. Reload Axiovo to view imported information.";
   }catch(e){status.textContent="Import unsuccessful: "+String(e.message||e)}
   finally{file.value=""}
  };
 }
 if(typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);
  else mount();
 }
 return {KEYS,create,parse,restore};
});