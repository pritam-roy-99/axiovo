/* Source-grounded literature tools shared by the unified Axiovo Assistant. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoAssistantCore=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const STOP=new Set("the and are was were from with under above into for not this that those about using novel results study research paper papers have has more than also based method methods approach quantum their between through our which what how when where then".split(" "));
 const words=s=>(String(s||"").toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g)||[]).filter(t=>!STOP.has(t));
 function arxivId(s){const m=String(s||"").trim().match(/^(?:https?:\/\/arxiv.org\/(?:abs|pdf)\/)?((?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7}))(?:v\d+)?(?:\.pdf)?$/i);return m?m[1]:""}
 function normalize(item,provider="arXiv"){
  if(!item||!item.title||!item.id)return null;
  const raw=String(item.id),id=arxivId(raw)||raw;
  const published=String(item.published||item.created||item.date||"");
  const url=/^https:\/\//.test(item.url||"")?item.url:arxivId(raw)?"https://arxiv.org/abs/"+encodeURIComponent(id):"";
  return {id,title:String(item.title).slice(0,380),abstract:String(item.abstract||"").slice(0,4000),authors:Array.isArray(item.authors)?item.authors.slice(0,12).map(String):[],date:published,
   published,updated:String(item.updated||""),url,provider,doi:String(item.doi||""),categories:Array.isArray(item.categories)?item.categories:[],topics:Array.isArray(item.topics)?item.topics:[]}
 }
 function unique(papers){const out=new Map();for(const raw of papers||[]){
  const p=normalize(raw,raw.provider||"arXiv");if(!p||!p.url)continue;
  const key=arxivId(p.id)||p.doi.toLowerCase()||p.url;
  if(!out.has(key))out.set(key,p);
  else{const prev=out.get(key);if(p.abstract.length>prev.abstract.length){out.set(key,{...prev,...p})}}
 }return [...out.values()]}
 function rank(query,papers,limit=12){
  const data=unique(papers),qt=[...new Set(words(query))].slice(0,40);
  if(!qt.length)return [];
  const dfs=new Map(),docs=data.map(p=>{
   const wt=words(p.title),wa=words(p.abstract),tags=words((p.topics||[]).join(" ")),author=words((p.authors||[]).join(" "));
   const length=wt.length*3+wa.length+tags.length*2+author.length;
   for(const w of new Set([...wt,...wa,...tags,...author]))dfs.set(w,(dfs.get(w)||0)+1);
   return {p,wt,wa,tags,author,length};
  });
  const avg=docs.reduce((s,x)=>s+x.length,0)/Math.max(1,docs.length);
  return docs.map(row=>{
   let score=0,matched=[];
   for(const t of qt){
    const tf=row.wt.filter(x=>x===t).length*3+row.wa.filter(x=>x===t).length+
      row.tags.filter(x=>x===t).length*2+row.author.filter(x=>x===t).length;
    if(!tf)continue;
    const df=dfs.get(t)||0,idf=Math.log(1+(docs.length-df+.5)/(df+.5));
    score+=idf*(tf*2.2)/(tf+1.2*(.25+.75*row.length/Math.max(1,avg)));
    matched.push(t);
   }
   // An isolated generic word is not evidence for a multi-concept question.
   // Require at least two distinct meaningful terms (or all terms if only one).
   // The threshold is bounded for long, detailed questions.
   const coverage=matched.length/qt.length;
   const required=qt.length===1?1:Math.min(4,Math.max(2,Math.ceil(qt.length*0.45)));
   if(matched.length<required)return {paper:row.p,score:0,matched};
   const titleText=" "+words(row.p.title).join(" ")+" ";
   const phrase=qt.length>=2&&titleText.includes(" "+qt.join(" ")+" ")?1:0;
   score+=matched.length*0.7+coverage*3+phrase*10;
   return {paper:row.p,score,matched};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||
   String(b.paper.published).localeCompare(String(a.paper.published))||xid(a.paper).localeCompare(xid(b.paper))).slice(0,limit)
 }
 function evidenceAnswer(query,records){
  const list=(records||[]).slice(0,4).filter(p=>p&&p.title&&p.url);
  if(!list.length)return "No sufficiently relevant papers were found in the checked metadata for this question. This is not evidence that the topic has no literature. Try a more precise phrase, an author, or Search more arXiv records.";
  const lines=["Evidence related to: "+query,""];
  const split=text=>String(text||"").split(/(?<=[.!?])\\s+/).map(s=>s.trim()).filter(Boolean);
  for(const [i,p] of list.entries()){
   const q=new Set(words(query)),sentences=split(p.abstract);
   const ranked=sentences.map(s=>({text:s,count:[...new Set(words(s))].filter(t=>q.has(t)).length}))
     .filter(x=>x.count>0).sort((a,b)=>b.count-a.count);
   const excerpt=ranked[0]?.text||sentences[0]||"No abstract text in this record.";
   lines.push("["+(i+1)+"] "+p.title);
   lines.push("The source abstract says: "+excerpt.slice(0,470)+(excerpt.length>470?"…":""));
   lines.push("");
  }
  lines.push("Interpretation: These are source-reported statements, not a complete answer to the research question. No causal explanation, proof, or comparison has been independently established from the abstracts.");
  lines.push("Next step: Open the most relevant original paper and inspect its assumptions, methodology and references.");
  return lines.join("\\n");
 }
 function xid(p){return p.id}
 function compare(a,b){
  const A=new Set(words(a.title+" "+a.abstract)),B=new Set(words(b.title+" "+b.abstract));
  const overlap=[...A].filter(x=>B.has(x)).slice(0,18);
  const at=Date.parse(a.date||a.published),bt=Date.parse(b.date||b.published);
  const chronology=Number.isFinite(at)&&Number.isFinite(bt)?
   at<bt?"Paper A first submitted earlier":at>bt?"Paper B first submitted earlier":"Same first-submission date":"First-submission chronology uncertain";
  return {overlap,chronology,limitations:"This compares indexed metadata and first-submission dates. Read full PDFs to check assumptions, proofs and novelty."}
 }
 function evidenceReport(query,sources,mode){
  const safe=(sources||[]).slice(0,15);
  const header=["Axiovo source-linked research report","Question: "+query,"Task: "+mode,"Coverage: indexed arXiv metadata, plus any retrieved OpenAlex bibliographic records.",""];
  safe.forEach((s,i)=>{
   header.push("["+(i+1)+"] "+s.title,"Source: "+s.url,
    "Date: "+(s.date||"unknown")+"; Provider: "+s.provider,
    "Authors: "+(s.authors||[]).slice(0,5).join(", "),
    "Abstract: "+(s.abstract||"Unavailable in this index"),"");
  });
  header.push("Limits: retrieved abstracts are not complete proofs. No established novelty, correctness or theorem equivalence.");
  return header.join("\n")
 }
 return {words,arxivId,normalize,unique,rank,evidenceAnswer,compare,evidenceReport};
});
