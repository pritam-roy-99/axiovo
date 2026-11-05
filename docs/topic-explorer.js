/* A single archive explorer with linked subject, topic and sub-subtopic search. */
(function(){
"use strict";
const source=document.body.dataset.exploreSource;
const data=window.AxiovoArchiveData, atlas=window.AxiovoTopicAtlas;
if(!data||!atlas||!Object.hasOwn(data.names,source))return;
const name=data.names[source], $=id=>document.getElementById("archive-"+id);
const key="axiovo-topic-explorer-"+source+"-v1";
const subjects=atlas.subjects(source);
const params=new URLSearchParams(location.search);
const clean=(value,max=100)=>typeof value==="string"?value.trim().slice(0,max):"";
const option=(value,label)=>new Option(label,value);
function element(tag,text,cls){
 const item=document.createElement(tag);
 if(text!==undefined)item.textContent=text;
 if(cls)item.className=cls;
 return item;
}
function button(label,fn,cls="rd-button rd-secondary"){
 const b=element("button",label,cls);b.type="button";b.onclick=fn;return b;
}
function link(label,href,cls){
 const a=element("a",label,cls);a.href=href;
 if(href.startsWith("https:")){a.target="_blank";a.rel="noopener noreferrer"}
 return a;
}
const allDates=()=>new Date().toISOString().slice(0,10);
const shiftDate=(date,days)=>new Date(Date.parse(date+"T00:00:00Z")+days*86400000).toISOString().slice(0,10);
const knownCategory=value=>subjects.byCode.get(clean(value).toLowerCase())?.code||"";
function pathFrom(value){
 return {category:knownCategory(value?.category),topic:clean(value?.topic),subtopic:clean(value?.subtopic),refine:clean(value?.refine,85)};
}
const stored=data.read(key,null);
let personal=Array.isArray(stored?.personal)?stored.personal.map(x=>({
 category:knownCategory(x?.category),topic:clean(x?.topic,85),leaf:clean(x?.leaf,85)
})).filter(x=>x.category&&atlas.slug(x.topic)).slice(0,100):[];
if(!stored){
 const legacy=data.read("axiovo-custom-fields-"+source,{});
 for(const [category,labels] of Object.entries(legacy||{})){
  const code=knownCategory(category);
  if(code&&Array.isArray(labels))for(const label of labels){
   const topic=clean(label,85);
   if(atlas.slug(topic)&&personal.length<100)personal.push({category:code,topic,leaf:""});
  }
 }
}
let followed=Array.isArray(stored?.followed)?stored.followed.map(x=>({...pathFrom(x),label:clean(x?.label,170)})).filter(x=>x.category&&x.label).slice(0,30):[];
let selected=pathFrom(params.size?Object.fromEntries(params):stored?.last);
let catalog=new Map(), catalogReady=false, index=[], topics=[], topic, leaf, subject;
let search=null, datePreset=0;
const initialSort=params.get("sort");
$("sort").value=["recent","cited"].includes(initialSort)?initialSort:"relevance";
$("match").value=params.get("match")==="title"?"title":"metadata";
$("query").value=clean(params.get("q")||params.get("query"),220);
for(const field of ["author","affiliation","from","to"])$(field).value=clean(params.get(field));
if(params.get("date"))$("from").value=$("to").value=params.get("date");
if($("crosslisted"))$("crosslisted").checked=params.get("crosslisted")==="1";
if($("author").value||$("from").value||$("to").value||$("affiliation").value)$("advanced").open=true;
for(const field of ["from","to"])$(field).max=allDates();

function savePrefs(){
 const existing=data.read(key,{});
 return data.write(key,{personal,followed,...existing,last:selected});
}
function syncURL(criteria){
 const url=new URL(location.href);
 const next={...selected,q:criteria.q,author:criteria.author,affiliation:criteria.affiliation,
  from:criteria.from,to:criteria.to,sort:criteria.sort==="relevance"?"":criteria.sort,
  match:criteria.match==="title"?"title":"",crosslisted:criteria.crosslisted?"1":""};
 if((topic?.personal||leaf?.personal)&&!next.refine)next.refine=leaf?.name||topic.name;
 url.search=new URLSearchParams(Object.entries(next).filter(([,value])=>value));
 history.replaceState(null,"",url);
}
const personalStatus=message=>{$("personal-status").textContent=message};
function pathText(){
 return [subject?.name,topic?.name,leaf?.name,selected.refine&&!topic?selected.refine:""].filter(Boolean).join(" › ");
}
function currentPath(){
 return {...selected,refine:selected.refine||((leaf?.personal||topic?.personal)&&(leaf?.name||topic.name))||""};
}
const pathId=path=>[path.category,path.topic,path.subtopic,path.refine].join("|");
function selectPath(path){
 datePreset++;
 selected=pathFrom(path);
 drawPath();
 runSearch();
}
function drawPersonal(){
 const item=currentPath();
 const addPath=$("save-path");
 addPath.disabled=!subject||followed.some(p=>pathId(p)===pathId(item));
 addPath.textContent=subject&&addPath.disabled?"Path saved":"Save current path";
 $("custom-add").disabled=!subject||($("custom-kind").value==="subtopic"&&!topic);
 const own=personal.filter(entry=>entry.category===subject?.code);
 $("reset-custom").hidden=!own.length;
 const savedList=$("saved-paths");savedList.replaceChildren();
 for(const p of followed){
  const line=element("div",undefined,"ex-personal-row");
  const remove=button("Remove",()=>{
   const next=followed.filter(item=>item!==p);
   if(!data.write(key,{personal,followed:next,last:selected})){personalStatus("Browser storage is unavailable.");return}
   followed=next;drawPersonal();personalStatus("Saved path removed.");
  });
  remove.setAttribute("aria-label","Remove saved path "+p.label);
  line.append(button(p.label,()=>selectPath(p)),remove);savedList.append(line);
 }
 const customList=$("custom-list");customList.replaceChildren();
 for(const entry of own){
  const label=entry.leaf?entry.topic+" › "+entry.leaf:entry.topic;
  const line=element("div",undefined,"ex-personal-row");
  const remove=button("Remove",()=>{
   const next=personal.filter(row=>row!==entry&&(entry.leaf||row.category!==entry.category||row.topic!==entry.topic));
   if(!data.write(key,{personal:next,followed,last:selected})){personalStatus("Browser storage is unavailable.");return}
   personal=next;selected.refine="";rebuildIndex();drawPath();runSearch();personalStatus("Personal topic removed.");
  });
  remove.setAttribute("aria-label","Remove personal topic "+label);
  line.append(element("span",label),remove);customList.append(line);
 }
}
function drawChoices(id,rows,current,select){
 const group=$(id),shown=rows.slice(0,4);
 if(current&&!shown.some(row=>row.id===current.id))shown.push(current);
 group.hidden=!shown.length;
 group.replaceChildren(...shown.map(row=>{
  const item=button(row.name,()=>select(row),"ex-choice");
  item.setAttribute("aria-pressed",String(current?.id===row.id));
  return item;
 }));
}
function drawPath(){
 subject=subjects.byCode.get(selected.category.toLowerCase());
 const shared=[];
 if(subject&&selected.refine&&selected.topic){
  const native=atlas.catalogFor(catalog,subject,personal);
  const branch=native.find(item=>item.id===selected.topic);
  if(!branch)shared.push({category:subject.code,topic:selected.refine,leaf:""});
  else if(selected.subtopic&&!branch.leaves.some(item=>item.id===selected.subtopic))shared.push({category:subject.code,topic:branch.name,leaf:selected.refine});
 }
 topics=atlas.catalogFor(catalog,subject,[...personal,...shared]);
 topic=topics.find(row=>row.id===selected.topic);
 leaf=topic?.leaves.find(row=>row.id===selected.subtopic);
 if(catalogReady&&selected.refine&&!selected.topic){
  const id=atlas.slug(selected.refine);
  const branch=topics.find(row=>row.id===id)||topics.find(row=>row.leaves.some(child=>child.id===id));
  if(branch){topic=branch;leaf=branch.leaves.find(child=>child.id===id);selected.refine=""}
 }
 if(catalogReady){selected.topic=topic?.id||"";selected.subtopic=leaf?.id||""}
 $("field").value=subject?.code||"";
 $("topic").replaceChildren(option("",!subject?"Choose a subject first":!catalogReady?"Topic directory loading":"All topics in this subject"),...topics.map(t=>option(t.id,t.name)));
 $("topic").value=topic?.id||"";$("topic").disabled=!topics.length;
 $("subfield").replaceChildren(option("",!topic?"Choose a research topic first":!topic.leaves.length?"No sub-subtopics yet":"All sub-subtopics in this topic"),...(topic?.leaves||[]).map(l=>option(l.id,l.name)));
 $("subfield").value=leaf?.id||"";$("subfield").disabled=!topic?.leaves.length;
 drawChoices("topic-options",topics,topic,row=>selectPath({category:selected.category,topic:row.id}));
 drawChoices("subtopic-options",topic?.leaves||[],leaf,row=>selectPath({category:selected.category,topic:selected.topic,subtopic:row.id}));
 $("clear-path").disabled=!subject&&!selected.refine;
 $("scope-label").textContent=pathText()?"Scope: "+pathText():"Scope: the whole archive.";
 drawPersonal();
}
function rebuildIndex(){index=atlas.makeIndex(source,catalog,personal)}
function finderMatches(){
 return atlas.find(index,$("topic-find").value);
}
function showSuggestions(){
 const input=$("topic-find"), target=$("topic-suggestions");
 const hasQuery=Boolean(input.value.trim()), matches=finderMatches();
 target.replaceChildren();target.hidden=!hasQuery;
 $("topic-find-status").textContent=hasQuery?matches.length+" topic suggestions":"";
 for(const row of matches){
  const hit=button("",()=>{
   input.value="";showSuggestions();selectPath(row);$("field").focus();
  },"ex-suggestion");
  hit.append(element("strong",row.label),element("span",row.detail||row.category));
  target.append(hit);
 }
 if(hasQuery&&!matches.length)target.append(element("p","No matching path. You can still search the papers directly.","rd-small"));
}
function setCatalog(text){
 catalog=atlas.parse(text,source);catalogReady=true;rebuildIndex();drawPath();showSuggestions();
 const total=[...catalog.values()].flat().reduce((n,t)=>n+t.leaves.length,0);
 $("taxonomy-count").textContent=catalog.size+" "+(source==="arxiv"?"categories":"subjects")+" · "+total.toLocaleString()+" sub-subtopics";
}
function criteriaFromForm(){
 const criteria={q:clean($("query").value,220),author:clean($("author").value),affiliation:clean($("affiliation").value),
  from:$("from").value,to:$("to").value,sort:$("sort").value,match:$("match").value,crosslisted:Boolean($("crosslisted")?.checked),
  category:subject,topicTerms:atlas.terms(topic,leaf),refinement:topic?"":selected.refine};
 if(source==="biorxiv"&&subject&&!topic){
  criteria.categoryTerms=topics.flatMap(t=>[t.name,...t.leaves.map(l=>l.name)]);
 }
 return criteria;
}
function highlight(parent,value,phrases){
 const escaped=[...new Set(phrases.filter(Boolean))].filter(t=>t.length>2).slice(0,10).map(t=>t.replace(/[.*+?^$\x7b\x7d()|[\]\\]/g,"\\$&"));
 if(!escaped.length){parent.textContent=value;return}
 const pieces=value.split(new RegExp("("+escaped.join("|")+")","gi"));
 pieces.forEach((piece,i)=>parent.append(i%2?element("mark",piece):document.createTextNode(piece)));
}
function paperCard(p,c){
 const card=element("article",undefined,"rd-panel ex-paper");
 const hit=data.topicHit(p,c.topicTerms);
 const tokens=[hit?.term,...c.q.replaceAll('"',"").split(/\s+/)].filter(Boolean);
 const recordLabel=p.source==="biorxiv"&&p.version?p.recordId+" · v"+p.version:p.recordId;
 const meta=[recordLabel,p.date||(p.announcementDate?"Announced "+p.announcementDate:"Date unavailable"),p.category].filter(Boolean).join(" · ");
 card.append(element("p",meta,"rd-small"));
 const title=element("h3"),a=link("",p.url);
 highlight(a,p.title,tokens);title.append(a);card.append(title);
 if(p.authors.length)card.append(element("p",p.authors.slice(0,8).join(", ")+(p.authors.length>8?" et al.":""),"rd-small"));
 const related=hit||(source==="biorxiv"&&c.category&&!p.categories.length?data.topicHit(p,c.categoryTerms||[]):null);
 if(related){
  const note="Matched “"+related.term+"” in "+related.where+(c.category&&!p.categories.length?" · archive subject tag unavailable":"");
  card.append(element("p",note,"rd-small ex-provider-note"));
 }
 if(p.abstract){
  const details=element("details"),abstract=element("p");
  highlight(abstract,p.abstract,tokens);
  details.append(element("summary","Read abstract"),abstract);card.append(details);
 }
 const actions=element("div",undefined,"rd-actions");
 actions.append(link("Original record ↗",p.url,"rd-button"));
 if(p.pdf)actions.append(link("PDF ↗",p.pdf,"rd-button"));
 if(source==="arxiv")actions.append(link("Paper workspace","./paper.html?id="+encodeURIComponent(p.recordId),"rd-button"));
 const save=button(data.saved(p)?"Saved to Library":"Save to Library",()=>{
  save.disabled=data.save(p);save.textContent=save.disabled?"Saved to Library":"Browser storage unavailable";
 });
 save.disabled=data.saved(p);actions.append(save);
 if(p.abstract&&window.AxiovoAbstractAudio)actions.append(button("Listen to abstract",()=>window.AxiovoAbstractAudio.play([p])));
 const compare=button(data.comparison().some(item=>data.recordKey(item)===data.recordKey(p))?"In comparison":"Add to comparison",()=>{
  const result=data.addComparison(p);
  compare.textContent=result==="added"?"In comparison":result==="full"?"Shortlist full (3 papers)":"Browser storage unavailable";
 });
 actions.append(compare);card.append(actions);window.AxiovoAuthorFollow?.attach(card,p.authors);return card;
}
function filtered(state){
 const groups=(state.complete?[state.batch]:[state.local,state.batch,state.remote]).map(records=>data.filter(records,state.criteria));
 return data.filter(data.merge(...groups),state.criteria);
}
function drawResults(state){
 if(state!==search)return;
 const rows=filtered(state),results=$("results"),actions=$("result-actions"),c=state.criteria;
 $("result-count").textContent=rows.length.toLocaleString()+" matching "+name+" record"+(rows.length===1?"":"s")+(state.loading?" · checking source…":"");
 $("sync-status").textContent=state.message;
 $("match-details").hidden=!c.topicTerms.length;
 $("match-terms").textContent=c.topicTerms.length?"Papers match at least one of these terms in the title or abstract: "+c.topicTerms.join(" · ")+".":"";
 results.replaceChildren(...rows.slice(0,state.visible).map(p=>paperCard(p,c)));actions.replaceChildren();
 if(!rows.length&&!state.loading){
  const note=state.complete?"No papers in the verified dates match these filters.":"No matches in the available records for this search.";
  results.append(element("p",note,"rd-panel rd-small"));
  if(c.from||c.to)actions.append(button("Search any date",()=>{$("from").value=$("to").value="";runSearch()}));
  if(leaf)actions.append(button("Search the parent topic",()=>selectPath({...selected,subtopic:"",refine:""})));
 }
 if(rows.length>state.visible)actions.append(button("Show more matches",()=>{
  const previous=state.visible;state.visible+=12;drawResults(state);results.children[previous]?.querySelector("h3 a")?.focus();
 }));
 if(state.next!=null&&!state.loading)actions.append(button("Load more from source",()=>loadLive(state,true)));
 if(state.failed&&!state.loading)actions.append(button("Retry live source",()=>loadLive(state,state.next!=null)));
 actions.append(link("Search official "+name+" ↗",data.sourceLink(source,c),"rd-button"));
}
function useSnapshot(state,snapshot){
 state.local=snapshot.papers;
 const authors=[...new Set(snapshot.papers.slice(0,550).flatMap(p=>p.authors.slice(0,3)))].sort((a,b)=>a.localeCompare(b));
 $("author-options").replaceChildren(...authors.slice(0,850).map(a=>option(a,a)));
 drawResults(state);
}
async function loadLive(state,more=false){
 const signal=state.controller.signal,c=state.criteria;
 if(signal.aborted)return;
 state.loading=true;state.failed=false;state.message=state.coverage+"Checking live "+name+" metadata…";drawResults(state);
 const cursor=more?state.next:null;
 try{
  const result=await data.live(source,c,signal,cursor);
  if(signal.aborted)return;
  const page=data.filter(result.papers,c);
  state.remote=more?data.merge(state.remote,page):page;
  state.next=result.next===cursor?null:result.next;
  if(more)state.visible+=12;
  const fallbackCategory=c.category&&source==="biorxiv"&&(c.topicTerms.length||c.q||c.author||c.refinement);
  const categoryNote=fallbackCategory?" bioRxiv papers without a subject tag are checked using topical evidence.":c.category&&source==="chemrxiv"?" Chemistry subject matches use topic terms when Crossref omits subject tags.":"";
  state.message=state.coverage+result.provider+". Coverage is limited to the records currently indexed or loaded."+categoryNote;
 }catch{
  if(signal.aborted)return;
  state.failed=true;
  state.message=state.coverage+"The live source could not be reached. Available snapshots are shown, and you can retry the source.";
 }
 state.loading=false;drawResults(state);
}
async function runSearch({persist=true}={}){
 const c=criteriaFromForm();
 search?.controller.abort();
 if(c.from&&c.to&&c.from>c.to||c.from>allDates()||c.to>allDates()){
  $("result-count").textContent="Choose valid dates";
  $("sync-status").textContent="The start must be on or before the end, and the dates cannot be in the future.";
  return;
 }
 const {arxiv,doi}=data.identifier(c.q);
 const exact=Boolean(arxiv||doi);
 if(exact){
  Object.assign(c,{category:null,topicTerms:[],refinement:"",from:"",to:"",author:"",affiliation:"",crosslisted:false});
  $("scope-label").textContent="Scope: exact identifier in "+name+".";
 }else $("scope-label").textContent=pathText()?"Scope: "+pathText():"Scope: the whole archive.";
 if(persist){savePrefs();syncURL(criteriaFromForm())}
 const state=search={controller:new AbortController(),criteria:c,local:[],batch:[],remote:[],visible:12,next:null,
  loading:true,failed:false,complete:false,coverage:"",message:"Checking available records…"};
 drawResults(state);
 if(arxiv&&source!=="arxiv"||doi&&(source==="arxiv"||source==="biorxiv"&&!/^10\.(?:1101|64898)\//.test(doi)||source==="chemrxiv"&&!doi.startsWith("10.26434/"))){
  state.loading=false;state.message="This identifier belongs outside the selected archive. Switch archives using the links at the top.";drawResults(state);return;
 }
 const local=data.snapshot(source).then(snapshot=>{
  if(!state.controller.signal.aborted&&!state.complete)useSnapshot(state,snapshot);
 });
 let batch=null;
 if(source==="arxiv"){
  try{batch=await data.datedArxiv(c,state.controller.signal)}catch{}
 }
 if(state.controller.signal.aborted)return;
 if(batch){
  state.batch=batch.papers;
  state.complete=batch.complete;
  state.coverage=batch.complete?"":batch.reason+" ";
  if(batch.complete){
   state.loading=false;state.message=batch.reason+" Dates are first submissions in UTC.";drawResults(state);return;
  }
 }else if(source==="arxiv"&&(c.from||c.to)){
  state.coverage="A complete date batch is available only for fully harvested ranges of up to 31 days. ";
 }
 await Promise.all([local,loadLive(state)]);
}

for(const [group,rows] of subjects.groups){
 const optgroup=element("optgroup");optgroup.label=group;
 optgroup.append(...rows.map(row=>option(row.code,row.name+(row.legacy?" (historical)":source==="arxiv"&&!row.codes?" · "+row.code:""))));
 $("field").append(optgroup);
}
$("field").onchange=()=>selectPath({category:$("field").value});
$("topic").onchange=()=>selectPath({category:selected.category,topic:$("topic").value});
$("subfield").onchange=()=>selectPath({category:selected.category,topic:selected.topic,subtopic:$("subfield").value});
$("clear-path").onclick=()=>selectPath({});
$("topic-find").oninput=showSuggestions;
$("topic-finder").onsubmit=e=>{
 e.preventDefault();
 const row=finderMatches()[0];
 if(row){$("topic-find").value="";showSuggestions();selectPath(row)}
};
$("topic-find").onkeydown=e=>{
 if(e.key==="Escape"){$("topic-find").value="";showSuggestions()}
 if(e.key==="ArrowDown"&&!$("topic-suggestions").hidden){e.preventDefault();$("topic-suggestions").querySelector("button")?.focus()}
};
$("search-form").onsubmit=e=>{e.preventDefault();datePreset++;runSearch()};
$("sort").onchange=()=>{datePreset++;runSearch()};
$("date-open").onclick=()=>{$("advanced").open=true;$("from").focus()};
$("latest").onclick=()=>{
 datePreset++;$("from").value=$("to").value="";$("sort").value="recent";runSearch();
};
$("latest-verified")?.addEventListener("click",async()=>{
 const stamp=++datePreset;
 const control=$("latest-verified");
 control.disabled=true;
 try{
  const response=await fetch("./data/arxiv-days/manifest.json",{signal:AbortSignal.timeout(6500)});
  if(!response.ok)throw Error("Manifest unavailable");
  const manifest=await response.json();
  if(stamp!==datePreset)return;
  const latest=Object.entries(manifest.days||{}).filter(([,row])=>row?.complete&&row.count>0)
   .map(([day])=>day).sort().at(-1);
  if(!latest)throw Error("No verified dates");
  $("from").value=$("to").value=latest;$("advanced").open=true;runSearch();
 }catch{
  if(stamp==datePreset)$("sync-status").textContent="No verified day is available right now. Use Latest papers to browse indexed records.";
 }finally{control.disabled=false}
});
$("week").onclick=()=>{
 datePreset++;
 const end=source==="arxiv"?shiftDate(allDates(),-1):allDates();
 $("from").value=shiftDate(end,-6);$("to").value=end;$("advanced").open=true;runSearch();
};
$("custom-kind").onchange=drawPersonal;
$("custom-form").onsubmit=e=>{
 e.preventDefault();
 const value=clean($("custom").value,85),id=atlas.slug(value),child=$("custom-kind").value==="subtopic";
 if(!subject||!id||child&&!topic)return;
 if(personal.length>=100){personalStatus("Remove a personal topic before adding another.");return}
 if(child?topic.leaves.some(row=>row.id===id):topics.some(row=>row.id===id)){personalStatus("That name is already in this path.");return}
 const entry={category:subject.code,topic:child?topic.name:value,leaf:child?value:""};
 const next=[...personal,entry];
 if(!data.write(key,{personal:next,followed,last:selected})){personalStatus("Browser storage is unavailable.");return}
 personal=next;$("custom").value="";rebuildIndex();selectPath({category:subject.code,topic:child?topic.id:id,subtopic:child?id:""});personalStatus("Personal topic added.");
};
$("reset-custom").onclick=()=>{
 const next=personal.filter(entry=>entry.category!==subject?.code);
 if(!data.write(key,{personal:next,followed,last:selected})){personalStatus("Browser storage is unavailable.");return}
 personal=next;selected.refine="";rebuildIndex();drawPath();runSearch();personalStatus("Personal topics for this subject reset.");
};
$("save-path").onclick=()=>{
 if(!subject)return;
 if(followed.length>=30){personalStatus("Remove a saved path before adding another.");return}
 const next=[...followed,{...currentPath(),label:pathText()}];
 if(!data.write(key,{personal,followed:next,last:selected})){personalStatus("Browser storage is unavailable.");return}
 followed=next;drawPersonal();personalStatus("Research path saved on this device.");
};
drawPath();rebuildIndex();
fetch("./data/topics/"+source+".tsv",{signal:AbortSignal.timeout(6500)})
 .then(response=>{if(!response.ok)throw Error("Topic directory unavailable");return response.text()})
 .then(setCatalog)
 .catch(()=>{$("taxonomy-count").textContent="Topic directory unavailable · subject search is still available";$("topic").options[0].textContent="Topic directory unavailable"})
 .finally(()=>{
  const needsBioScope=source==="biorxiv"&&selected.category&&($("query").value||$("author").value);
  if(!search||selected.topic||selected.refine||needsBioScope)runSearch({persist:false});
 });
if(!selected.topic&&!selected.refine)runSearch({persist:false});
})();
