/* Disciplined field-aware public literature search. Does not claim exhaustive recall. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.ResearchLensSearch=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 // OpenAlex field identifiers are stable; IDs are from the public fields hierarchy.
 // Cross-listed research receives multiple eligible fields.
 const FIELDS={
  quantum:["31","17","26"], mathematics:["26"], astrophysics:["31","19"],
  computer:["17"], biology:["11","13","28"], medicine:["27","28","13","29"],
  chemistry:["16","25","15"], engineering:["22","15","17","21"],
  social:["33","20","32","18"]
 };
 const PHYSICS=/\b(quantum|qubit|qudit|bell(?:['’]s)?|kochen[\s-]*specker|noncontextual(?:ity)?|contextuality|hidden[\s-]*variables?|povm|hilbert|entangl(?:e|ed|ement)|wavefunction|stabilizer|measurement incompatibility|ontological models?|prepare[\s-]*and[\s-]*measure|quantum[\s-]*information)\b/i;
 const CONTEXT=/\b(contextuality|noncontextual(?:ity)?|kochen[\s-]*specker|contextual correlations?|contextual[\s-]*fraction)\b/i;
 const STRONG_QUANTUM=/\b(quantum|qubit|qudit|bell(?:['’]s)?|kochen[\s-]*specker|povm|hilbert|hidden[\s-]*variables?|ontological models?|prepare[\s-]*and[\s-]*measure|measurement incompatibility|stabilizer)\b/i;
 const STOP=new Set("about across around based both from into with using paper study results research analysis approaches methods theoretical latest recent studies dynamics their some more upon what when where how than among".split(" "));
 function fieldId(raw){
  const m=String(raw||"").match(/(?:\/fields\/)?(\d+)$/);return m?m[1]:"";
 }
 function norm(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
 function terms(text){return [...new Set(norm(text).split(" ").filter(x=>x.length>=3&&!STOP.has(x)))].slice(0,18)}
 function abstractText(index){
  if(!index||typeof index!=="object")return"";
  const words=[];for(const [word,positions] of Object.entries(index))if(Array.isArray(positions))for(const pos of positions)if(Number.isInteger(pos)&&pos>=0&&pos<600)words[pos]=word;
  return words.filter(Boolean).join(" ").slice(0,3500)
 }
 function textFor(work){
  const title=String(work.display_name||work.title||"");
  const abs=abstractText(work.abstract_inverted_index);
  const labels=[work.primary_topic?.display_name,...(work.topics||[]).slice(0,5).map(t=>t.display_name)].filter(Boolean).join(" ");
  return {title,abs,labels,combined:title+" "+abs+" "+labels};
 }
 function isTopicBrowse(state,q){
  const typed=norm(q);
  return typed===norm(state.subtopic)||typed===norm(state.topic);
 }
 function plan(state,query,opts={}){
  const field=FIELDS[state.field]?state.field:"quantum",raw=String(query||"").trim();
  const browse=isTopicBrowse(state,raw);
  const context=field==="quantum"&&
    [raw,state.topic,state.subtopic].some(x=>CONTEXT.test(x||""))&&browse;
  const search=context?"quantum "+(raw||"contextuality"):raw;
  const filters=["locations.source.id:S4306400194","primary_topic.field.id:"+FIELDS[field].join("|")];
  const maxDate=String(opts.today||new Date().toISOString().slice(0,10));
  const from=String(opts.from||"");
  const to=String(opts.to||"");
  if(from)filters.push("from_publication_date:"+from);
  filters.push("to_publication_date:"+(to&&to<maxDate?to:maxDate));
  const p=new URLSearchParams({
   per_page:"100",page:String(Math.max(1,Number(opts.page)||1)),
   select:"id,display_name,title,publication_year,publication_date,cited_by_count,authorships,doi,primary_topic,topics,abstract_inverted_index,primary_location,best_oa_location,locations,open_access",
   filter:filters.join(",")
  });
  if(search)p.set("search",search);
  if(opts.sort&&opts.sort!=="relevance")p.set("sort",String(opts.sort));
  return {params:p,field,browse,context,query:raw,search,allowed:FIELDS[field],maxDate};
 }
 function match(work,p){
  if(!work||!work.id||!(work.display_name||work.title))return false;
  const id=fieldId(work.primary_topic?.field?.id);
  // Most importantly, never let a record in an unrelated classified field through.
  if(!id||!p.allowed.includes(id))return false;
  if(work.publication_date&&String(work.publication_date)>p.maxDate)return false;
  const {title,abs,labels,combined}=textFor(work);
  const src=norm(title+" "+abs);
  const meta=norm(labels);
  const qt=terms(p.query);
  if(!qt.length)return false;
  if(p.context){
   // Contextuality is polysemous. Require physical evidence and the requested
   // specialized qualifier, e.g. "preparation" or "sensing", not merely
   // generic contextuality from another branch of research.
   const physical=STRONG_QUANTUM.test(title+" "+abs)||/quantum|kochen/i.test(labels);
   const qualifiers=terms(p.query).filter(t=>!["quantum","contextuality","noncontextuality"].includes(t));
   const qualifies=qualifiers.length===0||qualifiers.some(t=>src.includes(t)||meta.includes(t));
   return CONTEXT.test(combined)&&physical&&qualifies;
  }
  if(p.field==="quantum"&&p.browse){
   if(!PHYSICS.test(combined))return false;
  }
  // User typed searches remain field restricted, with lexical evidence in
  // titles/abstracts/topics. A bare "contextuality" query also needs physics.
  const hits=qt.filter(t=>src.includes(t)||meta.includes(t)||(t.length>4&&t.endsWith("s")&&(src.includes(t.slice(0,-1))||meta.includes(t.slice(0,-1)))));
  if(!hits.length)return false;
  if(p.browse){
   // A two- or three-word research area must not pass on a generic
   // anchor such as "quantum" alone. Prefer precision over broad recall.
   const specific=qt.filter(t=>t!=="quantum");
   const requireCount=specific.length<=2?specific.length:Math.ceil(specific.length*0.67);
   const matchedSpecific=specific.filter(t=>hits.includes(t));
   if(matchedSpecific.length<Math.max(1,requireCount))return false;
  }
  if(p.field==="quantum"&&CONTEXT.test(p.query)&&!STRONG_QUANTUM.test(title+" "+abs)&&!/quantum|kochen/i.test(labels))return false;
  return true;
 }
 function select(results,p){return (Array.isArray(results)?results:[]).filter(w=>match(w,p));}
 return {FIELDS,fieldId,norm,terms,abstractText,textFor,plan,match,select};
});