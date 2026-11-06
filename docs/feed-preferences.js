/* Shared feed preferences. Reads existing Axiovo keys without migration/deletion. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoFeedPreferences=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const TOPICS="axiovo-followed-topics",AUTHORS="axiovo-author-follows";
 function read(storage,key,fallback){
  try{return JSON.parse(storage.getItem(key)||"null")??fallback}catch{return fallback}
 }
 function unique(items,limit=70){
  const seen=new Set(),output=[];
  for(const v of items||[]){
   const text=String(v||"").trim().replace(/\s+/g," ").slice(0,120);
   if(!text||seen.has(text.toLowerCase()))continue;
   seen.add(text.toLowerCase());output.push(text);
   if(output.length>=limit)break;
  }return output;
 }
 function derive(storage){
  const settings=read(storage,"axiovo-research-interest-settings-v1",{});
  const field=read(storage,"axiovo-field-explorer-v1",{});
  const specialized=read(storage,"axiovo-interests-by-field-v1",{});
  const manual=read(storage,TOPICS,[]);
  const topics=[...(Array.isArray(manual)?manual:[]),...(Array.isArray(settings?.interests)?settings.interests:[])];
  // The archive Discover pages store followed paths per archive, not under
  // axiovo-followed-topics. Respect all three without copying the keys.
  const paths=[];
  for(const source of ["arxiv","biorxiv","chemrxiv"]){
   const saved=read(storage,"axiovo-topic-explorer-"+source+"-v1",{});
   for(const row of (Array.isArray(saved?.followed)?saved.followed:[])){
    if(!row||typeof row!=="object")continue;
    const terms=unique([row.refine,row.subtopic,row.topic,row.label].filter(Boolean),4);
    if(terms.length){
     topics.push(...terms.slice(0,3));
     paths.push({source,category:row.category||"",topic:row.topic||"",subtopic:row.subtopic||"",terms});
    }
   }
  }
  if(typeof field.topic==="string")topics.push(field.topic);
  if(typeof field.subtopic==="string")topics.push(field.subtopic);
  for(const group of Object.values(specialized||{})){
   if(!group||typeof group!=="object")continue;
   for(const entries of Object.values(group)){
    if(Array.isArray(entries))topics.push(...entries.filter(x=>typeof x==="string"));
   }
  }
  return {topics:unique(topics),authors:unique([
   ...(Array.isArray(read(storage,AUTHORS,[]))?read(storage,AUTHORS,[]):[]),...(Array.isArray(settings?.authors)?settings.authors:[])
  ],60),paths};
 }
 function updateTopic(storage,topic,following){
  const text=String(topic||"").trim().replace(/\s+/g," ").slice(0,120);
  if(text.length<3)return false;
  const raw=read(storage,TOPICS,[]),items=unique(Array.isArray(raw)?raw:[]),previous=items.some(x=>x.toLowerCase()===text.toLowerCase());
  if(previous===following)return true;
  const next=following?[...items,text].slice(-80):items.filter(x=>x.toLowerCase()!==text.toLowerCase());
  try{storage.setItem(TOPICS,JSON.stringify(next));return true}catch{return false}
 }
 return {TOPICS,AUTHORS,read,unique,derive,updateTopic};
});
