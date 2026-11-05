/* Dedicated archive discovery, including verified arXiv submission batches. */
(function(){
"use strict";
const source=document.body.dataset.archive;
const taxonomy=window.AxiovoArchiveTaxonomy;
const data=window.AxiovoArchiveData;
const definition=taxonomy?.[source];
if(!definition||!data)return;
const $=id=>document.getElementById(id);
const make=(tag,value,cls)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;if(cls)node.className=cls;return node};
const memory="axiovo-browser-state-"+source,customKey="axiovo-custom-fields-"+source;
const defaults={topic:0,field:0,subfield:"",query:"",author:"",affiliation:"",scope:"all",sort:"recent",from:"",to:""};
const url=new URL(location.href),linked=url.searchParams;
const state={...defaults,...(linked.size?{}:data.read(memory,{}))};
let custom=data.read(customKey,{}),controller,criteria,result=[],visible=20,next=null,status="",fetching=false;
const directory=taxonomy.directory(source);
const group=()=>definition.groups[Number(state.topic)]||definition.groups[0];
const area=()=>group().areas[Number(state.field)]||group().areas[0];
const userSubs=()=>Array.isArray(custom[area().code])?custom[area().code]:[];
const subs=()=>[...area().subfields,...userSubs().map(name=>({name,code:name}))];

function selectCategory(row){
 Object.assign(state,{topic:row.topic,field:row.field,subfield:row.subfield,scope:"subfield"});
}
if(linked.has("category")){
 const code=linked.get("category");
 const areas=definition.groups.flatMap((g,topic)=>g.areas.map((a,field)=>({...a,topic,field,subfield:""})));
 const row=[...directory,...areas].find(x=>data.simple(x.code)===data.simple(code));
 if(row)selectCategory(row);
}
for(const key of ["author","affiliation","from","to","sort"])if(linked.has(key))state[key]=linked.get(key).slice(0,120);
state.query=(linked.get("q")||linked.get("query")||state.query).slice(0,300);
if(linked.has("date"))state.from=state.to=linked.get("date");
if(!definition.groups[state.topic])state.topic=0;
if(!group().areas[state.field])state.field=0;

function remember(){data.write(memory,state)}
function option(value,label){const node=make("option",label);node.value=value;return node}
function fill(select,rows,value){select.replaceChildren(...rows.map(row=>option(row.code,row.name)));select.value=value}
function button(label,fn,cls){
 const node=make("button",label,cls);node.type="button";node.onclick=fn;return node;
}
function link(label,href,cls){
 const node=make("a",label,cls);node.href=href;
 if(href.startsWith("https:")){node.target="_blank";node.rel="noopener noreferrer"}
 return node;
}
function applyFilters(){
 for(const key of ["scope","sort","from","to","author","affiliation"])$("archive-"+key).value=state[key];
 $("archive-query").value=state.query;
}
function selectAndSearch(){
 state.scope="subfield";$("archive-scope").value=state.scope;
 renderTaxonomy();search();
}
function renderTaxonomy(){
 if(!subs().some(x=>x.code===state.subfield))state.subfield="";
 fill($("archive-topic"),definition.groups.map((g,i)=>({code:i,name:g.label})),state.topic);
 fill($("archive-field"),group().areas.map((a,i)=>({code:i,name:a.name+(a.legacy?" (historical)":"")})),state.field);
 const official=subs().filter(x=>x.official),refinements=subs().filter(x=>!x.official);
 const picker=$("archive-subfield");
 picker.replaceChildren(option("","All "+area().name));
 for(const [label,choices] of [["Official categories",official],["Search refinements",refinements]]){
  if(!choices.length)continue;
  const set=make("optgroup");set.label=label;set.append(...choices.map(x=>option(x.code,x.name)));picker.append(set);
 }
 picker.value=state.subfield;
 const chips=$("archive-category-list");chips.replaceChildren();
 if(source==="arxiv"&&group().areas.length>1)for(const [i,item] of group().areas.entries()){
  const chip=button(item.name,()=>{Object.assign(state,{field:i,subfield:""});selectAndSearch()});
  chip.setAttribute("aria-pressed",String(i===Number(state.field)&&state.scope==="subfield"));chips.append(chip);
 }
 const own=$("archive-custom-list");own.replaceChildren();
 for(const name of userSubs()){
  const item=button(name+" ×",()=>{
   custom[area().code]=userSubs().filter(x=>x!==name);data.write(customKey,custom);
   if(state.subfield===name){state.subfield="";selectAndSearch()}else renderTaxonomy();
  });
  item.setAttribute("aria-label","Remove "+name);own.append(item);
 }
}
function renderDirectory(){
 const q=data.simple($("archive-category-query").value);
 const matches=directory.filter(x=>!q||q.split(" ").every(word=>data.simple(x.name+" "+x.code+" "+x.group+" "+x.area).includes(word)));
 $("archive-category-count").textContent=matches.length+" of "+directory.length+" listed "+(source==="arxiv"?"categories":"subjects");
 $("archive-category-matches").replaceChildren(...matches.map(row=>{
  const label=row.name+(source==="arxiv"?" · "+row.code:row.legacy?" · historical":"");
  return button(label,()=>{selectCategory(row);$("archive-directory").open=false;selectAndSearch();$("archive-query").focus()});
 }));
}
function criteriaFromForm(){
 const selected=subs().find(x=>x.code===state.subfield);
 const codes=area().subfields.filter(x=>x.official).map(x=>x.code);
 const category=state.scope==="all"?null:selected?.official?{name:selected.name,code:selected.code}:
  {name:area().name,code:area().code,...(codes.length?{codes}:{})};
 return {q:state.query,author:state.author,affiliation:state.affiliation,from:state.from,to:state.to,sort:state.sort,category,
  refinement:state.scope==="subfield"&&!selected?.official?state.subfield:""};
}
function updateURL(){
 const params=new URLSearchParams();
 for(const [name,value] of Object.entries({q:state.query,author:state.author,affiliation:state.affiliation,from:state.from,to:state.to,sort:state.sort==="recent"?"":state.sort,category:criteria.category?.code,refine:criteria.refinement}))if(value)params.set(name,value);
 const target=new URL(location.href);target.search=params;history.replaceState(null,"",target);
}
function paperCard(p){
 const article=make("article",undefined,"axiovo-result-card");
 const line=[p.recordId,p.date||"Date unavailable",p.category,p.provenance].filter(Boolean).join(" · ");
 article.append(make("p",line,"axiovo-paper-meta"));
 const title=make("h3");title.append(link(p.title,p.url,"axiovo-paper-title-button"));article.append(title);
 const authors=make("p",undefined,"axiovo-paper-meta");
 p.authors.slice(0,8).forEach((name,i)=>{
  if(i)authors.append(document.createTextNode(", "));
  authors.append(button(name,()=>{$("archive-author").value=name;$("archive-query").value="";search()},"axiovo-author-link"));
 });
 if(!p.authors.length)authors.textContent="Authors unavailable";
 article.append(authors);
 if(p.abstract){
  const summary=make("details",undefined,"axiovo-article-details");
  summary.append(make("summary","Read abstract"),make("p",p.abstract,"axiovo-abstract"));article.append(summary);
 }
 const actions=make("div",undefined,"axiovo-paper-actions");
 actions.append(link("Original record ↗",p.url,"axiovo-primary"));
 if(p.pdf)actions.append(link("PDF ↗",p.pdf));
 if(source==="arxiv")actions.append(link("Paper workspace","./paper.html?id="+encodeURIComponent(p.recordId)));
 const saveButton=button(data.saved(p)?"Saved to Library":"Save to Library",()=>{
  const ok=data.save(p);saveButton.textContent=ok?"Saved to Library":"Storage unavailable";saveButton.disabled=ok;
 });
 saveButton.disabled=data.saved(p);actions.append(saveButton);
 const compare=button(data.comparison().some(item=>data.recordKey(item)===data.recordKey(p))?"Added to comparison":"Add to comparison",()=>{
  const outcome=data.addComparison(p);
  compare.textContent=outcome==="added"?"Added to comparison":outcome==="full"?"Comparison full (3 papers)":"Storage unavailable";
 });
 if(p.abstract&&window.AxiovoAbstractAudio)actions.append(button("Listen to abstract",()=>window.AxiovoAbstractAudio.play([p])));
 actions.append(compare);article.append(actions);return article;
}
function render(){
 $("archive-sync-status").textContent=status;
 $("archive-result-count").textContent=result.length+" matching "+data.names[source]+" record"+(result.length===1?"":"s")+(fetching?" · checking source…":"");
 const rows=$("archive-results");rows.replaceChildren(...result.slice(0,visible).map(paperCard));
 if(!result.length&&!fetching)rows.append(make("p","No matches in the available records for these filters.","axiovo-no-results"));
 const bar=$("archive-result-actions");bar.replaceChildren();
 if(visible<result.length)bar.append(button("Show 20 more",()=>{visible+=20;render()}));
 if(next!==null&&!fetching)bar.append(button("Load next source page",loadMore));
 bar.append(link("Open official archive ↗",data.sourceLink(source,criteria)));
}
function mergeMatching(...groups){return data.merge(...groups.map(group=>data.filter(group,criteria)))}
function show(...groups){result=data.filter(mergeMatching(...groups),criteria);render()}
async function search({keepURL=true}={}){
 for(const key of ["scope","sort","from","to","author","affiliation"])state[key]=$("archive-"+key).value;
 state.query=$("archive-query").value.trim();remember();criteria=criteriaFromForm();
 controller?.abort();controller=new AbortController();
 const signal=controller.signal,c=criteria;next=null;visible=20;result=[];
 if(c.from&&c.to&&c.from>c.to){
  fetching=false;status="The start date must be on or before the end date.";render();return;
 }
 if(keepURL)updateURL();
 fetching=true;status="Checking available records and source coverage…";render();
 const cachedTask=data.snapshot(source);
 const datesTask=source==="arxiv"?data.datedArxiv(c,signal).catch(()=>null):Promise.resolve(null);
 const local=await cachedTask;if(signal.aborted)return;
 show(local.papers);
 const dates=await datesTask;if(signal.aborted)return;
 if(dates?.complete){
  fetching=false;status=dates.reason+" Dates are first submissions in UTC.";
  show(dates.papers);return;
 }
 const prefix=dates?.coveredDays?dates.reason+" ":"";
 try{
  const live=await data.live(source,c,signal);
  if(signal.aborted)return;
  next=live.next;
  status=prefix+live.provider+" returned a page of metadata. "+(source==="chemrxiv"&&c.category?"Where subject tags are unavailable, chemistry matches use the subject name as a search term. ":"")+"Coverage depends on the source and filters.";
  fetching=false;show(local.papers,dates?.papers||[],live.papers);
 }catch(error){
  if(signal.aborted)return;
  fetching=false;status=prefix+"Live source unavailable. Showing available snapshots"+(local.stamp?" from "+local.stamp.slice(0,10):"")+".";
  show(local.papers,dates?.papers||[]);
 }
}
async function loadMore(){
 const signal=controller.signal,c=criteria,cursor=next;
 fetching=true;render();
 try{
  const response=await data.live(source,c,signal,cursor);
  if(signal.aborted)return;
  next=response.next===cursor?null:response.next;
  visible+=20;fetching=false;show(result,response.papers);
 }catch{
  if(signal.aborted)return;
  fetching=false;status="The next source page could not be reached. Earlier results are still available.";render();
 }
}
$("archive-directory").addEventListener("toggle",()=>{if($("archive-directory").open)renderDirectory()});
$("archive-category-query").addEventListener("input",renderDirectory);
$("archive-directory-label").textContent="Find any "+data.names[source]+" "+(source==="arxiv"?"category":"subject")+" ("+directory.length+")";
$("archive-topic").onchange=()=>{Object.assign(state,{topic:$("archive-topic").value,field:0,subfield:""});selectAndSearch()};
$("archive-field").onchange=()=>{Object.assign(state,{field:$("archive-field").value,subfield:""});selectAndSearch()};
$("archive-subfield").onchange=()=>{state.subfield=$("archive-subfield").value;selectAndSearch()};
$("archive-custom-form").onsubmit=e=>{
 e.preventDefault();const name=data.clean($("archive-custom").value).slice(0,90);
 if(!name)return;
 if(!userSubs().includes(name)){custom[area().code]=[...userSubs(),name].slice(-40);data.write(customKey,custom)}
 state.subfield=name;$("archive-custom").value="";selectAndSearch();
};
$("archive-reset").onclick=()=>{delete custom[area().code];data.write(customKey,custom);state.subfield="";selectAndSearch()};
$("archive-search-form").onsubmit=e=>{e.preventDefault();search()};
$("archive-sort").onchange=()=>search();
$("archive-scope").onchange=()=>search();
if(linked.has("refine")){
 const refinement=linked.get("refine").slice(0,90);
 if(refinement){
  if(!subs().some(x=>x.code===refinement))custom={...custom,[area().code]:[...userSubs(),refinement]};
  state.subfield=refinement;
 }
}
renderTaxonomy();applyFilters();search({keepURL:false});
})();
