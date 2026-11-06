/* Shared deterministic paper ordering: never turn absent citation data into zero citations. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoPaperSort=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const MODES=["relevance","recent","oldest","cited","title"];
 function when(p){
  p=p?.paper||p;
  const v=p?.announcementDate||p?.announcement_date||p?.published||p?.date||p?.created||"";
  const t=Date.parse(v);return Number.isFinite(t)?t:null;
 }
 function cited(p){p=p?.paper||p;const c=p?.citations;return typeof c==="number"&&Number.isFinite(c)&&c>=0?c:null}
 function sort(items,mode="relevance",score=()=>0){
  if(!MODES.includes(mode))mode="relevance";
  const records=[...(items||[])];
  if(mode==="title")return records.sort((a,b)=>String((a?.paper||a)?.title||"").localeCompare(String((b?.paper||b)?.title||"")));
  return records.sort((a,b)=>{
   if(mode==="cited"){
    const x=cited(a),y=cited(b);
    if(x!==null||y!==null){
     if(x===null)return 1;if(y===null)return -1;
     if(x!==y)return y-x;
    }
   }
   if(mode==="recent"||mode==="oldest"||mode==="cited"){
    const x=when(a),y=when(b);
    if(x!==null||y!==null){
     if(x===null)return 1;if(y===null)return -1;
     if(x!==y)return mode==="oldest"?x-y:y-x;
    }
   }
   if(mode==="relevance"){
    const x=Number(score(a))||0,y=Number(score(b))||0;
    if(y!==x)return y-x;
    const dx=when(a),dy=when(b);
    if(dx!==null&&dy!==null&&dx!==dy)return dy-dx;
   }
   return String((a?.paper||a)?.source||"").localeCompare(String((b?.paper||b)?.source||""))||
     String((a?.paper||a)?.id||(a?.paper||a)?.recordId||"").localeCompare(String((b?.paper||b)?.id||(b?.paper||b)?.recordId||""))||
     String((a?.paper||a)?.title||"").localeCompare(String((b?.paper||b)?.title||""));
  });
 }
 function note(items,mode){
  if(mode!=="cited")return "";
  const known=(items||[]).filter(p=>cited(p)!==null).length;
  return known?known+" of "+items.length+" papers have citation counts. Missing counts appear last.":
   "Citation counts unavailable for these records; showing newest available records first.";
 }
 return {MODES,when,cited,sort,note};
});
