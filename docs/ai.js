// ResearchLens AI Lab. All generative inference is opt-in and runs locally via WebGPU.
// Evidence report is deterministic and must never be represented as a scientific verdict.
const $ = id => document.getElementById(id);
let papers=[],current=null,evidence=null,engine=null,loading=false,indexGeneratedAt="unknown",reportGeneratedAt="",docFreq=new Map(),avgLength=1;
const STOP = new Set(("about above after again against along also among and are because been before being between both could does each either from have into its itself more most must near neither other over same should since some than that their them then there these they this those through under upon using very were what when where which while with within would quantum study studies results result method approach analysis paper proposed investigate framework based provide using").split(" "));
function words(t){return (String(t||"").toLowerCase().match(/[a-z][a-z0-9-]{3,}/g)||[]).filter(x=>!STOP.has(x))}
function rankedKeywords(p){const title=words(p.title||""),abstract=words(p.abstract||"");let map=new Map();for(const x of abstract)map.set(x,(map.get(x)||0)+1);for(const x of title)map.set(x,(map.get(x)||0)+4);return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0])}
function countWords(text,weight=1){const m=new Map();for(const t of words(text))m.set(t,(m.get(t)||0)+weight);return m}
function prepareIndex(){
 docFreq=new Map();let total=0;
 for(const p of papers){const terms=new Set(words((p.title||"")+" "+(p.abstract||"")));total+=terms.size;for(const t of terms)docFreq.set(t,(docFreq.get(t)||0)+1)}
 avgLength=Math.max(1,total/Math.max(1,papers.length));
}
function lexicalScore(a,b){
 const query=countWords(a.abstract||"");for(const [t,n] of countWords(a.title||"",3))query.set(t,(query.get(t)||0)+n);
 const tf=countWords(b.abstract||"");for(const [t,n] of countWords(b.title||"",3))tf.set(t,(tf.get(t)||0)+n);
 const n=papers.length||1,docLen=words(b.abstract||"").length+3*words(b.title||"").length;
 let score=0;
 for(const [term,queryWeight] of query){
  if(!tf.has(term))continue;
  const freq=tf.get(term),df=docFreq.get(term)||1,idf=Math.log(1+(n-df+0.5)/(df+0.5));
  const saturation=freq*2.2/(freq+1.2*(0.25+0.75*docLen/(avgLength*1.5)));
  score+=idf*saturation*Math.min(3,queryWeight);
 }
 const cats=new Set(a.categories||[]);
 if((b.categories||[]).some(c=>cats.has(c)))score+=0.5;
 return score;
}
function prior(p){const pTime=Date.parse(p.published||p.updated||"");return papers.filter(x=>x.id!==p.id).map(x=>({paper:x,score:lexicalScore(p,x),earlier:Date.parse(x.published||x.updated||"")<pTime})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12)}
function node(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e}
function link(p){const a=node("a",p.title);a.href="https://arxiv.org/abs/"+encodeURIComponent(p.id);a.target="_blank";a.rel="noopener noreferrer";return a}
function selectOptions(items){const select=$("paper");select.replaceChildren();for(const p of items){const o=document.createElement("option");o.value=p.id;o.textContent=p.title+" · "+p.id;select.append(o)}if(select.options.length){if(current&&items.some(x=>x.id===current.id))select.value=current.id;else current=items[0]}else current=null;updateSelected()}
function updateSelected(){current=papers.find(p=>p.id===$("paper").value)||null;$("selected").textContent=current?((current.authors||[]).slice(0,5).join(", ")+" · "+(current.published||"").slice(0,10)+" · "+current.id):"No matching papers";$("analyze").disabled=!current;$("download").disabled=!evidence;$("ai-result").replaceChildren()}
function line(container,label,value){const p=node("p",label+": "+value,"muted");container.append(p)}
function makeEvidence(){if(!current)return;const matches=prior(current),keywords=rankedKeywords(current);reportGeneratedAt=new Date().toISOString();evidence={id:current.id,title:current.title,published:current.published,keywords,near:matches,indexGeneratedAt,reportGeneratedAt,query:current.title};const root=$("report-body");root.replaceChildren();$("openalex-search").disabled=false;$("openalex-results").replaceChildren();$("openalex-status").textContent="Optional external literature search is available.";
root.append(node("h3","Paper and key concepts"));line(root,"Analysis UTC",reportGeneratedAt);line(root,"Index snapshot UTC",indexGeneratedAt);line(root,"Search query",current.title);line(root,"Paper",current.title);line(root,"Published",current.published||"unknown");line(root,"Primary category",current.primary_category||"unknown");
const chips=node("div","","row");for(const k of keywords.slice(0,9))chips.append(node("span",k,"tag"));root.append(chips);
root.append(node("h3","Candidate related literature"));
const old=matches.filter(x=>x.earlier),newer=matches.filter(x=>!x.earlier);
line(root,"Retrieved candidates",matches.length+" indexed abstracts; "+old.length+" with earlier publication dates and "+newer.length+" later/same/unknown dates. This is not exhaustive prior-art search.");
for(const x of matches.slice(0,8)){const block=node("div","","evidence");const badge=node("span",x.earlier?"Earlier publication date":"Not confirmed earlier","score");block.append(badge,node("span","  BM25-style lexical rank "+x.score.toFixed(3),"small"));const h=node("h4","");h.append(link(x.paper));block.append(h);const intersection=rankedKeywords(current).filter(t=>new Set(words(x.paper.title+" "+x.paper.abstract)).has(t));block.append(node("p","Shared concepts: "+(intersection.slice(0,7).join(", ")||"weak lexical match")));root.append(block)}
const checks=node("div","","warning");checks.textContent="Suggested verification checklist: Compare theorem statements and assumptions, identify the exact claimed improvement, inspect the oldest relevant proofs, check whether the result is a special case, and verify numerical results independently. No novelty or correctness conclusion is produced.";root.append(checks);
$("report").classList.remove("hidden");$("download").disabled=false;$("ai-result").replaceChildren();$("ai-status").textContent=engine?"Model ready. Select a question and generate a source-bounded answer.":"Evidence report ready. You can optionally load a model to generate explanations.";
}
function promptFor(p,matches,mode,question){const choices={compare:"Compare claims and assumptions with the candidate abstracts. Give numbered verification questions and identify what cannot be established.",claims:"Extract the paper's claimed technical advances, mathematical assumptions, and the precise scope. Distinguish claims from independently verified facts.",limitations:"Identify explicit limitations, necessary assumptions, and concrete tests or potential counterexamples a reviewer should check.",plain:"Explain the paper's research question, method, contribution claims and relation to earlier work for a technically literate new researcher."};
const context=matches.slice(0,5).map(({paper:p,earlier})=>({arxiv_id:p.id,title:p.title,published:p.published,earlier_date:earlier,abstract:p.abstract.slice(0,900)}));
return "You are an evidence-bound science reading assistant. Only use the abstracts given. Never claim to verify a proof or establish originality. If uncertain say explicitly 'not established from abstracts'. Reference related papers only by provided arXiv IDs. A candidate published after the target is not prior art. Do not invent references, experiments, equations, or theorem details. Be concise and technical.\nTask: "+choices[mode]+"\nUser question: "+(question||"none")+"\nTARGET:\n"+JSON.stringify({id:p.id,title:p.title,abstract:p.abstract.slice(0,2300),published:p.published})+"\nCANDIDATES:\n"+JSON.stringify(context);}
async function loadModel(){
if(loading||engine)return;
if(!navigator.gpu){$("model-state").textContent="WebGPU unavailable";$("ai-status").textContent="This browser/device does not expose WebGPU. Evidence reports still work without it.";return}
loading=true;$("load").disabled=true;$("model-state").textContent="Preparing WebGPU runtime";
try{
const webllm=await import("https://esm.sh/@mlc-ai/web-llm@0.2.86");
const id=$("model-choice").value;
if(!webllm.prebuiltAppConfig.model_list.some(m=>m.model_id===id))throw Error("Selected model is not in this WebLLM release");
engine=await webllm.CreateMLCEngine(id,{initProgressCallback:report=>{$("model-state").textContent=report.text||"Loading";if(Number.isFinite(report.progress))$("progress").style.width=(report.progress*100).toFixed(0)+"%";}});
$("progress").style.width="100%";$("load").textContent="Model loaded";$("model-state").textContent=id+" ready on-device";$("model-choice").disabled=true;$("ask").disabled=false;$("ai-status").textContent="On-device inference is ready. Answers are experimental and must be checked against sources.";
}catch(err){engine=null;$("model-state").textContent="Model failed to load";$("ai-status").textContent="Could not initialize WebGPU inference: "+String(err.message||err).slice(0,240)+". Try a WebGPU browser with available graphics memory.";$("load").disabled=false;}finally{loading=false;}
}
async function ask(){
if(!engine||!current||loading)return;
loading=true;$("ask").disabled=true;$("ai-result").textContent="Generating answer locally…";$("ai-status").textContent="On-device model is analyzing the supplied abstracts.";
try{const response=await engine.chat.completions.create({messages:[{role:"system",content:"You are a cautious scientific paper assistant. Prioritize source-grounded uncertainty and cite supplied arXiv IDs."},{role:"user",content:promptFor(current,prior(current),$("mode").value,$("question").value.slice(0,700))}],temperature:0.2,max_tokens:650});
$("ai-result").textContent=response.choices?.[0]?.message?.content||"No text generated.";$("ai-status").textContent="Generated locally using "+$("model-choice").value+". This is not peer review or verified novelty assessment.";}
catch(err){$("ai-result").textContent="Generation failed: "+String(err.message||err).slice(0,240);$("ai-status").textContent="Try reloading or a shorter question.";}finally{loading=false;$("ask").disabled=false}
}
$("search").addEventListener("input",()=>{const q=$("search").value.toLowerCase().trim();selectOptions(papers.filter(p=>[p.title,p.id,(p.authors||[]).join(" "),p.abstract].join(" ").toLowerCase().includes(q)).slice(0,120))});
$("paper").addEventListener("change",()=>{evidence=null;$("download").disabled=true;$("report").classList.add("hidden");updateSelected()});
$("analyze").addEventListener("click",makeEvidence);$("download").addEventListener("click",()=>{if(!evidence)return;const text="ResearchLens Preliminary Literature Evidence\n"+evidence.title+"\n"+evidence.id+"\nGenerated: "+evidence.reportGeneratedAt+"\nIndex snapshot: "+evidence.indexGeneratedAt+"\nSearch query: "+evidence.query+"\nLocal algorithm: abstract/title token cosine overlap (not novelty evidence)\n\nKeywords: "+evidence.keywords.join(", ")+"\n\nCandidate literature (not novelty findings):\n"+evidence.near.map(x=>(x.earlier?"Earlier date: ":"Not established earlier: ")+x.paper.title+" https://arxiv.org/abs/"+x.paper.id+" lexicalRank="+x.score.toFixed(3)).join("\n")+"\n\nExternal OpenAlex results (if searched; not validated prior-art matches):\n"+(evidence.external||[]).map(x=>(x.year||"Year unknown")+" | "+x.title+" | "+x.id).join("\n")+"\n\nNOT a scientific novelty or correctness verdict.";const url=URL.createObjectURL(new Blob([text],{type:"text/plain"}));const a=document.createElement("a");a.href=url;a.download="researchlens-evidence-"+evidence.id+".txt";a.click();URL.revokeObjectURL(url)});
$("draft-analyze").addEventListener("click",()=>{
 const title=$("draft-title").value.trim(), abstract=$("draft-abstract").value.trim();
 if(title.length<8||abstract.length<80){alert("Please provide a meaningful title and an abstract of at least 80 characters.");return}
 const draft={id:"private-draft",title,abstract,authors:["Local private draft"],categories:[],primary_category:"private",published:new Date().toISOString(),updated:new Date().toISOString(),topics:[]};
 papers=papers.filter(p=>p.id!=="private-draft");papers.unshift(draft);current=draft;
 $("search").value="";selectOptions(papers.slice(0,120));$("paper").value=draft.id;updateSelected();makeEvidence();
 $("selected").textContent="Private draft · text remains in browser memory and is not sent to ResearchLens servers.";
 document.getElementById("report").scrollIntoView({behavior:"smooth",block:"start"});
});

