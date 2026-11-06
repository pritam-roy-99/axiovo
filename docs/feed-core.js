/* Axiovo My Feed: pure, source-grounded local ranking. No remote AI or tracking. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoFeedCore=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const STOP=new Set("the and for with from into onto this that those these study studies using based via new paper papers research method methods models model analysis results approach their which what where how why".split(" "));
 function terms(value){return [...new Set(String(value||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").match(/[a-z][a-z0-9-]{2,}/g)||[])].filter(x=>!STOP.has(x)).slice(0,45)}
 function key(p){const raw=String(p?.id||p?.doi||p?.recordId||"");return String(p?.source||"arxiv")+":"+raw.toLowerCase().replace(/(?:\/v|v)\d+$/,"")}
 function date(p){const raw=p.announcementDate||p.announcement_date||p.published||p.date||"";const ms=Date.parse(raw);return Number.isFinite(ms)?ms:0}
 function overlaps(query,title,abstract){
  const words=terms(query), t=new Set(terms(title)),a=new Set(terms(abstract));
  const main=words.filter(x=>t.has(x)),support=words.filter(x=>a.has(x));
  // Long expressions must share several distinct concepts, not one generic word.
  const needed=words.length<=2?words.length:Math.max(2,Math.ceil(words.length*.5));
  const found=new Set([...main,...support]);
  return {matched:words.length>0&&found.size>=needed,score:Math.round((main.length*7+support.length*2)*Math.min(1,found.size/Math.max(1,words.length))),words:[...found]};
 }
 function pathMatches(path,paper){
  if(path.source!==(paper.source||"arxiv"))return [];
  const category=path.category.toLowerCase();
  const tags=(paper.categories||[]).map(tag=>String(tag).toLowerCase());
  const inCategory=tags.some(tag=>tag===category||tag.startsWith(category+"."));
  if(!path.terms.length)return inCategory?[{topic:path.label,score:0,matched:true}]:[];
  if(tags.length&&!inCategory)return [];
  return path.terms.map(topic=>({topic,...overlaps(topic,paper.title,paper.abstract)}));
 }
 function build(papers,prefs={},now=Date.now()){
  const authors=(prefs.authors||[]).filter(Boolean);
  const interests=[...new Set((prefs.directTopics||prefs.topics||[]).filter(Boolean))].slice(0,40);
  const saved=new Set((prefs.saved||[]).map(x=>String(x).toLowerCase()));
  const references=(prefs.references||[]).filter(x=>x?.title).slice(0,20);
  const hidden=new Set((prefs.hidden||[]).map(x=>String(x).toLowerCase()));
  const seen=new Set(),out=[];
  for(const paper of papers||[]){
   if(!paper?.title||!paper?.url||!/^https:\/\//.test(paper.url))continue;
   const id=key(paper);if(seen.has(id)||hidden.has(id))continue;seen.add(id);
   const authorHit=(paper.authors||[]).filter(x=>authors.some(y=>prefs.matchesAuthor?prefs.matchesAuthor(y,x):String(y).toLowerCase()===String(x).toLowerCase()));
   const matches=[...interests.map(topic=>({topic,...overlaps(topic,paper.title,paper.abstract)})),
    ...(prefs.paths||[]).flatMap(path=>pathMatches(path,paper))];
   const topicMatches=[...new Map(matches.filter(x=>x.matched).map(x=>[x.topic.toLowerCase(),x])).values()];
   const related=references.filter(x=>key(x)!==id).map(x=>({paper:x,...overlaps(x.title,paper.title,paper.abstract||"")})).filter(x=>x.matched).sort((a,b)=>b.score-a.score).slice(0,1);
   if(!authorHit.length&&!topicMatches.length&&!related.length)continue;
   const then=date(paper),days=then>0&&then<=now?(now-then)/86400000:null;
   const recency=days===null?0:days<=3?12:days<=7?9:days<=30?5:days<=90?2:0;
   const reasons=[...authorHit.slice(0,2).map(x=>"Following author: "+x),
    ...topicMatches.slice(0,3).map(x=>"Following topic: "+x.topic),
    ...related.map(x=>"Similar to saved: "+x.paper.title.slice(0,65))];
   const score=authorHit.length*35+topicMatches.reduce((n,x)=>n+20+x.score,0)+
    related.reduce((n,x)=>n+12+x.score,0)+recency-
    (saved.has(id)?12:0);
   out.push({paper,score,reasons,days,authorMatch:authorHit.length>0,topicMatch:topicMatches.length>0,
    relatedMatch:related.length>0,saved:saved.has(id),key:id});
  }
  return out.sort((a,b)=>b.score-a.score||date(b.paper)-date(a.paper)||a.key.localeCompare(b.key));
 }
 function select(items,view="for-you"){
  const pool=items||[];
  if(view==="following")return pool.filter(x=>x.authorMatch||x.topicMatch).sort((a,b)=>date(b.paper)-date(a.paper)||b.score-a.score);
  if(view==="latest")return [...pool].sort((a,b)=>date(b.paper)-date(a.paper)||b.score-a.score);
  if(view==="related")return pool.filter(x=>x.topicMatch||x.relatedMatch).sort((a,b)=>b.score-a.score);
  return pool;
 }
 return {terms,key,date,overlaps,build,select};
});
