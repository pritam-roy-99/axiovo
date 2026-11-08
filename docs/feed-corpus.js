/* Shared Feed data operations for the worker and the browser fallback. */
(function(root){
"use strict";
const archive=root.AxiovoArchiveData,core=root.AxiovoFeedCore,follow=root.AxiovoAuthorFollow;
const withAuthor=prefs=>({...prefs,matchesAuthor:(a,b)=>
 Boolean(follow?.matchesName(a,b))||String(a).toLowerCase()===String(b).toLowerCase()});
root.AxiovoFeedCorpus=function(){
 let papers=[];
 function merge(rows){
  if(rows.length)papers=archive.merge(papers,rows);
  return papers.length;
 }
 return {
  merge,
  async preview(){
   const response=await fetch("./data/feed-preview.json",{signal:AbortSignal.timeout(4500)});
   if(!response.ok)return null;
   const data=await response.json();
   if(data.schema_version!==1||
      data.coverage!=="recent-preview-only-full-source-snapshots-load-afterward"||
      !Array.isArray(data.papers))return null;
   const preview=data.papers.map(p=>archive.normalize(p?.source,p)).filter(Boolean);
   if(!preview.length)return null;
   // Prefer full snapshot metadata if it has already arrived.
   papers=archive.merge(preview,papers);
   return papers.length;
  },
  async snapshot(source,force,fallback){
   const snap=await archive.snapshot(source,{force,cache:force?"no-store":"default",fallback});
   const count=merge(snap.papers);
   return {count,stamp:snap.stamp,offlineSubset:snap.offlineSubset,
    // Workers cannot write localStorage. Send back only the existing offline subset.
    eprint:source==="eprint"&&!snap.offlineSubset?{stamp:snap.stamp,papers:snap.papers.slice(0,180)}:null};
  },
  rank(prefs,now){return core.build(papers,withAuthor(prefs),now)},
  async search(source,criteria,prefs){
   const found=await archive.live(source,criteria);
   return core.build(found.papers,withAuthor({...prefs,references:[]})).map(item=>item.paper);
  },
  missingAuthors(prefs){
   const matching=withAuthor({...prefs,references:[]});
   const known=core.build(papers,matching);
   return prefs.authors.filter(name=>!known.some(item=>item.paper.authors?.some(author=>
    matching.matchesAuthor(name,author))));
  }
 };
};
})(typeof self!=="undefined"?self:window);
