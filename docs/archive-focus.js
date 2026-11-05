/* Preserve independent researcher focus for each preprint archive.
 * This runs before focus-bar.js and initializes its legacy shared state.
 */
(function(){
"use strict";
const CURRENT="axiovo-field-explorer-v1";
const LAST="axiovo-last-selected-archive";
const valid=a=>["arxiv","biorxiv","chemrxiv"].includes(a)?a:"arxiv";
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null}};
const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const url=new URL(location.href);
const chosen=valid(url.searchParams.get("archive")||(url.searchParams.get("view")==="biorxiv"?"biorxiv":"arxiv"));
const defaultState={
 arxiv:{field:"general",topic:"Explore all research",subtopic:"",areaSelected:false,query:""},
 biorxiv:{field:"biology",topic:"Genomics",subtopic:"",areaSelected:false,query:""},
 chemrxiv:{field:"chemistry",topic:"Materials science",subtopic:"",areaSelected:false,query:""}
};
function restore(archive){
 const saved=read("axiovo-archive-focus-"+archive);
 set(CURRENT,saved&&saved.field?saved:defaultState[archive]);
}
let previous=valid(localStorage.getItem(LAST));
if(previous!==chosen){
 if(read(CURRENT))set("axiovo-archive-focus-"+previous,read(CURRENT));
 restore(chosen);
}
try{localStorage.setItem(LAST,chosen)}catch{}
window.addEventListener("axiovo:focus-change",event=>{
 const active=valid(new URL(location.href).searchParams.get("archive")||chosen);
 set("axiovo-archive-focus-"+active,read(CURRENT)||event.detail);
});
document.addEventListener("click",event=>{
 const control=event.target.closest?.("#rl-source-arxiv,#rl-source-biorxiv,#rl-source-chemrxiv");
 if(!control)return;
 const target=valid(control.id.replace("rl-source-",""));
 const active=valid(new URL(location.href).searchParams.get("archive")||chosen);
 if(target===active)return;
 event.preventDefault();event.stopImmediatePropagation();
 set("axiovo-archive-focus-"+active,read(CURRENT)||defaultState[active]);
 restore(target);
 try{localStorage.setItem(LAST,target)}catch{}
 const next=new URL(location.href);
 next.searchParams.set("archive",target);
 next.searchParams.delete("view");
 next.hash="#discover";
 location.assign(next.href);
},true);
})();