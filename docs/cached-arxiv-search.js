/* Search cached arXiv metadata when external search is rate-limited.
   Offline results are marked as limited and never presented as full-archive coverage.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.ResearchLensCachedArxiv=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const STOP=new Set("a an the to of for with and from based use using quantum paper papers research study results approach approaches information".split(" "));
 const TOKEN=/[a-z0-9]+/g;
 const words=str=>[...new Set((String(str||"").toLowerCase().match(TOKEN)||[]).filter(w=>w.length>2&&!STOP.has(w)))];
 const PHYSICS=/\b(quantum|qubit|qudit|bell|chsh|entangl|nonlocal|steer|povm|measurement|contextual|hilbert|photon|quantiz|cryptograph|qkd)\w*/i;
 const TOPICS={
  "bell nonlocality":/\b(chsh|bell|nonlocal|inequalit)\w*/i,
  "quantum steering":/\b(steering|assemblages?|epr steering|one.sided device.independent)\b/i,
  "quantum key distribution":/\b(qkd|quantum key distribution|secret key rate|quantum cryptograph)\b/i,
  "quantum computing":/\b(quantum comput\w*|quantum circuits?|quantum algorithm\w*)\b/i,
  "contextuality":/\b(contextuality|noncontextuality|kochen.specker)\b/i
 };
 function categoryFit(p,field){
  const categories=[p.primary_category,...(p.categories||[])].filter(Boolean).join(" ");
  const raw=String(p.title||"")+" "+String(p.abstract||"");
  if(field==="quantum")return /\bquant-ph\b/.test(categories)||PHYSICS.test(raw);
  if(field==="highenergy")return /\b(hep-th|hep-ph|hep-ex|hep-lat|gr-qc)\b/i.test(categories)||/\b(particle physics|quantum field theory|lattice qcd|standard model|collider physics|supersymmetry|scattering amplitudes|higgs boson|neutrino oscillations|ads\/cft)\b/i.test(raw);
  if(field==="statmech")return /\bcond-mat\.stat-mech\b/.test(categories)||/\b(critical phenomena|renormalization group|stochastic thermodynamics|nonequilibrium statistical|spin glasses|statistical mechanics|phase transitions)\b/i.test(raw);
  if(field==="condmat")return /\bcond-mat(?:\.[a-z-]+)?\b/.test(categories)||/\b(condensed matter|superconductivity|Hubbard model|quantum spin liquid|topological insulator|moiré material)\b/i.test(raw);
  if(field==="computer")return /\bcs\.|\bstat\./i.test(categories);
  if(field==="mathematics")return /\bmath\.|\bmath\b/.test(categories);
  if(field==="astrophysics")return /\bastro-ph\b|\bgr-qc\b/.test(categories);
  if(field==="engineering")return /\b(eess\.|physics\.optics)/.test(categories);
  if(field==="chemistry")return /\b(physics\.chem-ph|cond-mat\.mtrl-sci)\b/.test(categories);
  if(field==="biology")return /\b(q-bio\.)/.test(categories);
  if(field==="medicine")return /\b(q-bio\.)/.test(categories);
  if(field==="social")return /\b(physics\.soc-ph|econ\.|q-fin\.)/.test(categories);
  return false
 }
 function match(p,query,field){
  if(!p||!p.id||!p.title||!categoryFit(p,field))return null;
  const title=String(p.title||"").toLowerCase(),body=String(p.abstract||"").toLowerCase();
  const text=title+" "+body;
  const lookup=String(query||"").toLowerCase().trim();
  const special=Object.entries(TOPICS).find(([name])=>lookup.includes(name));
  if(special){
   if(!special[1].test(text))return null;
   if(field==="quantum"&&!PHYSICS.test(text))return null;
   return {score:35+(special[1].test(title)?20:0),terms:special[0]};
  }
  const tokens=words(query).slice(0,12);
  if(!tokens.length)return null;
  const hits=tokens.filter(w=>title.includes(w)||body.includes(w));
  const required=tokens.length<=2?1:Math.max(2,Math.ceil(tokens.length*0.6));
  if(hits.length<required)return null;
  const score=hits.reduce((v,w)=>v+(title.includes(w)?8:2),0);
  return {score,terms:hits.join(", ")}
 }
 function toWork(p){
  const id=String(p.id||"").replace(/v\d+$/,"");
  const title=String(p.title||"").trim();
  const published=String(p.published||"").slice(0,10);
  const year=parseInt(published.slice(0,4),10)||null;
  return {id:"https://arxiv.org/abs/"+id,display_name:title,title,publication_year:year,
   publication_date:published,cited_by_count:null,
   authorships:(p.authors||[]).slice(0,12).map(name=>({author:{display_name:String(name)}})),
   primary_location:{landing_page_url:"https://arxiv.org/abs/"+id,source:{display_name:"arXiv"}},
   locations:[{landing_page_url:"https://arxiv.org/abs/"+id}],
   __source:"local-arxiv",__categories:p.categories||[],__abstract:String(p.abstract||"").slice(0,2400)}
 }
 function find(feed,opts={}){
  const all=Array.isArray(feed)?feed:Array.isArray(feed?.papers)?feed.papers:[];
  const field=String(opts.field||"quantum"),query=String(opts.query||"").trim();
  const from=String(opts.from||""),to=String(opts.to||""),today=String(opts.today||new Date().toISOString().slice(0,10));
  const scored=[];
  for(const p of all){
   if(p.published&&String(p.published).slice(0,10)>today)continue;
   const m=match(p,query,field);if(!m)continue;
   const date=String(p.published||"").slice(0,10);
   scored.push({p,score:m.score,date,inRange:(!from||date>=from)&&(!to||date<=to)});
  }
  const sorter=(a,b)=>opts.sort==="publication_date:desc"?b.date.localeCompare(a.date)||b.score-a.score:b.score-a.score||b.date.localeCompare(a.date);
  const inRange=scored.filter(x=>x.inRange).sort(sorter);
  const expanded=!inRange.length&&Boolean(from||to);
  const chosen=(expanded?scored.sort(sorter):inRange).slice(0,Math.min(30,Math.max(1,opts.limit||20)));
  return {items:chosen.map(x=>toWork(x.p)),matches:scored.length,inDateRange:inRange.length,
   outsideDates:expanded&&chosen.length>0,indexed:all.length};
 }
 return {words,categoryFit,match,toWork,find};
});