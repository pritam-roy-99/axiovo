/* Fetch, normalize, merge and rank complete source snapshots off the UI thread. */
"use strict";
self.window=self;
importScripts("./arxiv-versions.js","./archive-data.js?v=20261107-history-v2","./eprint-source.js?v=20261108-mobile-feed-v2",
 "./feed-core.js","./author-follow.js","./feed-corpus.js");
const corpus=self.AxiovoFeedCorpus();
self.onmessage=async event=>{
 const {id,method,args}=event.data;
 try{
  const value=await corpus[method](...args);
  self.postMessage({id,value});
 }catch(error){
  self.postMessage({id,error:String(error?.message||error)});
 }
};
