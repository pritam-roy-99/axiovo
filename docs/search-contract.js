/* Stable source-aware query contract. No storage writes. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoSearchContract=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const SOURCES=["arxiv","biorxiv","chemrxiv"];
 const SORT=["relevance","newest","oldest","cited","title"];
 const MODE=["lexical","hybrid","semantic"];
 const text=x=>String(x??"").normalize("NFC").replace(/\s+/g," ").trim();
 function identifier(query){
  let v=text(query);
  if(/^https?:\/\/(?:www\.)?arxiv\.org\/(abs|pdf)\//i.test(v))v=v.replace(/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//i,"").replace(/\.pdf$/,"");
  if(/^arxiv:/i.test(v))v=v.replace(/^arxiv:\s*/i,"");
  const arxiv=v.match(/^((?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7}))(?:v([1-9]\d*))?$/i);
  if(arxiv)return {kind:"arxiv",base:arxiv[1],version:arxiv[2]?Number(arxiv[2]):null,exact:!!arxiv[2]};
  v=text(query).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,"").replace(/^doi:\s*/i,"").toLowerCase();
  if(/^10\.\d{4,9}\/[-a-z0-9._;()/:+]+$/i.test(v))return {kind:"doi",doi:v};
  return null;
 }
 function sourcesOf(value){
  const arr=Array.isArray(value)?value:String(value||"").split(/[,\s]+/);
  return SOURCES.filter(s=>arr.map(x=>text(x).toLowerCase()).includes(s));
 }
 function date(value){
  const s=text(value);if(!s)return null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s+"T00:00:00Z")))throw Error("Invalid search date");
  return s;
 }
 function canonical(raw={}){
  const v=raw instanceof URLSearchParams?Object.fromEntries(raw):raw;
  const q=text(v.q||v.query).slice(0,400);
  const sources=sourcesOf(v.sources||v.source||v.archives);
  const from=date(v.from||v.start),to=date(v.to||v.end);
  if(from&&to&&from>to)throw Error("Search range ends before it starts");
  const size=Math.max(1,Math.min(100,Number.parseInt(v.pageSize||v.page_size||v.limit,10)||25));
  return Object.freeze({
   q,sources:sources.length?sources:SOURCES.slice(),
   category:text(v.category).slice(0,120),
   topic:text(v.topic).slice(0,160),subtopic:text(v.subtopic).slice(0,160),
   author:text(v.author).slice(0,200),affiliation:text(v.affiliation).slice(0,200),
   from,to,mode:MODE.includes(v.mode)?v.mode:"lexical",
   sort:SORT.includes(v.sort)?v.sort:"relevance",
   page:Math.max(1,Math.min(100000,Number.parseInt(v.page,10)||1)),
   pageSize:size,cursor:text(v.cursor).slice(0,500),
   provenance:text(v.provenance).slice(0,60)||"source-linked",
   identity:identifier(q)
  });
 }
 function toParams(query){
  const q=canonical(query),p=new URLSearchParams();
  if(q.q)p.set("q",q.q);
  if(q.sources.length!==3)p.set("sources",q.sources.join(","));
  for(const k of ["category","topic","subtopic","author","affiliation","from","to","mode","sort","page","pageSize","cursor","provenance"]){
   const v=q[k];
   if(v!==null&&v!==""&&!(k==="mode"&&v==="lexical")&&!(k==="sort"&&v==="relevance")&&!(k==="page"&&v===1)&&!(k==="pageSize"&&v===25)&&!(k==="provenance"&&v==="source-linked"))p.set(k,String(v));
  }
  return p;
 }
 function eligible(p,q){
  const c=canonical(q);
  if(!c.sources.includes(text(p.source).toLowerCase()))return false;
  if(c.identity){
   if(c.identity.kind==="arxiv"){
    if(text(p.source).toLowerCase()!=="arxiv")return false;
    const candidate=identifier(p.recordId||p.source_id||p.id);
    if(!candidate||candidate.kind!=="arxiv"||candidate.base.toLowerCase()!==c.identity.base.toLowerCase())return false;
    if(c.identity.exact&&candidate.version!==c.identity.version)return false;
   }else if(text(p.doi||p.source_id||p.id).toLowerCase().replace(/^(biorxiv|chemrxiv):/,"")!==c.identity.doi)return false;
  }
  const when=text(p.submitted_date||p.date||p.published).slice(0,10);
  if((c.from||c.to)&&(!/^\d{4}-\d{2}-\d{2}$/.test(when)||(c.from&&when<c.from)||(c.to&&when>c.to)))return false;
  if(c.author&&!String((p.authors||[]).map(a=>typeof a==="string"?a:a.name).join(" ")).toLowerCase().includes(c.author.toLowerCase()))return false;
  if(c.category&&!(p.categories||[]).some(x=>String(x).toLowerCase()===c.category.toLowerCase()))return false;
  return true;
 }
 return Object.freeze({SOURCES,SORT,MODE,canonical,toParams,eligible,identifier});
});