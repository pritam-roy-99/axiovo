/* Axiovo My Feed off-main-thread ranking.
 * Imports the SAME production ranking and author name-matching functions.
 * Metadata never leaves the device; only records already retrieved from
 * official snapshots are processed. No query truncation or paper cutoff.
 */
"use strict";
self.window=self;
importScripts("./feed-core.js","./author-follow.js");
let papers=[],generation=-1;
self.onmessage=event=>{
 const message=event.data||{};
 if(message.type!=="rank")return;
 try{
  if(Array.isArray(message.papers)){
   papers=message.papers;
   generation=message.generation;
  }else if(message.generation!==generation){
   throw Error("Feed worker paper generation is out of date");
  }
  const prefs=message.prefs||{};
  const author= self.AxiovoAuthorFollow;
  const withAuthor={...prefs,matchesAuthor:(a,b)=>
    Boolean(author?.matchesName(a,b))||
    String(a).toLowerCase()===String(b).toLowerCase()};
  const items=self.AxiovoFeedCore.build(papers,withAuthor,message.now);
  self.postMessage({type:"result",id:message.id,generation,items});
 }catch(error){
  self.postMessage({type:"error",id:message.id,generation,
   message:String(error?.message||error)});
 }
};
