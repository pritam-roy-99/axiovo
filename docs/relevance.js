/* Axiovo relevance: transparent lexical ranking, not semantic novelty assessment.
 * Pure functions are also available to the Node regression test runner.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoRelevance=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const STOP=new Set(["the","and","with","for","from","into","this","that","these","those","using","based","under","over","between","through","toward","towards","study","studies","paper","new","via","our","their","are","was","were","has","have","how","can","does","when","which","what","research"]);
 function tokens(value){return [...new Set(String(value||"").toLowerCase().normalize("NFKC").match(/[a-z0-9]+/g)||[])].filter(t=>t.length>2&&!STOP.has(t)).slice(0,45)}
 function phrase(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
 function matches(terms,text){const bag=new Set(tokens(text));return terms.filter(t=>bag.has(t))}
 function normalizeId(id){const s=String(id||"").trim();const m=s.match(/(?:arxiv\.org\/(?:abs|pdf)\/)?((?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7}))(?:v\d+)?(?:\.pdf)?$/i);return m?m[1]:s}
 function rank(papers,opts){
   const settings=opts&&typeof opts==="object"?opts:{};
   const interests=Array.isArray(settings.interests)?settings.interests.filter(Boolean):[];
   const projects=Array.isArray(settings.projects)?settings.projects.filter(Boolean):[];
   const saved=new Set((settings.saved||[]).map(normalizeId));
   const excluded=new Set((settings.hidden||[]).map(normalizeId));
   const namedAuthors=Array.isArray(settings.authors)?settings.authors.filter(Boolean):[];
   const authors=namedAuthors.map(phrase);
   // Do not allow one incidental word to qualify a multi-concept topic.
   const sufficient=(found,terms)=>found.size>=(terms.length===1?1:Math.max(2,Math.ceil(terms.length*.6)));
   const now=Date.parse(settings.now||new Date().toISOString());
   return (papers||[]).filter(p=>p&&p.id&&!excluded.has(normalizeId(p.id))).map(p=>{
     const title=String(p.title||"");
     const abstract=String(p.abstract||"");
     const categories=(p.categories||[]).join(" ");
     let score=0;const reasons=[];
     for(const interest of interests.slice(0,15)){
       const ts=tokens(interest);if(!ts.length)continue;
       const a=matches(ts,title),b=matches(ts,abstract),c=matches(ts,(p.topics||[]).join(" "));
       const found=new Set([...a,...b,...c]);
       if(!sufficient(found,ts))continue;
       const weight=found.size/ts.length;
       score+=Math.round(10*weight+(a.length?5:0)+(c.length?4:0));
       reasons.push("Matches interest: "+interest);
     }
     for(const project of projects.slice(0,10)){
       const value=project.keywords||project.title||"";
       const ts=tokens(value);if(!ts.length)continue;
       const overlap=new Set([...matches(ts,title),...matches(ts,abstract)]);
       if(sufficient(overlap,ts)){
         score+=Math.round(15*overlap.size/ts.length+(matches(ts,title).length?5:0));
         reasons.push("Related terms: "+project.title);
       }
     }
     const named=(p.authors||[]).some(name=>namedAuthors.some((author,i)=>
       phrase(name)===authors[i]||
       (typeof settings.matchesAuthor==="function"&&settings.matchesAuthor(author,name))));
     if(named){score+=15;reasons.push("Followed author")}
     const id=normalizeId(p.id);
     if(saved.has(id)){score-=25;reasons.push("Already saved")}
     const publication=Date.parse(p.published||"");
     if(Number.isFinite(publication)&&Number.isFinite(now)&&publication<=now){
       const days=(now-publication)/86400000;
       if(days<=7)score+=4;
     }
     // Do not pretend every paper is a personalized match.
     const positive=reasons.some(x=>x.startsWith("Matches")||x.startsWith("Related")||x==="Followed author");
     return {paper:p,score,reasons,matched:positive};
   }).filter(x=>x.matched).sort((a,b)=>b.score-a.score||String(b.paper.published||"").localeCompare(String(a.paper.published||""))||String(a.paper.id).localeCompare(String(b.paper.id)));
 }
 function cleanProject(p){
   if(!p||typeof p!=="object")return null;
   const id=String(p.id||"").slice(0,90);
   const title=String(p.title||"").trim().slice(0,160);
   if(!id||!title)return null;
   return {id,title,keywords:String(p.keywords||"").slice(0,300),question:String(p.question||"").slice(0,1000),
     status:["exploring","active","paused","completed"].includes(p.status)?p.status:"exploring",
     paper_ids:[...new Set((Array.isArray(p.paper_ids)?p.paper_ids:[]).map(normalizeId))].slice(0,300),
     updated_at:String(p.updated_at||"").slice(0,35)};
 }
 return {tokens,normalizeId,rank,cleanProject};
});
