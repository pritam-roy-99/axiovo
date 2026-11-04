/* Per-device researcher-owned topic hierarchy.
 * Built-in suggestions can be hidden and restored, not deleted for other users.
 * Storage keys and the immutable main-field identifiers stay unchanged.
 */
(function(root,factory){
 const api=factory(typeof module==="object"&&module.exports?require("./research-fields.js"):root?.ResearchLensFields);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.ResearchLensCustomTaxonomy=api;
})(typeof window!=="undefined"?window:null,function(Fields){
 "use strict";
 const KEY="axiovo-custom-taxonomy-v1";
 const defaults={};
 if(!Fields)return {};
 for(const [field,definition] of Object.entries(Fields.FIELDS)){
  defaults[field]={
   areas:definition.topics.slice(),
   interests:Object.fromEntries(definition.topics.map(area=>[area,Fields.fieldTopics(field,area).slice()]))
  };
 }
 const empty=()=>({addedAreas:{},hiddenAreas:{},addedInterests:{},hiddenInterests:{}});
 const clean=v=>String(v||"").trim().replace(/\s+/g," ").slice(0,100);
 const same=(a,b)=>a.toLocaleLowerCase()===b.toLocaleLowerCase();
 const list=v=>Array.isArray(v)?v.filter(x=>typeof x==="string").map(clean).filter(Boolean).slice(0,150):[];
 function normalize(raw){
  const source=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
  const state=empty();
  for(const field of Object.keys(defaults)){
   state.addedAreas[field]=list(source.addedAreas?.[field]).slice(0,40);
   state.hiddenAreas[field]=list(source.hiddenAreas?.[field]);
   state.addedInterests[field]={};state.hiddenInterests[field]={};
   const areas=[...defaults[field].areas,...state.addedAreas[field]];
   for(const area of areas){
    state.addedInterests[field][area]=list(source.addedInterests?.[field]?.[area]).slice(0,50);
    state.hiddenInterests[field][area]=list(source.hiddenInterests?.[field]?.[area]);
   }
  }
  return state;
 }
 let data=normalize();
 function apply(){
  for(const [field,base] of Object.entries(defaults)){
   const a=Fields.FIELDS[field].topics;
   const all=[...base.areas,...data.addedAreas[field]];
   const unique=all.filter((name,i)=>all.findIndex(x=>same(x,name))===i);
   const visible=unique.filter(x=>!data.hiddenAreas[field].some(y=>same(y,x)));
   a.splice(0,a.length,...(visible.length?visible:[base.areas[0]]));
   if(!Fields.SUBTOPICS[field])Fields.SUBTOPICS[field]={};
   for(const area of unique){
    const original=base.interests[area]||[];
    const added=data.addedInterests[field]?.[area]||[];
    const hidden=data.hiddenInterests[field]?.[area]||[];
    Fields.SUBTOPICS[field][area]=[...original,...added].filter((v,i,all)=>
      all.findIndex(x=>same(x,v))===i&&!hidden.some(x=>same(x,v)));
   }
  }
 }
 function read(storage){
  try{return normalize(JSON.parse(storage.getItem(KEY)||"null"))}catch{return normalize()}
 }
 function load(storage){
  data=read(storage);
  apply();
  return snapshot();
 }
 function snapshot(){return JSON.parse(JSON.stringify(data))}
 function save(storage){apply();try{storage?.setItem(KEY,JSON.stringify(data));return true}catch{return false}}
 function validField(field){return Object.hasOwn(defaults,field)}
 function canonicalArea(field,name){
  return [...defaults[field].areas,...data.addedAreas[field]].find(x=>same(x,clean(name)));
 }
 function addArea(field,name,storage){
  const n=clean(name);
  if(!validField(field)||n.length<3)return {ok:false,reason:"Enter at least three characters"};
  const existing=canonicalArea(field,n);
  if(existing){
   data.hiddenAreas[field]=data.hiddenAreas[field].filter(x=>!same(x,existing));
   save(storage);
   return {ok:true,value:existing,restored:true};
  }
  if(data.addedAreas[field].length>=40)return {ok:false,reason:"40 custom areas per main field is the limit"};
  data.addedAreas[field].push(n);
  data.addedInterests[field][n]=[];data.hiddenInterests[field][n]=[];
  save(storage);return {ok:true,value:n};
 }
 function removeArea(field,name,storage){
  if(!validField(field))return false;
  const area=canonicalArea(field,name);
  if(!area||!Fields.FIELDS[field].topics.some(x=>same(x,area))||Fields.FIELDS[field].topics.length<=1)return false;
  if(data.addedAreas[field].some(x=>same(x,area))){
   data.addedAreas[field]=data.addedAreas[field].filter(x=>!same(x,area));
   delete data.addedInterests[field][area];delete data.hiddenInterests[field][area];
  }else if(!data.hiddenAreas[field].some(x=>same(x,area)))data.hiddenAreas[field].push(area);
  save(storage);return true;
 }
 function addInterest(field,area,name,storage){
  if(!validField(field))return {ok:false,reason:"Choose a main field"};
  const parent=canonicalArea(field,area),n=clean(name);
  if(!parent||!Fields.FIELDS[field].topics.includes(parent))return {ok:false,reason:"Choose a visible research area"};
  if(n.length<3)return {ok:false,reason:"Enter at least three characters"};
  const added=data.addedInterests[field][parent] ||= [];
  const hidden=data.hiddenInterests[field][parent] ||= [];
  const original=defaults[field].interests[parent]||[];
  const existing=[...original,...added].find(x=>same(x,n));
  if(existing){
   data.hiddenInterests[field][parent]=hidden.filter(x=>!same(x,existing));
   save(storage);return {ok:true,value:existing,restored:true};
  }
  if(added.length>=50)return {ok:false,reason:"50 custom interests per area is the limit"};
  added.push(n);save(storage);return {ok:true,value:n};
 }
 function removeInterest(field,area,name,storage){
  if(!validField(field))return false;
  const parent=canonicalArea(field,area);
  if(!parent)return false;
  const built=defaults[field].interests[parent]||[];
  const added=data.addedInterests[field][parent]||[];
  const existing=[...built,...added].find(x=>same(x,clean(name)));
  if(!existing)return false;
  if(added.some(x=>same(x,existing)))data.addedInterests[field][parent]=added.filter(x=>!same(x,existing));
  else if(!data.hiddenInterests[field][parent].some(x=>same(x,existing)))
   data.hiddenInterests[field][parent].push(existing);
  save(storage);return true;
 }
 function restore(field,storage){
  if(!validField(field))return false;
  data.addedAreas[field]=[];data.hiddenAreas[field]=[];
  data.addedInterests[field]={};data.hiddenInterests[field]={};
  for(const area of defaults[field].areas){data.addedInterests[field][area]=[];data.hiddenInterests[field][area]=[]}
  save(storage);return true;
 }
 if(typeof window!=="undefined"){
  load(window.localStorage);
  window.addEventListener("storage",e=>{
   if(e.key===KEY){load(window.localStorage);window.dispatchEvent(new Event("axiovo:taxonomy-changed"))}
  });
 }else apply();
 return {KEY,clean,load,snapshot,addArea,removeArea,addInterest,removeInterest,restore};
});
