/* Independent, source-verified IACR ePrint snapshot reader for GitHub Pages.
 * All records originate from the IACR OAI-PMH harvester; this does not scrape
 * search pages, invent records, or claim full historical coverage.
 */
(function(root){
"use strict";
const KEY="axiovo-eprint-verified-fallback-v1";
const ID=/^((?:19|20)\d{2})\/(\d{1,6})$/;
const ENDPOINTS=[
 "./data/eprint.json",
 "https://raw.githubusercontent.com/pritam-roy-99/axiovo/main/docs/data/eprint.json",
 "https://cdn.jsdelivr.net/gh/pritam-roy-99/axiovo@main/docs/data/eprint.json"
];
const clean=x=>String(x??"").trim();
const norm=x=>clean(x).normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase();
const date=x=>/^\d{4}-\d{2}-\d{2}/.test(clean(x))?clean(x).slice(0,10):"";
const safeId=x=>{const m=clean(x).replace(/^eprint:\s*/i,"").replace(/^https?:\/\/eprint\.iacr\.org\//i,"").replace(/\.pdf$/i,"").match(ID);return m&&Number(m[2])>0?m[0]:""};
function normalize(p){
 if(!p||typeof p!=="object")return null;
 const id=safeId(p.recordId||p.id||p.url||p.link);
 const title=clean(p.title);
 if(!id||!title||title.length>1000)return null;
 const authors=(Array.isArray(p.authors)?p.authors:[]).map(clean).filter(Boolean).slice(0,100);
 return {source:"eprint",id,recordId:id,title,authors,abstract:clean(p.abstract||p.summary),
  date:date(p.date||p.published),categories:Array.isArray(p.categories)?p.categories.map(clean).filter(Boolean):[],
  affiliations:Array.isArray(p.affiliations)?p.affiliations.map(clean).filter(Boolean):[],
  citations:null,category:clean(p.category),announcementDate:"",version:null,
  doi:"",url:"https://eprint.iacr.org/"+id,pdf:"https://eprint.iacr.org/"+id+".pdf",
  provenance:"IACR Cryptology ePrint OAI-PMH",metadataUpdated:date(p.metadata_updated)};
}
function validate(payload){
 if(!payload||payload.source!=="eprint"||!Array.isArray(payload.papers))throw Error("Invalid IACR source data");
 const records=new Map();
 for(const raw of payload.papers){const p=normalize(raw);if(p)records.set(p.id,p)}
 if(!records.size)throw Error("IACR data has no verified records");
 return {papers:[...records.values()],stamp:clean(payload.generated_at||payload.checked_at),
  fullOaiTraversal:payload.historical_oai_traversal_complete===true,
  source:"IACR OAI-PMH",partial:true,cache:false};
}
async function fetchSource(url,cache){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);
 try{
  const res=await fetch(url,{cache,signal:abort.signal,headers:{Accept:"application/json"}});
  if(!res.ok)throw Error("HTTP "+res.status);
  return validate(await res.json());
 }finally{clearTimeout(timer)}
}
function cached(){
 try{
  const data=JSON.parse(localStorage.getItem(KEY)||"null");
  if(!data||!Array.isArray(data.papers)||!data.papers.length)return null;
  const valid=validate({source:"eprint",papers:data.papers,generated_at:data.stamp});
  return {...valid,source:"verified local snapshot",cache:true,fullOaiTraversal:false,partial:true};
 }catch{return null}
}
function remember(value){
 try{
  // This is only a small offline subset, not a replacement for the full index.
  const subset=value.papers.slice(0,180);
  localStorage.setItem(KEY,JSON.stringify({stamp:value.stamp,papers:subset}));
 }catch{}
}
let inflight=null,lastValue=null,lastAt=0;
const MEMORY_TTL_MS=5*60*1000;
async function load(options={}){
 if(!options.force&&lastValue&&Date.now()-lastAt<MEMORY_TTL_MS)return lastValue;
 if(inflight&&!options.force)return inflight;
 const action=(async()=>{
  const problems=[];
  for(const endpoint of ENDPOINTS){
   try{
    const result=await fetchSource(endpoint,options.cache==="default"?"default":"no-store");
    remember(result);
    return {...result,endpoint};
   }catch(e){problems.push(endpoint+": "+String(e.message||e))}
  }
  const saved=cached()||options.fallback;
  if(saved)return {...saved,problems,endpoint:"local cache"};
  throw Error("Official-source snapshot unavailable across configured hosts: "+problems.join("; ").slice(0,460));
 })();
 inflight=action;
 try{
  const value=await action;
  lastValue=value;lastAt=Date.now();
  return value;
 }finally{if(inflight===action)inflight=null}
}
function filter(papers,c){
 const terms=(Array.isArray(c?.topicTerms)?c.topicTerms:[]).filter(Boolean).map(norm);
 const exact=safeId(c?.q),q=exact?"":norm(c?.q),author=norm(c?.author);
 const textSearch=Boolean(q||terms.length),titleHits=new Set();
 const rows=papers.filter(p=>{
  if(exact&&p.id!==exact)return false;
  if(c?.from&&(!p.date||p.date<c.from))return false;
  if(c?.to&&(!p.date||p.date>c.to))return false;
  const people=author||textSearch?norm(p.authors.join(" ")):"";
  if(author&&!people.includes(author))return false;
  if(textSearch){
   const title=norm(p.title),all=[title,norm(p.abstract),people,norm(p.categories.join(" ")),norm(p.id)].join(" ");
   if(q&&!all.includes(q))return false;
   if(terms.length&&!terms.every(t=>all.includes(t)))return false;
   if(q&&title.includes(q))titleHits.add(p);
  }
  return true;
 });
 const mode=c?.sort||"relevance";
 rows.sort((a,b)=>mode==="title"?a.title.localeCompare(b.title):
  mode==="oldest"?(a.date||"9999").localeCompare(b.date||"9999"):
  mode==="recent"?(b.date||"").localeCompare(a.date||""):
  // For text search: exact title match before other metadata, then recent.
  (Number(titleHits.has(b))-Number(titleHits.has(a)))||
  (b.date||"").localeCompare(a.date||""));
 return rows;
}
root.AxiovoEprintSource={load,normalize,validate,filter,readFallback:cached,remember,sourceUrls:ENDPOINTS.slice()};
})(window);
