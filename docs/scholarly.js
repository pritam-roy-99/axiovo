/* Existing Field Explorer adapted for embedded Discover. */
(function(){
"use strict";
/* Field Explorer: public scholarly search and browser-local reading collections. */
const $=id=>document.getElementById("scholar-"+id);
const {FIELDS,fieldTopics,fieldKey}=window.ResearchLensFields;

const KEY="researchlens-field-explorer-v1", SAVED="researchlens-field-saved-v1";
const interestsAPI=window.ResearchLensInterests;
const followedInterests=()=>interestsAPI?.get(read(interestsAPI.KEY,{}),state.field,state.topic)||[];
function toggleInterest(value){if(!interestsAPI)return;const next=interestsAPI.toggle(read(interestsAPI.KEY,{}),state.field,state.topic,value);store(interestsAPI.KEY,next);drawTopics();drawSubtopics();window.dispatchEvent(new Event("researchlens:interests-changed"))}
function read(key,fallback){try{const d=JSON.parse(localStorage.getItem(key)||"null");return d??fallback}catch{return fallback}}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
let state=read(KEY,{field:"quantum",topic:"Quantum key distribution",subtopic:"",query:"",sort:"relevance",from:"",to:""});
state.field=fieldKey(state.field);
if(!FIELDS[state.field].topics.includes(state.topic)){state.topic=FIELDS[state.field].topics[0];state.subtopic=""}
if(state.subtopic&&!state.customSubtopic&&!fieldTopics(state.field,state.topic).includes(state.subtopic))state.subtopic="";
let saved=read(SAVED,[]);if(!Array.isArray(saved))saved=[];
let page=1,total=0,busy=false,items=[],showingSaved=false,requestController=null;
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el}
function link(parent,label,url){if(!/^https:\/\//.test(url||""))return;const a=node("a",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";parent.append(a)}
function recordID(w){return w.id||w.doi||w.display_name}
function arxivURL(w){const loc=[...(w.locations||[]),w.best_oa_location,w.primary_location].filter(Boolean);for(const x of loc){for(const u of [x.landing_page_url,x.pdf_url]){if(/^https:\/\/(?:export\.)?(?:www\.)?arxiv\.org\/(abs|pdf)\//.test(u||""))return u}}return null}
function bib(w){const author=(w.authorships||[]).map(a=>a.author?.display_name).filter(Boolean).join(" and ");const key=(author.split(" ").slice(-1)[0]||"Research")+"_"+(w.publication_year||"n.d.")+"_"+String(w.display_name||"work").split(/\W+/).slice(0,2).join("");const val=x=>String(x||"").replace(/[{}]/g,"").replace(/\s+/g," ").trim();return "@article{"+key.replace(/\W/g,"")+"\n  title = {"+val(w.display_name||w.title)+"},\n  author = {"+val(author)+"},\n  year = {"+val(w.publication_year)+"},\n  doi = {"+val((w.doi||"").replace(/^https:\/\/doi.org\//,""))+"},\n  url = {"+val(w.id)+"}\n}\n"}
function download(name,contents,type){const b=new Blob([contents],{type});const url=URL.createObjectURL(b);const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function setStatus(s){$("status").textContent=s}
function persist(){state.field=$("field").value;state.query=$("query").value;state.sort=$("sort").value;state.from=$("from").value;state.to=$("to").value;store(KEY,state)}
function topicSelect(t){state.topic=t;state.subtopic="";state.customSubtopic=false;state.query=t;$("query").value=t;persist();drawTopics();drawSubtopics();page=1;search()}
function subtopicSelect(t){state.subtopic=t;state.customSubtopic=!fieldTopics(state.field,state.topic).includes(t);state.query=t;$("query").value=t;persist();drawSubtopics();page=1;search()}
function drawSubtopics(){
 const holder=$("subtopic-list");holder.replaceChildren();
 const followed=followedInterests();
 const curated=fieldTopics(state.field,state.topic);
 const items=interestsAPI?interestsAPI.order([...new Set([...curated,...followed])],followed):curated;
 $("subtopic-label").textContent="Research interests within "+state.topic;
 const note=node("p",followed.length?
  "Following "+followed.length+" interests in this topic. Select a subtopic to search, or use its star to follow or unfollow.":
  "Choose a specific area, then star your interests for future visits.","rl-interest-help");
 holder.append(note);
 for(const t of items){
  const row=node("span",undefined,"rl-interest-chip");
  const b=node("button",t,"topic"+(t===state.subtopic?" active":""));b.type="button";
  b.setAttribute("aria-pressed",String(t===state.subtopic));b.onclick=()=>subtopicSelect(t);
  const marked=followed.some(x=>x.toLowerCase()===t.toLowerCase());
  const follow=node("button",marked?"★":"☆","rl-interest-follow"+(marked?" is-followed":""));
  follow.type="button";follow.setAttribute("aria-pressed",String(marked));
  follow.setAttribute("aria-label",(marked?"Unfollow ":"Follow ")+t+" in "+state.topic);
  follow.title=marked?"Unfollow interest":"Follow interest";follow.onclick=()=>toggleInterest(t);
  row.append(b,follow);holder.append(row);
 }
 const custom=$("custom-subtopic");
 custom.placeholder="Add a specialized interest in "+state.topic.toLowerCase();
}
function followedCount(topic){return interestsAPI?.get(read(interestsAPI.KEY,{}),state.field,topic).length||0}
function drawTopics(){const holder=$("topic-list");holder.replaceChildren();const topics=FIELDS[state.field].topics.slice().sort((a,b)=>followedCount(b)-followedCount(a));for(const t of topics){const b=node("button",t,"topic"+(t===state.topic?" active":""));b.type="button";b.setAttribute("aria-pressed",String(t===state.topic));b.onclick=()=>topicSelect(t);holder.append(b)}}
function drawField(){const f=FIELDS[state.field];$("field").value=state.field;$("field-label").textContent=f.name;for(const b of $("field-choices").querySelectorAll("button"))b.setAttribute("aria-pressed",String(b.dataset.field===state.field));$("field-summary").textContent=f.summary;$("field-heading").textContent="Explore "+f.name.toLowerCase();drawTopics();drawSubtopics();const holder=$("suggestions");holder.replaceChildren();for(const q of f.queries){const b=node("button",q,"template");b.type="button";b.onclick=()=>{state.subtopic="";state.query=q;$("query").value=q;persist();drawSubtopics();page=1;search()};holder.append(b)}const w=$("workflow");w.replaceChildren();const ol=document.createElement("ol");for(const step of f.workflow){ol.append(node("li",step))}ol.style.paddingLeft="20px";w.append(ol)}
function drawSaved(){store(SAVED,saved);$("saved-count").textContent=saved.length;const root=$("saved-list");root.replaceChildren();if(!saved.length){root.append(node("p","No saved papers yet.","muted"));return}for(const w of saved.slice().reverse().slice(0,12)){const a=node("a",w.display_name||"Untitled");a.href=w.id||w.doi||"#";a.target="_blank";a.rel="noopener noreferrer";root.append(a)}}
function renderPaper(w){const art=node("article",undefined,"paper");const header=node("div",undefined,"row");header.append(node("span",String(w.publication_year||"Year unknown"),"pill"));header.append(node("span",(w.cited_by_count??0)+" citations","pill"));const access=w.open_access?.is_oa;if(access)header.append(node("span","Open access","pill"));art.append(header);
const h=node("h3",w.display_name||w.title||"Untitled research");art.append(h);
const authors=(w.authorships||[]).slice(0,6).map(x=>x.author?.display_name).filter(Boolean);art.append(node("p",authors.join(", ")+(w.authorships?.length>6?" et al.":""),"authors"));
const venue=w.primary_location?.source?.display_name;if(venue)art.append(node("p",venue,"authors"));
if(w.abstract_inverted_index){const entries=[];for(const [term,positions] of Object.entries(w.abstract_inverted_index)){for(const pos of positions)if(pos<140)entries[pos]=term}if(entries.length)art.append(node("p",entries.filter(Boolean).join(" ").slice(0,820)+(entries.length>140?"…":""),"summary"))}
const row=node("div",undefined,"row actions");link(row,"OpenAlex",w.id);link(row,"DOI",w.doi);link(row,"PDF / OA",w.best_oa_location?.pdf_url||w.best_oa_location?.landing_page_url);link(row,"arXiv",arxivURL(w));
const isSaved=saved.some(p=>recordID(p)===recordID(w));const b=node("button",isSaved?"Saved":"Save paper","rl-save-button"+(isSaved?" is-saved":""));b.type="button";b.setAttribute("aria-pressed",String(isSaved));b.setAttribute("aria-label",(isSaved?"Remove from reading list: ":"Save to reading list: ")+(w.display_name||w.title||"Paper"));b.onclick=()=>{if(saved.some(p=>recordID(p)===recordID(w)))saved=saved.filter(p=>recordID(p)!==recordID(w));else saved.push(w);drawSaved();window.dispatchEvent(new Event("researchlens-library-change"));render()};const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("width","16");icon.setAttribute("height","16");icon.setAttribute("fill",isSaved?"currentColor":"none");icon.setAttribute("stroke","currentColor");icon.setAttribute("stroke-width","1.8");icon.setAttribute("aria-hidden","true");const mark=document.createElementNS("http://www.w3.org/2000/svg","path");mark.setAttribute("d","M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z");icon.append(mark);b.prepend(icon);row.append(b);
const cite=node("button","Copy BibTeX");cite.type="button";cite.onclick=async()=>{try{await navigator.clipboard.writeText(bib(w));cite.textContent="Copied"}catch{download("researchlens-citation.bib",bib(w),"text/plain")}};row.append(cite);
const cop=node("a","✦ Research Assistant");const arxiv=arxivURL(w);const matched=arxiv?.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/i);const aid=matched?matched[1].replace(/\.pdf$/,"").replace(/v\d+$/,""):"";cop.href="./copilot.html?"+new URLSearchParams(aid?{id:aid}:{q:w.display_name||w.title||""});row.append(cop);art.append(row);return art}
function render(){const root=$("results");root.replaceChildren();const display=showingSaved?saved.slice().reverse():items;$("result-heading").textContent=showingSaved?"Your saved papers":"Literature results";if(!display.length){root.append(node("div",showingSaved?"No papers saved yet. Save papers from your search results.":"No matching records to display.","empty"))}else for(const w of display)root.append(renderPaper(w));
$("pagination").textContent=showingSaved?saved.length+" locally saved":("Page "+page+" · "+total.toLocaleString()+" records");$("prev").disabled=showingSaved||busy||page===1;$("next").disabled=showingSaved||busy||page*20>=Math.min(total,10000)}
async function search(){if(busy&&requestController)requestController.abort();busy=true;showingSaved=false;persist();const q=$("query").value.trim();const from=$("from").value,to=$("to").value;if(!q&&!from&&!to){busy=false;setStatus("Enter a topic or a publication date.");return}if(from&&to&&from>to){busy=false;setStatus("Start date must be before end date.");return}setStatus("Searching live scholarly literature…");$("results").replaceChildren(node("div","Retrieving research records…","empty"));renderControls();
const p=new URLSearchParams({page:String(page),per_page:"20",select:"id,display_name,title,publication_year,cited_by_count,authorships,doi,primary_location,best_oa_location,locations,open_access"});
if(q)p.set("search",q);const filters=[];if(from)filters.push("from_publication_date:"+from);if(to)filters.push("to_publication_date:"+to);if(filters.length)p.set("filter",filters.join(","));if($("sort").value!=="relevance")p.set("sort",$("sort").value);
const ctl=new AbortController();requestController=ctl;
try{const res=await fetch("https://api.openalex.org/works?"+p.toString(),{signal:ctl.signal,headers:{Accept:"application/json"}});if(!res.ok)throw new Error("OpenAlex returned HTTP "+res.status);const data=await res.json();items=data.results||[];total=data.meta?.count||0;setStatus(total.toLocaleString()+" matching scholarly records. Results from OpenAlex.");}
catch(err){if(err.name==="AbortError")return;items=[];total=0;setStatus("Search unavailable: "+err.message+". Retry or use the global search.");}
finally{if(requestController===ctl){busy=false;requestController=null;render()}}}
function renderControls(){$("prev").disabled=true;$("next").disabled=true}
function init(){
const latest=read(KEY,{});
if(latest.field&&FIELDS[latest.field]&&latest.field!==state.field){
 state.field=latest.field;state.topic=FIELDS[state.field].topics[0];state.subtopic="";state.query=state.topic
}
const opts=$("field"), choices=$("field-choices");
for(const [id,f] of Object.entries(FIELDS)){
 const button=node("button",f.name,"rl-field-choice");button.type="button";button.dataset.field=id;
 button.onclick=()=>{opts.value=id;$("field-details").open=false;opts.dispatchEvent(new Event("change",{bubbles:true}))};
 choices.append(button)
}
$("field").value=state.field;$("query").value=state.query||state.topic||"";
document.addEventListener("pointerdown",e=>{if(!$("field-details").contains(e.target))$("field-details").open=false});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("field-details").open){$("field-details").open=false;$("field-trigger").focus()}});$("sort").value=state.sort||"relevance";$("from").value=state.from||"";$("to").value=state.to||"";drawField();drawSaved();
$("field").onchange=()=>{state.field=$("field").value;state.topic=FIELDS[state.field].topics[0];state.subtopic="";state.customSubtopic=false;state.query=state.topic;$("query").value=state.query;persist();drawField();window.dispatchEvent(new CustomEvent("researchlens:field-changed",{detail:{field:state.field,topic:state.topic}}));page=1;search()};
$("use-custom").onclick=()=>{const t=$("custom").value.trim();if(t.length<3){setStatus("Enter at least three characters for a custom topic.");return}state.subtopic=t;state.customSubtopic=true;state.query=t;$("query").value=t;persist();drawSubtopics();page=1;search()};
$("use-subtopic").onclick=()=>{const t=$("custom-subtopic").value.trim();if(t.length<3){setStatus("Enter at least three characters for a subtopic.");return}subtopicSelect(t);toggleInterest(t);$("custom-subtopic").value="";setStatus("Following the specialized interest: "+t)};
window.addEventListener("researchlens:interests-changed",()=>{drawTopics();drawSubtopics()});
window.addEventListener("researchlens:choose-field",e=>{
 const field=fieldKey(e.detail?.field);if(state.field===field)return;
 state.field=field;state.topic=FIELDS[field].topics[0];state.subtopic="";state.query=state.topic;
 $("query").value=state.query;persist();drawField();page=1;search()
});
$("search-form").onsubmit=e=>{e.preventDefault();page=1;search()};
$("sort").onchange=()=>{page=1;search()};
$("latest").onclick=()=>{$("sort").value="publication_date:desc";$("from").value="";$("to").value="";page=1;search()};
$("clear-dates").onclick=()=>{$("from").value="";$("to").value="";persist();page=1;search()};
$("show-saved").onclick=()=>{showingSaved=true;setStatus("This collection is stored only in your current browser.");render()};
$("prev").onclick=()=>{if(page>1){page--;search()}};$("next").onclick=()=>{if(page*20<Math.min(total,10000)){page++;search()}};
$("export-bib").onclick=()=>{if(!saved.length){setStatus("Save a paper before exporting citations.");return}download("researchlens-reading-list.bib",saved.map(bib).join("\n"),"text/plain;charset=utf-8")};
$("export-json").onclick=()=>download("researchlens-field-reading-list.json",JSON.stringify(saved,null,2),"application/json");
const u=new URLSearchParams(location.search);if(u.get("field")&&FIELDS[u.get("field")]){state.field=u.get("field");if(!FIELDS[state.field].topics.includes(state.topic)){state.topic=FIELDS[state.field].topics[0];state.subtopic=""}$("field").value=state.field;drawField()}if(u.get("q")){$("query").value=u.get("q").slice(0,250);state.query=$("query").value}persist();if($("query").value.trim())search();
}
window.addEventListener("researchlens:scholarly-open",init,{once:true});
})();