async function searchOpenAlex(){
 if(!current||!evidence)return;
 const button=$("openalex-search"),root=$("openalex-results");
 button.disabled=true;root.replaceChildren();$("openalex-status").textContent="Searching external OpenAlex corpus…";
 const term=(current.title||"").slice(0,220);
 const qs=new URLSearchParams({search:term,per_page:"12",select:"id,display_name,title,publication_year,cited_by_count,doi"});
 try{
  const response=await fetch("https://api.openalex.org/works?"+qs.toString(),{headers:{Accept:"application/json"}});
  if(!response.ok)throw Error("OpenAlex HTTP "+response.status);
  const data=await response.json();const found=(data.results||[]).filter(x=>x.id&&x.display_name);
  evidence.external=found.map(x=>({id:x.id,title:x.display_name,year:x.publication_year,citations:x.cited_by_count}));
  const targetYear=Number((current.published||"").slice(0,4));
  root.append(node("p",String(data.meta?.count||0)+" title/phrase search hits in OpenAlex; displaying "+found.length+". A publication year is not proof of priority.","muted"));
  for(const w of found){
    const d=node("div","","evidence"),h=node("h4","");
    const a=node("a",w.display_name);a.href=w.id;a.target="_blank";a.rel="noopener noreferrer";h.append(a);d.append(h);
    const date=(Number(w.publication_year)&&targetYear)?w.publication_year<targetYear?"Earlier year":w.publication_year>targetYear?"Later year":"Same year, ordering unresolved":"Date ordering uncertain";
    d.append(node("p",date+" · "+(w.publication_year||"year unknown")+" · "+(w.cited_by_count??0)+" OpenAlex citations · External metadata, not independently validated","muted"));
    if(w.doi&&/^https:\/\//.test(w.doi)){const doi=node("a","DOI ↗");doi.href=w.doi;doi.target="_blank";doi.rel="noopener noreferrer";d.append(doi)}
    root.append(d);
  }
  $("openalex-status").textContent="Live external results loaded. Compare full papers and claims manually.";
 }catch(err){
  $("openalex-status").textContent="OpenAlex is unavailable or rate-limited: "+String(err.message||err).slice(0,140);
  const a=node("a","Search this title on OpenAlex directly ↗");
  a.href="https://openalex.org/works?search="+encodeURIComponent(term);a.target="_blank";a.rel="noopener noreferrer";root.append(a);
 }finally{button.disabled=false}
}
$("openalex-search").addEventListener("click",searchOpenAlex);
$("load").addEventListener("click",loadModel);$("ask").addEventListener("click",ask);
fetch("data/feed.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("Feed not available");return r.json()}).then(d=>{papers=(d.papers||[]).filter(p=>p&&p.id&&p.title);prepareIndex();indexGeneratedAt=d.generated_at||"unknown";$("count").textContent=papers.length+" indexed papers";const urlID=new URLSearchParams(location.search).get("id");const match=urlID?papers.find(p=>p.id===urlID):null;if(match)current=match;selectOptions(papers.slice(0,120));if(match){const opt=document.createElement("option");opt.value=match.id;opt.textContent=match.title+" · "+match.id;$("paper").prepend(opt);$("paper").value=match.id;updateSelected()}}).catch(e=>{$("count").textContent="Feed unavailable";$("selected").textContent=String(e.message||e)});
