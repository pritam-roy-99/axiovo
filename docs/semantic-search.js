/* AI-assisted OpenAlex retrieval, with evidence-based screening and no browser model download. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.ResearchLensSemanticSearch=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const PROFILES={
  contextuality:{
   prompts:"quantum contextuality, Kochen Specker theorem, generalized noncontextuality, ontological models and contextual correlations in quantum foundations",
   anchors:/\b(contextuality|noncontextuality|noncontextual|contextual|kochen[\s-]*specker|ontological models?)\b/i,
   domain:/\b(quantum|qubit|qudit|kochen[\s-]*specker|povm|hilbert|ontological models?|quantum foundations?|prepare[\s-]*and[\s-]*measure|operational equivalences?|measurement incompatibility)\b/i},
  steering:{
   prompts:"Einstein Podolsky Rosen steering, quantum assemblages, one-sided device-independent quantum information, steering inequalities and multipartite steering",
   anchors:/\b(steering|assemblages?|one[\s-]*sided[\s-]*device[\s-]*independent|epr[\s-]*steer)\b/i},
  qkd:{
   prompts:"quantum key distribution QKD, secret key rates, security proofs and device-independent quantum cryptography",
   anchors:/\b(qkd|quantum key distribution|quantum cryptograph|secret key rate|device[\s-]*independent key|key distribution)\b/i},
  nonlocality:{
   prompts:"Bell inequalities, CHSH, Bell nonlocality and device-independent correlations in quantum physics",
   anchors:/\b(bell inequality|bell inequalities|bell nonlocal|chsh|nonlocality|nonlocal correlations?|device[\s-]*independent correlations?)\b/i},
  networks:{
   prompts:"quantum networks, entanglement swapping, network nonlocality, bilocality and independent-source quantum correlations",
   anchors:/\b(quantum networks?|network nonlocality|bilocality|entanglement swapping|independent sources?|quantum repeaters?)\b/i},
  sensing:{
   prompts:"quantum sensing, quantum metrology, quantum estimation, Fisher information and precision enhancement",
   anchors:/\b(quantum sensing|quantum metrology|quantum estimation|fisher information|quantum[-\s]enhanced sensing|quantum[-\s]enhanced precision)\b/i},
  error:{
   prompts:"quantum error correction, stabilizer codes, fault-tolerant quantum computing and surface codes",
   anchors:/\b(quantum error correct|stabilizer codes?|surface codes?|fault[\s-]*toleran|topological quantum codes?)\b/i},
  computing:{
   prompts:"quantum computation, algorithms, quantum circuits and quantum computational complexity",
   anchors:/\b(quantum comput|quantum algorithm|quantum circuits?|quantum complexity|quantum processor)\b/i},
  optomechanics:{
   prompts:"quantum cavity optomechanics, mechanical oscillators, radiation pressure and macroscopic quantum states",
   anchors:/\b(optomechanic|mechanical oscillators?|radiation pressure|mechanical resonator|cavity optomechanic)\b/i},
  entanglement:{
   prompts:"quantum entanglement, Schmidt decomposition, entanglement witnesses and multipartite correlations",
   anchors:/\b(entanglement|entangled|schmidt decomposition|entanglement witness|separability|partial transpose)\b/i}
 };
 function profile(state,query){
  const q=String(query||"").trim().toLowerCase();const browse=q===String(state?.topic||"").trim().toLowerCase()||q===String(state?.subtopic||"").trim().toLowerCase();
  const sample=(browse?String(state?.topic||"")+" "+String(state?.subtopic||"")+" ":"")+q;
  if(/contextual/.test(sample))return "contextuality";
  if(/steering|assemblage/.test(sample))return "steering";
  if(/key distribution|cryptograph|\bqkd\b/.test(sample))return "qkd";
  if(/nonlocal|bell|chsh/.test(sample))return "nonlocality";
  if(/quantum network|bilocal|entanglement swapping/.test(sample))return "networks";
  if(/sensing|metrology/.test(sample))return "sensing";
  if(/error correction|stabilizer/.test(sample))return "error";
  if(/optomechan/.test(sample))return "optomechanics";
  if(/entanglement|schmidt/.test(sample))return "entanglement";
  if(/quantum comput/.test(sample))return "computing";
  return null;
 }
 function semanticDescription(state,query){
  const key=profile(state,query),p=key?PROFILES[key]:null;
  const distinct=String(query||"").trim();
  const field=String(state?.field||"quantum");
  const fieldText={
   quantum:"quantum information and quantum physics",
   mathematics:"mathematics and mathematical proofs",
   astrophysics:"astrophysics and cosmology",
   computer:"computer science",
   biology:"biological sciences",
   medicine:"clinical medical research",
   chemistry:"chemistry and materials science",
   engineering:"engineering systems",
   social:"social science and economics"
  }[field]||"scientific research";
  const base=p&&field==="quantum"?p.prompts:fieldText+" research on "+distinct;
  const browsing=[state?.topic,state?.subtopic].some(x=>String(x||"").toLowerCase()===distinct.toLowerCase());
  const sub=browsing?String(state?.subtopic||"").trim():"";
  // Keep named specializations in the embedding query, not only a broad category.
  return (base+(sub&&!base.toLowerCase().includes(sub.toLowerCase())?". Specific topic: "+sub+".":"")).slice(0,1800);
 }
 function plan(base,state,opts={}){
  const p=new URLSearchParams(base.params);
  p.delete("search");p.delete("sort");p.delete("search.title_abstract_keywords");
  p.set("search.semantic",semanticDescription(state,base.query));
  p.set("per_page","50");p.set("page","1");
  return {params:p,description:semanticDescription(state,base.query),profile:profile(state,base.query)};
 }
 function screen(work,base,state,core){
  if(!work||!work.id)return false;
  const text=core.textFor(work);
  const all=text.combined;
  const topic=profile(state,base.query);
  const spec=topic&&base.field==="quantum"?PROFILES[topic]:null;
  if(spec){
   if(!spec.anchors.test(all))return false;
   if(spec.domain&&!spec.domain.test(all))return false;
   const sub=String(state?.subtopic||"").toLowerCase();
   if(topic==="contextuality"&&sub){
    if(/\bpreparation\b/.test(sub)&&!/\b(preparations?|prepare[\s-]*and[\s-]*measure)\b/i.test(all))return false;
    if(/\bmeasurement\b/.test(sub)&&!/\b(measurements?|povm|observables?)\b/i.test(all))return false;
    if(/\bsteering\b/.test(sub)&&!/\bsteering\b/i.test(all))return false;
   }
  }
  // Retain the discipline and date gates but allow valid cross-listed work.
  const topicFields=[work.primary_topic,...(work.topics||[])].map(t=>core.fieldId(t?.field?.id)).filter(Boolean);
  if(!topicFields.some(x=>base.allowed.includes(x)))return false;
  if(work.publication_date&&String(work.publication_date)>base.maxDate)return false;
  if(core.match(work,base))return true;
  if(spec)return true; // Controlled domain concept with verified subject metadata.
  // For other fields require a meaningful exact subject term as a guard.
  const terms=core.terms(base.query).filter(t=>t!=="quantum");
  const labelText=core.norm(all);
  return terms.length>0&&terms.some(t=>labelText.includes(t));
 }
 function combine(lexical,semantic,base,state,core,limit=20){
  const found=new Map();
  for(const w of lexical||[]){
   if(!core.match(w,base))continue;
   found.set(w.id,{work:w,source:"keyword",score:100+(Number(w.relevance_score)||0)});
  }
  for(let i=0;i<(semantic||[]).length;i++){
   const w=semantic[i];
   if(found.has(w.id)||!screen(w,base,state,core))continue;
   found.set(w.id,{work:w,source:"semantic",score:50-i/2});
  }
  return [...found.values()].sort((a,b)=>b.score-a.score).slice(0,limit);
 }
 return {PROFILES,profile,semanticDescription,plan,screen,combine};
});