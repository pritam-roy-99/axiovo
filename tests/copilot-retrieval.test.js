/* Regression checks for Axiovo Research Assistant retrieval.
   Run: node tests/copilot-retrieval.test.js */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const js=fs.readFileSync("docs/copilot.js","utf8");
const begin=js.indexOf("async function findPaper(");
const end=js.indexOf("\nfunction paperSummary(",begin);
assert(begin>=0&&end>begin,"Exact-paper retrieval function missing");
const retrieve=js.slice(begin,end);
const fakeArxiv={
 parse(value){
  const match=String(value||"").match(/(?:arxiv:)?(\d{4}\.\d{4,5})(v\d+)?/i);
  return match?{base:match[1],requested:match[1]+(match[2]||""),explicit:!!match[2]}:null;
 },
 base(value){return this.parse(value)?.base||""}
};
function context({rows=[],snapshot=[],publicHits=[],onLive=null}={}){
 const archive={
  eprintIdentifier(value){const m=String(value||"").match(/^(?:eprint:)?(\d{4}\/\d{1,6})$/);return m?m[1]:""},
  normalize(source,p){return {...p,source,recordId:p.recordId||p.id}},
  async snapshot(source){assert.equal(source,"eprint");return {papers:snapshot}},
  async live(source,criteria){
   assert.equal(source,"arxiv");
   assert(criteria.q);
   if(onLive)return onLive(source,criteria);
   return {papers:publicHits};
  }
 };
 const window={AxiovoArxiv:fakeArxiv};
 const get=new Function("Archive","window","index",retrieve+";return findPaper;");
 return get(archive,window,rows);
}
(async()=>{
 const wrong=context({publicHits:[
  {source:"arxiv",id:"2601.99999",recordId:"2601.99999",title:"Unrelated"},
  {source:"arxiv",id:"2601.12345",recordId:"2601.12345",title:"Correct"}
 ]});
 assert.equal((await wrong("2601.12345",true)).id,"2601.12345",
  "Public results must match the exact identifier, not the first returned paper");
 assert.equal(await context({publicHits:[{source:"arxiv",id:"2601.99999"}]})("2601.12345",true),null,
  "Unrelated results must not be shown as requested papers");
 assert.equal(await wrong("2601.12345v3",true),null,
  "DOI metadata may not establish the requested revision");
 const cached=context({rows:[{id:"2601.12345",recordId:"2601.12345v3",title:"Verified v3",source:"arxiv"}]});
 assert.equal((await cached("2601.12345v3",true)).recordId,"2601.12345v3");
 assert.equal(await cached("2601.12345v4",true),null);
 const iacr=context({snapshot:[{id:"2025/001",recordId:"2025/001",source:"eprint",url:"https://eprint.iacr.org/2025/001"}]});
 assert.equal((await iacr("eprint:2025/001",true)).url,"https://eprint.iacr.org/2025/001");
 assert.equal(await iacr("eprint:2025/002",true),null);
 assert(js.includes('crypto?"https://eprint.iacr.org/"+crypto:arxivUrl(id)'),
  "Unavailable IACR records must link to IACR, not arXiv");
 assert(js.includes('candidates.length===0'),"Unmatched local queries must trigger public metadata fallback");
 assert(js.includes('index=[];indexVersion="unavailable"'),"A missing local feed must not prevent public search");
 assert(js.includes('const fallback=retrieved(q,"")'),"External metadata outages must preserve useful local search evidence");
 assert(js.includes("sourceWarning"),"Public metadata failures must not be silently cleared by status updates");
 const html=fs.readFileSync("docs/copilot.html","utf8");
 assert(html.includes('value="all" selected'),"Public retrieval must be selected by default");
 console.log("Research Assistant: exact arXiv identity, revision safety, IACR source links, and public fallback passed.");
})().catch(error=>{console.error(error);process.exitCode=1});
