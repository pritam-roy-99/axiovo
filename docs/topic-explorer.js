/* A single archive explorer with linked subject, topic and sub-subtopic search. */
(function(){
"use strict";
const source=document.body.dataset.exploreSource;
const data=window.AxiovoArchiveData, atlas=window.AxiovoTopicAtlas;
if(!data||!atlas||!Object.hasOwn(data.names,source))return;
const name=data.names[source], $=id=>document.getElementById("archive-"+id);
const key="axiovo-topic-explorer-"+source+"-v1";
const subjects=atlas.subjects(source);
const researchPickers=[];
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
// A date-only or sorting deep link must not erase the last selected research
// path. Explicit category links, including an empty category, take precedence.
const hasPathOverride=["category","topic","subtopic","refine"].some(k=>params.has(k));
let selected=pathFrom(hasPathOverride?Object.fromEntries(params):stored?.last);
let catalog=new Map(), catalogReady=false, index=[], topics=[], topic, leaf, subject;
let search=null, datePreset=0;
let viewMode=params.get("mode")==="indexed"?"indexed":"recent";
const recentWindow=()=>({from:shiftDate(allDates(),-6),to:allDates()});
const initialSort=params.get("sort");
$("sort").value=["recent","oldest","cited"].includes(initialSort)?initialSort:"relevance";
$("match").value=params.get("match")==="title"?"title":"metadata";
$("query").value=clean(params.get("q")||params.get("query"),220);
for(const field of ["author","affiliation","from","to"])$(field).value=clean(params.get(field));
if(params.get("date"))$("from").value=$("to").value=params.get("date");
if($("crosslisted"))$("crosslisted").checked=params.get("crosslisted")==="1";
if($("author").value||$("from").value||$("to").value||$("affiliation").value)$("advanced").open=true;
for(const field of ["from","to"])$(field).max=allDates();

function savePrefs(){
 const existing=data.read(key,{});
 return data.write(key,{...existing,last:selected});
}
function syncURL(criteria){
 const url=new URL(location.href);
 const next={...selected,q:criteria.q,author:criteria.author,affiliation:criteria.affiliation,
  from:$("from").value,to:$("to").value,
  mode:!$("from").value&&!$("to").value?(viewMode==="indexed"?"indexed":source==="arxiv"?"":"recent"):"",
  sort:criteria.sort==="relevance"?"":criteria.sort,
  match:criteria.match==="title"?"title":"",crosslisted:criteria.crosslisted?"1":""};
 if((topic?.personal||leaf?.personal)&&!next.refine)next.refine=leaf?.name||topic.name;
 url.search=new URLSearchParams(Object.entries(next).filter(([,value])=>value));
 history.replaceState(null,"",url);
}
function syncAnnouncementURL(criteria){
 const url=new URL(location.href);
 const next={...currentPath(),announced:"latest",q:criteria.q,author:criteria.author,
  affiliation:criteria.affiliation,sort:criteria.sort==="recent"?"":criteria.sort,
  match:criteria.match==="title"?"title":"",crosslisted:criteria.crosslisted?"1":""};
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
function shouldBrowseAnnouncements(){
 if(source!=="arxiv"||$("from").value||$("to").value)return false;
 if(viewMode==="indexed")return false;
 const id=data.identifier($("query").value);
 return !id.arxiv&&!id.doi;
}
function selectPath(path){
 // Keep selected subject/subtopic within the official release if that is
 // what the researcher is browsing. Category selection is not a date change.
 const inRelease=source==="arxiv"&&search?.announcementOnly;
 if(!inRelease)datePreset++;
 selected=pathFrom(path);
 // Changing the research path retains the explicitly chosen date/search mode.
 drawPath();
 if(inRelease&&!$("from").value&&!$("to").value){
  search.criteria=criteriaFromForm();search.visible=12;
  savePrefs();syncAnnouncementURL(search.criteria);drawResults(search);
 }else if(shouldBrowseAnnouncements())showLatestAnnouncement();
 else runSearch();
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
 for(const picker of researchPickers)picker.sync();
 drawChoices("topic-options",topics,topic,row=>selectPath({category:selected.category,topic:row.id}));
 drawChoices("subtopic-options",topic?.leaves||[],leaf,row=>selectPath({category:selected.category,topic:selected.topic,subtopic:row.id}));
 $("clear-path").disabled=!subject&&!selected.refine;
 $("scope-label").textContent=search?.announcementOnly?"Scope: latest official announcement · "+(pathText()||"all arXiv categories")+".":pathText()?"Scope: "+pathText():"Scope: the whole archive.";
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
   input.value="";showSuggestions();selectPath(row);
   if(researchPickers.length)researchPickers[0].focus();else $("field").focus();
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
 const releaseView=Boolean(search?.announcementOnly&&source==="arxiv");
 const meta=[recordLabel,
  ...(releaseView?["Announced "+(p.announcementDate||"date unavailable")+" (US Eastern)",
    p.date?"First submitted "+p.date+" (UTC)":"First-submission date unavailable"]:
   [p.date?(p.source==="arxiv"?"First submitted "+p.date+" (UTC)":"Posted "+p.date):
    p.announcementDate?"Announced "+p.announcementDate:"Date unavailable"]),
  p.category].filter(Boolean).join(" · ");
 card.append(element("p",meta,"rd-small"));
 if(Number.isFinite(p.citations)&&p.citations>=0)card.append(element("p","Cited by "+p.citations.toLocaleString()+" (available source metadata)","rd-small"));
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
 if(source==="arxiv"){
  const id=encodeURIComponent(p.recordId);
  actions.append(link("Paper workspace","./paper.html?id="+id,"rd-button"));
  actions.append(link("Research Assistant","./copilot.html?id="+id,"rd-button"));
 }
 const save=button(data.saved(p)?"Saved to Library":"Save to Library",()=>{
  save.disabled=data.save(p);save.textContent=save.disabled?"Saved to Library":"Browser storage unavailable";
 });
 save.disabled=data.saved(p);actions.append(save);
 // Public GitHub Issues is the feedback queue. Nothing is submitted until
 // the reporter reviews and files the issue themselves.
 const reportUrl="https://github.com/pritam-roy-99/axiovo/issues/new?"+
  new URLSearchParams({
   title:"Incorrect topic classification: "+p.recordId,
   body:"Paper source: "+p.url+"\nArchive: "+p.source+"\nDisplayed topic: "+pathText()+
    "\n\nSuggested correction:\n\nReason or evidence:"
  });
 const report=link("Report wrong topic ↗",reportUrl,"rd-button rd-secondary");
 report.title="Review and submit a public topic correction via GitHub Issues";
 actions.append(report);
 if(p.abstract&&window.AxiovoAbstractAudio)actions.append(button("Listen to abstract",()=>window.AxiovoAbstractAudio.play([p])));
 const compare=button(data.comparison().some(item=>data.recordKey(item)===data.recordKey(p))?"In comparison":"Add to comparison",()=>{
  const result=data.addComparison(p);
  compare.textContent=result==="added"?"In comparison":result==="full"?"Shortlist full (5 papers)":"Browser storage unavailable";
 });
 actions.append(compare);
 const relationAPI=window.AxiovoPaperRelations;
 if(relationAPI){
  const relatedButton=button("Related literature",()=>{
   let details=card.querySelector(".axiovo-related-literature");
   if(details){details.remove();relatedButton.setAttribute("aria-expanded","false");return}
   details=element("section",undefined,"axiovo-related-literature");
   details.setAttribute("aria-label","Metadata-related papers");
   details.append(element("p","Suggestions from available source records, not a complete citation graph.","rd-small"));
   const candidates=data.merge(search?.local||[],search?.batch||[],search?.remote||[]);
   const matches=relationAPI.related(p,candidates,3);
   if(!matches.length)details.append(element("p","No strong related-paper matches in the records already loaded. Broaden the search to discover more.","rd-small"));
   for(const item of matches){
    const row=element("div",undefined,"rd-small");
    row.append(link(item.paper.title,item.paper.url));
    row.append(element("span"," · Shared terms: "+item.reasons.join(", ")));
    details.append(row);
   }
   card.append(details);relatedButton.setAttribute("aria-expanded","true");
  });
  relatedButton.setAttribute("aria-expanded","false");
  relatedButton.setAttribute("aria-label","Show source-backed related papers for "+p.title);
  actions.append(relatedButton);
 }
 card.append(actions);window.AxiovoCitationEvidence?.add(card,p);window.AxiovoAuthorFollow?.attach(card,p.authors);
 window.AxiovoTopicReport?.attach(card,p,pathText());return card;
}
function filtered(state){
 // Merge source records first, then score and sort once. Filtering each source
 // separately creates redundant full-text passes and blocks mobile scrolling.
 const groups=state.complete?[state.batch]:[state.local,state.batch,state.remote];
 return data.filter(data.merge(...groups),state.criteria);
}
function drawResults(state){
 if(state!==search)return;
 if(state.announcementOnly)$("scope-label").textContent="Scope: latest official announcement · "+(pathText()||"all arXiv categories")+".";
 const c=state.criteria,sorter=$("result-sort");
 if(state.recentOnly)$("scope-label").textContent="Scope: latest 7 source-posting days ("+c.from+" to "+c.to+") · "+(pathText()||"all "+name+" topics")+".";
 if(!state.announcementOnly&&source==="arxiv"&&!c.from&&!c.to){
  $("scope-label").textContent="Scope: indexed metadata across available years · "+(pathText()||"all arXiv categories")+".";
 }
 if(sorter&&sorter.value!==c.sort)sorter.value=c.sort||"relevance";
 const rows=filtered(state),results=$("results"),actions=$("result-actions");
 if($("sort-note"))$("sort-note").textContent=window.AxiovoPaperSort?.note(rows,c.sort)||"";
 $("result-count").textContent=rows.length.toLocaleString()+" matching "+name+" record"+(rows.length===1?"":"s")+
  (state.announcementOnly?" · latest official announcement":state.recentOnly?" · latest 7 days":source==="arxiv"&&!c.from&&!c.to?" · indexed search across available years":"")+
  (state.loading?" · checking source…":"");
 $("sync-status").textContent=state.message;
 $("match-details").hidden=!c.topicTerms.length;
 $("match-terms").textContent=c.topicTerms.length?"Papers match at least one of these terms in the title or abstract: "+c.topicTerms.join(" · ")+".":"";
 results.replaceChildren(...rows.slice(0,state.visible).map(p=>paperCard(p,c)));actions.replaceChildren();
 if(!rows.length&&!state.loading){
  const note=state.announcementOnly?"No papers in the latest available arXiv announcement match this selected field or topic. Try the parent topic or check source coverage.":state.recentOnly?"No matching papers in the latest 7 days of available "+name+" source metadata. This does not mean the archive has no papers. Try another date range.":state.complete?"No papers in the verified dates match these filters.":"No matches in the available records for this search.";
  results.append(element("p",note,"rd-panel rd-small"));
  if(state.recentOnly)actions.append(button("Search indexed history for this topic",()=>{viewMode="indexed";runSearch()}));
  else if(c.from||c.to)actions.append(button("Search any date",()=>{$("from").value=$("to").value="";viewMode="indexed";runSearch()}));
  if(leaf)actions.append(button("Search the parent topic",()=>selectPath({...selected,subtopic:"",refine:""})));
  if(subject||topic||selected.refine)actions.append(button("Broaden across all "+name+" subjects",()=>{
   selected=pathFrom({});
   drawPath();
   datePreset++;
   runSearch();
  }));
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
 let checked=0, page=[], provider="";
 const seen=new Set();
 let next=cursor;
 try{
  // Keep each successful page even if a later request fails.
  do{
   seen.add(String(next));
   const result=await data.live(source,c,signal,next);
   if(signal.aborted)return;
   provider=result.provider;
   page=data.merge(page,data.filter(result.papers,c));
   checked++;
   next=seen.has(String(result.next))?null:result.next;
   state.next=next;
   state.remote=data.merge(state.remote,page);
   drawResults(state);
  }while(page.length<12&&next!=null&&checked<4);
  const fallbackCategory=c.category&&source==="biorxiv"&&(c.topicTerms.length||c.q||c.author||c.refinement);
  const categoryNote=fallbackCategory?" bioRxiv papers without a subject tag are checked using topical evidence.":c.category&&source==="chemrxiv"?" Chemistry subject matches use topic terms when Crossref omits subject tags.":"";
  state.message=state.coverage+provider+" · "+checked+" source page"+(checked===1?"":"s")+" checked · "+page.length+" matching record"+(page.length===1?"":"s")+" retrieved"+(next!=null?" · More pages available.":" · Source pagination exhausted.")+" Coverage may be partial."+categoryNote;
 }catch{
  if(signal.aborted)return;
  state.failed=true;
  state.message=state.coverage+"The live source could not be reached. Earlier results are available, and you can retry the source.";
 }
 if(more&&checked)state.visible+=12;
 state.loading=false;drawResults(state);
}
/* Official arXiv announcement dates differ from UTC first-submission dates.
 * Apply the selected hierarchy to the official announced batch.
 */
async function showLatestAnnouncement(){
 if(source!=="arxiv")return;
 const stamp=++datePreset;
 viewMode="recent";
 search?.controller.abort();
 // Announcement filtering must never apply first-submission-day inputs.
 $("from").value="";$("to").value="";
 $("sort").value="recent";
 const c=criteriaFromForm();
 savePrefs();syncAnnouncementURL(c);
 $("scope-label").textContent="Scope: latest official announcement · "+(pathText()||"all arXiv categories")+".";
 const state=search={controller:new AbortController(),criteria:c,local:[],batch:[],remote:[],visible:12,next:null,
  loading:true,failed:false,complete:false,mode:"announcement",announcementOnly:true,
  coverage:"",message:"Loading latest official arXiv papers for the selected research scope…"};
 drawResults(state);
 try{
  const batch=await data.latestArxivAnnouncement(state.controller.signal);
  if(stamp!==datePreset||state!==search||state.controller.signal.aborted)return;
  state.local=batch.papers;
  state.loading=false;
  state.complete=false;
  const early=String(batch.source||"").includes("arxiv.org/catchup/");
  state.message=(early?"Official arXiv early catch-up release: ":"Official arXiv release: ")+batch.date+
    " · "+batch.papers.length.toLocaleString()+" source-linked records."+
    (early?" Preliminary source listing before midnight US Eastern RSS refresh; completeness not yet verified.":
      batch.complete?" All official archive RSS feeds were verified.":" Partial source coverage; not all archive feeds were verified.")+
    " This is the announcement date, not the first-submission date.";
  drawResults(state);
  $("results-heading").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(e){
  if(stamp!==datePreset||state!==search||state.controller.signal.aborted)return;
  state.loading=false;state.failed=false;
  state.message="Could not load the official announced release. Please retry or open the original arXiv listing.";
  drawResults(state);
  $("result-actions").prepend(button("Retry today's release",showLatestAnnouncement));
 }
}
async function runSearch({persist=true}={}){
 const c=criteriaFromForm();
 const idForScope=data.identifier(c.q);
 const hasExact=Boolean(idForScope.arxiv||idForScope.doi);
 const recentOnly=(source==="biorxiv"||source==="chemrxiv")&&viewMode!=="indexed"&&
  !c.from&&!c.to&&!hasExact;
 if(recentOnly){
  Object.assign(c,recentWindow(),{sort:c.sort==="relevance"?"recent":c.sort,recentOnly:true});
  $("sort").value=c.sort;
 }
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
 const isHistorical=c.from===data.historicalStart[source]&&!!c.to;
 const state=search={controller:new AbortController(),criteria:c,local:[],batch:[],remote:[],visible:12,next:null,
  loading:true,failed:false,complete:false,mode:recentOnly?"recent":"indexed",recentOnly,
  coverage:isHistorical?"Historical-year search: provider pages are sampled incrementally; results are not a full historical census. ":"",
  message:recentOnly?"Checking "+name+" records posted during the last 7 days; live coverage can be partial…":source==="arxiv"&&!c.from&&!c.to?"Searching indexed arXiv metadata across available years (not the latest announcement)…":"Checking available records…"};
 drawResults(state);
 if(arxiv&&source!=="arxiv"||doi&&(source==="arxiv"||source==="biorxiv"&&!/^10\.(?:1101|64898)\//.test(doi)||source==="chemrxiv"&&!doi.startsWith("10.26434/"))){
  state.loading=false;state.message="This identifier belongs outside the selected archive. Switch archives using the links at the top.";drawResults(state);return;
 }
 const local=data.snapshot(source).then(snapshot=>{
  if(!state.controller.signal.aborted&&!state.complete)useSnapshot(state,snapshot);
 }).catch(()=>{});
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
$("show-results").onclick=()=>{
  if(search?.announcementOnly&&!$("from").value&&!$("to").value){
   search.criteria=criteriaFromForm();search.visible=12;
   savePrefs();syncAnnouncementURL(search.criteria);drawResults(search);
  }else if(shouldBrowseAnnouncements())showLatestAnnouncement();
  else{datePreset++;runSearch()}
 const heading=$("results-heading");
 if(!heading)return;
 heading.setAttribute("tabindex","-1");
 heading.scrollIntoView({behavior:"smooth",block:"start"});
 heading.focus({preventScroll:true});
};
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
$("search-form").onsubmit=e=>{
 e.preventDefault();
 if(search?.announcementOnly&&!search.loading&&!$("from").value&&!$("to").value&&
    !data.identifier($("query").value).arxiv&&!data.identifier($("query").value).doi){
  search.criteria=criteriaFromForm();search.visible=12;
   savePrefs();syncAnnouncementURL(search.criteria);drawResults(search);
  }else if(shouldBrowseAnnouncements())showLatestAnnouncement();
  else{if(data.identifier($("query").value).arxiv||data.identifier($("query").value).doi)viewMode="indexed";datePreset++;runSearch()}
};
function changeSort(mode){
 $("sort").value=mode;
 if($("result-sort"))$("result-sort").value=mode;
 if(search?.announcementOnly||search?.complete){
  search.criteria={...search.criteria,sort:mode};
  search.visible=12;
  if(search.announcementOnly)syncAnnouncementURL(criteriaFromForm());
   else syncURL(criteriaFromForm());
   drawResults(search);
 }else{datePreset++;runSearch()}
}
$("sort").onchange=()=>changeSort($("sort").value);
$("date-open").onclick=()=>{$("advanced").open=true;$("from").focus()};
$("history")?.addEventListener("click",()=>{
 // Earliest available archive dates are lower bounds, not claims of completeness.
 datePreset++;
 const years=data.historyRange(source,allDates());
 viewMode="indexed";
 $("from").value=years.from;
 $("to").value=years.to;
 $("sort").value=$("query").value.trim()?"relevance":"oldest";
 $("advanced").open=true;
 runSearch();
});

$("announced")?.addEventListener("click",showLatestAnnouncement);
$("latest").onclick=()=>{
 datePreset++;$("from").value=$("to").value="";$("sort").value="recent";
 viewMode=source==="arxiv"?"indexed":"recent";runSearch();
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
  viewMode="indexed";$("from").value=$("to").value=latest;$("advanced").open=true;runSearch();
 }catch{
  if(stamp==datePreset)$("sync-status").textContent="No verified day is available right now. Use Latest papers to browse indexed records.";
 }finally{control.disabled=false}
});
$("week").onclick=()=>{
 viewMode="recent";
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
const sortSelection=$("result-sort");
if(sortSelection){
 sortSelection.value=$("sort").value;
 sortSelection.addEventListener("change",()=>changeSort(sortSelection.value));
}
if(window.AxiovoSearchableSelect){
 for(const [id,hint] of [["field","Type a subject or category code"],["topic","Type a research subfield"],
  ["subfield","Type a subtopic"]]){
  researchPickers.push(window.AxiovoSearchableSelect.mount($(id),hint));
 }
}
drawPath();rebuildIndex();
fetch("./data/topics/"+source+".tsv",{signal:AbortSignal.timeout(6500)})
 .then(response=>{if(!response.ok)throw Error("Topic directory unavailable");return response.text()})
 .then(setCatalog)
 .catch(()=>{
  $("taxonomy-count").textContent="Topic directory unavailable · subject search is still available";
  $("topic").options[0].textContent="Topic directory unavailable";
  for(const picker of researchPickers)picker.sync();
 })
 .finally(()=>{
  const needsBioScope=source==="biorxiv"&&selected.category&&($("query").value||$("author").value);
  if(source==="arxiv"){
   if((params.get("announced")==="latest"||(!params.has("mode")&&shouldBrowseAnnouncements()))&&
      !$("from").value&&!$("to").value)showLatestAnnouncement();
   else runSearch({persist:false});
  }else if(!search||selected.topic||selected.refine||needsBioScope)runSearch({persist:false});
 });
if(source!=="arxiv"&&!selected.topic&&!selected.refine)runSearch({persist:false});
})();
