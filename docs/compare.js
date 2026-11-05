(function(){
"use strict";
const $=id=>document.getElementById(id);
const parse=raw=>{const v=String(raw||"").trim().replace(/^arxiv:/i,"").replace(/^https?:\/\/arxiv\.org\/(?:abs|pdf)\//,"").replace(/\.pdf$/,"").replace(/v\d+$/,"");return /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7})$/i.test(v)?v:null};
function make(tag,txt,cls){const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n}
function link(root,label,url){const a=make("a",label,"axiovo-compare-link");a.href=url;a.target="_blank";a.rel="noopener noreferrer";root.append(a)}
let index=[];
async function load(){
 try{const res=await fetch("./data/feed.json",{cache:"no-store"});if(!res.ok)throw Error("Feed unavailable");const d=await res.json();index=Array.isArray(d.papers)?d.papers:[]}
 catch{index=[]}
}
function info(id){
 const p=index.find(x=>x.id===id)||{};
 let memo={};try{memo=JSON.parse(localStorage.getItem("researchlens-library-metadata-v1")||"{}")}catch{}
 const local=memo["arxiv:"+id]||{};
 return {title:p.title||"arXiv:"+id,authors:(p.authors||[]).join(", "),abstract:p.abstract||"",category:(p.categories||[]).join(", "),date:p.published||"",note:local.note||"",status:local.status||"to-read",doi:p.doi||""}
}
function display(){
 const a=parse($("compare-id-a").value),b=parse($("compare-id-b").value),root=$("compare-results");root.replaceChildren();
 if(!a||!b||a===b){$("compare-message").textContent="Enter two different valid arXiv identifiers.";return}
 const url=new URL(location.href);url.searchParams.set("ids",a+","+b);history.replaceState({}, "",url.href);
 const entries=[a,b].map(id=>({id,...info(id)}));
 const assistant=$("compare-assistant");
 if(assistant){
   const question="Compare the assumptions, methods, contributions and limitations of arXiv:"+a+" and arXiv:"+b+". Verify both sources and distinguish evidence from inference.";
   assistant.href="./copilot.html?ids="+encodeURIComponent(a+","+b)+"&q="+encodeURIComponent(question);
   assistant.hidden=false;
 }

 $("compare-message").textContent=entries.some(p=>!p.abstract)?"Some metadata is not in Axiovo's current local index. Original arXiv links remain available.":"Comparison assembled from the current local arXiv index and private notes.";
 for(const p of entries){
  const art=make("article",undefined,"axiovo-compare-paper");art.append(make("span","arXiv:"+p.id,"axiovo-compare-id"));art.append(make("h2",p.title));
  art.append(make("p",p.authors||"Authors: see arXiv","muted"));art.append(make("p","Original submission: "+(p.date||"not in current index"),"muted"));art.append(make("p","Categories: "+(p.category||"verify on arXiv"),"muted"));
  const h=make("h3","Abstract");art.append(h);art.append(make("p",p.abstract||"Abstract unavailable in the local index. Read the original paper.","axiovo-compare-abstract"));
  art.append(make("h3","Your research notes"));art.append(make("p",p.note||"No private notes yet.","axiovo-compare-note"));
  const links=make("div",undefined,"axiovo-compare-links");link(links,"Read original","https://arxiv.org/abs/"+p.id);link(links,"PDF","https://arxiv.org/pdf/"+p.id);
  const detail=make("a","Paper workspace","axiovo-compare-link");detail.href="./paper.html?id="+encodeURIComponent(p.id);links.append(detail);
  const assistant=make("a","Research Assistant","axiovo-compare-link");assistant.href="./copilot.html?id="+encodeURIComponent(p.id);links.append(assistant);
  art.append(links);root.append(art);
 }
}
function init(){
 const input=$("compare-form");const ids=new URLSearchParams(location.search).get("ids");if(ids){const [a,b]=ids.split(",");$("compare-id-a").value=parse(a)||"";$("compare-id-b").value=parse(b)||""}
 input.addEventListener("submit",e=>{e.preventDefault();display()});
 load().then(()=>{if($("compare-id-a").value&&$("compare-id-b").value)display()})
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();