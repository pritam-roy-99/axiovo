/* Existing Field Explorer adapted for embedded Discover. */
(function(){
"use strict";
/* Field Explorer: public scholarly search and browser-local reading collections. */
const $=id=>document.getElementById("scholar-"+id);
const {FIELDS,fieldTopics,fieldKey}=window.ResearchLensFields;
const SearchCore=window.ResearchLensSearch;
const SemanticCore=window.ResearchLensSemanticSearch;
const Arxiv=window.ResearchLensArxiv;
const CachedArxiv=window.ResearchLensCachedArxiv;
const SecondSource=window.AxiovoMultiSource;
const OPENALEX_COOLDOWN="researchlens-openalex-429-until";
let cachedFeedPromise=null;
function cooldownUntil(){try{return Number(sessionStorage.getItem(OPENALEX_COOLDOWN)||0)}catch{return 0}}
function setCooldown(){try{sessionStorage.setItem(OPENALEX_COOLDOWN,String(Date.now()+60*60*1000))}catch{}}
async function offlineArxivFallback(plan,{reason="",from="",to="",sort="",today=""}={}){
 if(!CachedArxiv)return {items:[],message:"Local index search module unavailable.",outsideDates:false};
 try{
  if(!cachedFeedPromise)cachedFeedPromise=fetch("./data/feed.json",{cache:"force-cache"})
   .then(res=>{if(!res.ok)throw Error("Local index unavailable (HTTP "+res.status+")");return res.json()})
   .catch(err=>{cachedFeedPromise=null;throw err});
  const feed=await cachedFeedPromise;
  const found=CachedArxiv.find(feed,{field:plan.field,query:plan.query,from,to,sort,today,limit:20});
  let message=(reason&&/rate.limit|429/i.test(reason)?"OpenAlex is rate-limited. ":reason?"OpenAlex unavailable or incomplete. ":"OpenAlex returned no eligible matches. ")+ "Showing "+found.items.length+
   " matching papers from Axiovo's cached arXiv index ("+found.indexed+" indexed papers).";
  if(found.outsideDates)message+=" No cached matches fall within the chosen date range; these results are from other dates.";
  if(!found.items.length)message+=" No matching papers in the limited cache. This does not mean arXiv has no matching research.";
  message+=" This is a partial local snapshot, not an exhaustive historical arXiv search.";
  return {items:found.items,message,outsideDates:found.outsideDates};
 }catch(error){
  return {items:[],message:"OpenAlex unavailable, and local arXiv index could not be loaded ("+String(error.message||error)+"). Use the official arXiv website.",outsideDates:false};
 }
}


const KEY="researchlens-field-explorer-v1", SAVED="researchlens-field-saved-v1";
const interestsAPI=window.ResearchLensInterests;
const followedInterests=()=>interestsAPI?.get(read(interestsAPI.KEY,{}),state.field,state.topic)||[];
function toggleInterest(value){if(!interestsAPI)return;const next=interestsAPI.toggle(read(interestsAPI.KEY,{}),state.field,state.topic,value);store(interestsAPI.KEY,next);drawTopics();drawSubtopics();window.dispatchEvent(new Event("researchlens:interests-changed"))}
function read(key,fallback){try{const d=JSON.parse(localStorage.getItem(key)||"null");return d??fallback}catch{return fallback}}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
let state=read(KEY,{field:"general",topic:"Explore all research",subtopic:"",query:"",sort:"publication_date:desc",from:"",to:"",areaSelected:false});
state.areaSelected=state.areaSelected===undefined?Boolean(state.query):Boolean(state.areaSelected);
state.field=fieldKey(state.field);
if(!FIELDS[state.field].topics.includes(state.topic)){state.topic=FIELDS[state.field].topics[0];state.subtopic=""}
if(state.subtopic&&!state.customSubtopic&&!fieldTopics(state.field,state.topic).includes(state.subtopic))state.subtopic="";
let saved=read(SAVED,[]);if(!Array.isArray(saved))saved=[];
let page=1,total=0,busy=false,items=[],showingSaved=false,requestController=null;
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el}
function link(parent,label,url){
 if(typeof url!=="string"||!url.trim())return null;
 try{
  const target=new URL(url,location.href);
  if(target.protocol!=="https:"||(!String(url||"").startsWith("https://")&&target.origin!==location.origin))return null;
  const a=node("a",label);a.href=target.href;
  if(target.origin!==location.origin){a.target="_blank";a.rel="noopener noreferrer"}
  parent.append(a);return a
 }catch{return null}
}
function recordID(w){return w.id||w.doi||w.display_name}
function mirrorArxivBookmark(work,add){
 const selected=Arxiv?.candidates(work)[0];if(!selected)return;
 const key="researchlens-reading-list";
 let ids=[];try{ids=JSON.parse(localStorage.getItem(key)||"[]")}catch{}
 if(!Array.isArray(ids))ids=[];
 const id=selected.requested;
 const next=add?[...new Set([...ids,id])]:ids.filter(x=>x!==id);
 try{localStorage.setItem(key,JSON.stringify(next))}catch{}
}

function arxivURL(w){const p=Arxiv?.candidates(w)[0];return p?Arxiv.abs(p.requested):null}
function bib(w){const author=(w.authorships||[]).map(a=>a.author?.display_name).filter(Boolean).join(" and ");const key=(author.split(" ").slice(-1)[0]||"Research")+"_"+(w.publication_year||"n.d.")+"_"+String(w.display_name||"work").split(/\W+/).slice(0,2).join("");const val=x=>String(x||"").replace(/[{}]/g,"").replace(/\s+/g," ").trim();return "@article{"+key.replace(/\W/g,"")+"\n  title = {"+val(w.display_name||w.title)+"},\n  author = {"+val(author)+"},\n  year = {"+val(w.publication_year)+"},\n  doi = {"+val((w.doi||"").replace(/^https:\/\/doi.org\//,""))+"},\n  url = {"+val(w.id)+"}\n}\n"}
function download(name,contents,type){const b=new Blob([contents],{type});const url=URL.createObjectURL(b);const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function setStatus(s){$("status").textContent=s}
function persist(){state.field=$("field").value;state.query=$("query").value;state.sort=$("sort").value;state.from=$("from").value;state.to=$("to").value;store(KEY,state)}
function normalizeSearchDates(){
 const now=new Date().toISOString().slice(0,10);
 const from=$("from"),to=$("to");
 const reasons=[];
 if(from.value&&from.value>now){from.value="";reasons.push("future start")}
 if(to.value&&to.value>now){to.value="";reasons.push("future end")}
 if(from.value&&to.value&&from.value>to.value){from.value="";to.value="";reasons.push("reversed range")}
 if(reasons.length){
  state.from=from.value;state.to=to.value;
  store(KEY,{...state,from:from.value,to:to.value});
 }
 return {changed:reasons.length>0,until:now,reasons}
}

function topicSelect(t){state.topic=t;state.subtopic="";state.customSubtopic=false;state.areaSelected=true;state.query=t;$("query").value=t;persist();drawTopics();drawSubtopics();page=1;search()}
function subtopicSelect(t){state.subtopic=t;state.areaSelected=true;state.customSubtopic=!fieldTopics(state.field,state.topic).includes(t);state.query=t;$("query").value=t;persist();drawSubtopics();page=1;search()}
function drawSubtopics(){
 const holder=$("subtopic-list");holder.replaceChildren();
 const followed=followedInterests();
 const curated=fieldTopics(state.field,state.topic);
 const items=interestsAPI?interestsAPI.order(curated.slice(),followed):curated;
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
function drawTopics(){const holder=$("topic-list");holder.replaceChildren();const topics=FIELDS[state.field].topics.slice().sort((a,b)=>followedCount(b)-followedCount(a));for(const t of topics){const b=node("button",t,"topic"+(state.areaSelected&&t===state.topic?" active":""));b.type="button";b.setAttribute("aria-pressed",String(state.areaSelected&&t===state.topic));b.onclick=()=>topicSelect(t);holder.append(b)}}
function drawField(){const f=FIELDS[state.field];$("field").value=state.field;$("field-label").textContent=f.name;for(const b of $("field-choices").querySelectorAll("button"))b.setAttribute("aria-pressed",String(b.dataset.field===state.field));$("field-summary").textContent=f.summary;$("field-heading").textContent="Explore "+f.name.toLowerCase();drawTopics();drawSubtopics();const holder=$("suggestions");holder.replaceChildren();for(const q of f.queries){const b=node("button",q,"template");b.type="button";b.onclick=()=>{state.subtopic="";state.query=q;$("query").value=q;persist();drawSubtopics();page=1;search()};holder.append(b)}const w=$("workflow");w.replaceChildren();const ol=document.createElement("ol");for(const step of f.workflow){ol.append(node("li",step))}ol.style.paddingLeft="20px";w.append(ol)}
function drawSaved(){store(SAVED,saved);$("saved-count").textContent=saved.length;const root=$("saved-list");root.replaceChildren();if(!saved.length){root.append(node("p","No saved papers yet.","muted"));return}for(const w of saved.slice().reverse().slice(0,12)){const a=node("a",w.display_name||"Untitled");a.href=w.id||w.doi||"#";a.target="_blank";a.rel="noopener noreferrer";root.append(a)}}
/* Explicit same-day searches are arXiv announcement searches, not OpenAlex publication searches.
 * Keep announcement dates separate from original submission dates.
 */
const ARCHIVE_MAP={
 quantum:["quant-ph"],mathematics:["math","math-ph"],astrophysics:["astro-ph","gr-qc"],
 computer:["cs"],biology:["q-bio"],medicine:["q-bio"],chemistry:["physics","cond-mat"],
 engineering:["eess","physics"],condmat:["cond-mat"],statmech:["cond-mat"],
 highenergy:["hep-","gr-qc","nucl-"],social:["econ","q-fin","physics"],general:[]
};
function announcementMatches(p,query,field){
 const list=ARCHIVE_MAP[field]||[];
 const categories=[p.primary_category,...(p.categories||[])].filter(Boolean);
 const domain=!list.length||categories.some(cat=>list.some(prefix=>cat===prefix||cat.startsWith(prefix+".")||cat.startsWith(prefix+"-")));
 if(!domain)return false;
 const words=String(query||"").toLowerCase().split(/\s+/).filter(Boolean);
 if(!words.length)return true;
 const hay=[p.id,p.title,p.abstract,...(p.authors||[])].join(" ").toLowerCase();
 return words.every(w=>hay.includes(w));
}
function announcementWork(p){
 const base=String(p.id||"");
 return {id:"https://arxiv.org/abs/"+base,display_name:p.title,title:p.title,
  publication_date:p.announcement_date,
  publication_year:Number(p.announcement_date?.slice(0,4))||null,
  authorships:(p.authors||[]).map(a=>({author:{display_name:a}})),
  primary_location:{landing_page_url:"https://arxiv.org/abs/"+base,source:{display_name:"arXiv official announcement"}},
  locations:[{landing_page_url:"https://arxiv.org/abs/"+base}],
  __source:"arxiv-announcement",__abstract:p.abstract||"",
  __announcement_date:p.announcement_date,__categories:p.categories||[]};
}
async function announcementDateSearch(query,from,to,field,signal){
 if(!from||!to||from!==to)return null;
 const istDay=value=>{const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(value).map(x=>[x.type,x.value]));return parts.year+"-"+parts.month+"-"+parts.day};
 const today=istDay(new Date());
 const yesterday=istDay(new Date(Date.now()-86400000));
 if(from!==today&&from!==yesterday)return null;
 try{
  const response=await fetch("./data/announcements.json?ts="+Date.now(),{cache:"no-store",signal});
  if(!response.ok)throw Error("Announcement snapshot HTTP "+response.status);
  const batch=await response.json();
  if(batch.announcement_date!==from||!Array.isArray(batch.papers)||!batch.papers.length){
   return {items:[],message:"Official arXiv announcement batch for "+from+" is not yet in Axiovo. This is an ingestion delay, not evidence of zero papers. Check arXiv's new-paper listing or retry once synchronization succeeds."};
  }
  const records=batch.papers.filter(p=>announcementMatches(p,query,field));
  return {items:records.map(announcementWork),
   message:"Official arXiv announcement date "+from+": "+records.length+" matching papers from "+batch.count+" harvested entries"+
   (batch.complete?".":". PARTIAL coverage: some archive feeds were unavailable.")+
   " These dates are arXiv announcement dates, not OpenAlex publication or original-submission dates."};
 }catch(error){
  if(error.name==="AbortError")throw error;
  return {items:[],message:"arXiv announcement records are not yet available in Axiovo ("+String(error.message||error)+"). Today's empty OpenAlex publication-date results are not authoritative. Browse arXiv's official new-paper list while this source is being synchronized."};
 }
}
function renderPaper(w){const art=node("article",undefined,"paper");const header=node("div",undefined,"row");header.append(node("span",String(w.publication_year||"Year unknown"),"pill"));if(w.cited_by_count!==null&&w.cited_by_count!==undefined)header.append(node("span",w.cited_by_count+" citations","pill"));if(w.__source==="local-arxiv")header.append(node("span","Cached arXiv · offline fallback","pill"));
if(w.__source==="arxiv-announcement")header.append(node("span","Official arXiv announcement","pill"));const access=w.open_access?.is_oa;if(access)header.append(node("span","Open access","pill"));if(w.__source==="semantic")header.append(node("span","AI semantic match · verify topic","pill rl-semantic-badge"));art.append(header);
const h=node("h3",w.display_name||w.title||"Untitled research");art.append(h);
const authors=(w.authorships||[]).slice(0,6).map(x=>x.author?.display_name).filter(Boolean);art.append(node("p",authors.join(", ")+(w.authorships?.length>6?" et al.":""),"authors"));
const originalDate=w.publication_date||"";if(originalDate)art.append(node("p",(w.__source==="arxiv-announcement"?"arXiv announced: ":w.__source==="local-arxiv"?"arXiv first submitted: ":"Publication date in scholarly index (not verified arXiv v1): ")+originalDate,"meta"));
const venue=w.primary_location?.source?.display_name;if(venue)art.append(node("p",venue,"authors"));
if(w.__abstract)art.append(node("p",w.__abstract.slice(0,820)+(w.__abstract.length>820?"…":""),"summary"));if(w.abstract_inverted_index){const entries=[];for(const [term,positions] of Object.entries(w.abstract_inverted_index)){for(const pos of positions)if(pos<140)entries[pos]=term}if(entries.length)art.append(node("p",entries.filter(Boolean).join(" ").slice(0,820)+(entries.length>140?"…":""),"summary"))}
const row=node("div",undefined,"row actions rl-paper-actionbar");const original=Arxiv?.candidates(w)[0];if(original){link(row,"Read on arXiv",Arxiv.abs(original.base));link(row,"PDF",Arxiv.pdf(original.base));}else{link(row,"OpenAlex",w.id)}
const isSaved=saved.some(p=>recordID(p)===recordID(w));const b=node("button",isSaved?"Saved":"Save paper","rl-save-button"+(isSaved?" is-saved":""));b.type="button";b.setAttribute("aria-pressed",String(isSaved));b.setAttribute("aria-label",(isSaved?"Remove from reading list: ":"Save to reading list: ")+(w.display_name||w.title||"Paper"));b.onclick=()=>{const wasSaved=saved.some(p=>recordID(p)===recordID(w));if(wasSaved)saved=saved.filter(p=>recordID(p)!==recordID(w));else saved.push(w);mirrorArxivBookmark(w,!wasSaved);drawSaved();window.dispatchEvent(new Event("researchlens-library-change"));render()};const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("width","16");icon.setAttribute("height","16");icon.setAttribute("fill",isSaved?"currentColor":"none");icon.setAttribute("stroke","currentColor");icon.setAttribute("stroke-width","1.8");icon.setAttribute("aria-hidden","true");const mark=document.createElementNS("http://www.w3.org/2000/svg","path");mark.setAttribute("d","M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z");icon.append(mark);b.prepend(icon);row.append(b);
window.AxiovoAuthorFollow?.mount(row,(w.authorships||[]).map(x=>x.author?.display_name).filter(Boolean));
const cite=node("button","Copy BibTeX");cite.type="button";cite.onclick=async()=>{try{await navigator.clipboard.writeText(bib(w));cite.textContent="Copied"}catch{download("researchlens-citation.bib",bib(w),"text/plain")}};row.append(cite);
const cop=node("a","✦ Research Assistant");const arxiv=arxivURL(w);const matched=arxiv?.match(/arxiv\.org\/(?:abs|pdf)\/([^?#]+)/i);const aid=matched?matched[1].replace(/\.pdf$/,"").replace(/v\d+$/,""):"";cop.href="./copilot.html?"+new URLSearchParams(aid?{id:aid}:{q:w.display_name||w.title||""});row.append(cop);
if(original){
 const versions=node("div",undefined,"rl-paper-versions");
 versions.append(node("span","Version:"));
 const version=document.createElement("input");version.type="number";version.min="1";version.max="9999";version.placeholder="Latest";version.step="1";
 version.setAttribute("aria-label","Select arXiv version for "+(w.display_name||"paper"));
 const selected=node("a","Open latest on arXiv ↗");selected.href=Arxiv.abs(original.base);selected.target="_blank";selected.rel="noopener noreferrer";
 version.oninput=()=>{const n=Number(version.value),good=version.value===""||Number.isInteger(n)&&n>=1&&n<=9999;selected.href=good?Arxiv.abs(original.base+(version.value?"v"+version.value:"")):Arxiv.abs(original.base);selected.textContent=version.value?"Open v"+version.value+" on arXiv ↗":"Open latest on arXiv ↗"};
 const saveExact=node("button","Save selected revision","rl-paper-action");
 saveExact.type="button";saveExact.setAttribute("aria-label","Save selected arXiv revision of "+(w.display_name||"paper"));
 saveExact.onclick=()=>{
   const n=Number(version.value),valid=version.value===""||Number.isInteger(n)&&n>=1&&n<=9999;
   if(!valid){saveExact.textContent="Enter a valid revision";return}
   const chosen=original.base+(version.value?"v"+version.value:"");
   let list=[];try{list=JSON.parse(localStorage.getItem("researchlens-reading-list")||"[]")}catch{}
   if(!Array.isArray(list))list=[];
   if(!list.includes(chosen))list.push(chosen);
   try{localStorage.setItem("researchlens-reading-list",JSON.stringify(list));saveExact.textContent="✓ Saved "+(version.value?"v"+version.value:"latest");window.dispatchEvent(new Event("researchlens-library-change"))}
   catch{saveExact.textContent="Browser storage unavailable"}
 };
 versions.append(version,selected,saveExact);art.append(versions);
}
art.append(row);return art}
function render(){const root=$("results");root.replaceChildren();const isAnnouncement=!showingSaved&&items[0]?.__source==="arxiv-announcement";const perPage=40;const display=showingSaved?saved.slice().reverse():isAnnouncement?items.slice((page-1)*perPage,page*perPage):items;$("result-heading").textContent=showingSaved?"Your saved papers":"Literature results";if(!display.length){root.append(node("div",showingSaved?"No papers saved yet. Save papers from your search results.":"No matching records to display.","empty"))}else for(const w of display)root.append(renderPaper(w));
$("pagination").textContent=showingSaved?saved.length+" locally saved":isAnnouncement?("Announcement papers "+(display.length?(page-1)*perPage+1:0)+"–"+Math.min(page*perPage,items.length)+" of "+items.length):("Search batch "+page+" · "+items.length+" relevant papers shown");$("prev").disabled=showingSaved||busy||page===1;$("next").disabled=showingSaved||busy||(isAnnouncement?page*perPage>=items.length:page*100>=Math.min(total,10000))}
async function search(){
 if(requestController)requestController.abort();
 busy=true;showingSaved=false;persist();
 const q=$("query").value.trim();
 const official=$("official-search");if(official&&Arxiv)official.href=Arxiv.officialSearchUrl(q);
 // Empty query browses the selected field without requiring an area or subtopic.
 const dates=normalizeSearchDates();
 if(!SearchCore){busy=false;setStatus("Search tools unavailable. Reload Axiovo.");return}
 if(Arxiv?.parse(q)){
  if(requestController)requestController.abort();requestController=null;
  busy=false;items=[];total=0;directArxivPaper(q);
  setStatus("Direct source link. Exact arXiv versions do not need OpenAlex or the local feed.");return;
 }
 const today=new Date().toISOString().slice(0,10);
 const from=$("from").value,to=$("to").value,sort=$("sort").value;
  const effectiveSort=sort==="relevance"&&(!q||state.areaSelected)?"publication_date:desc":sort;
 const plan=SearchCore.plan(state,q,{page,from,to,sort:effectiveSort,today});
 const ctl=new AbortController();requestController=ctl;
 const sameDayAnnouncement=await announcementDateSearch(q,from,to,state.field,ctl.signal).catch(e=>e.name==="AbortError"?null:null);
 if(ctl.signal.aborted||requestController!==ctl)return;
 if(sameDayAnnouncement){
  items=sameDayAnnouncement.items;total=items.length;busy=false;
  setStatus(sameDayAnnouncement.message);
  render();
  return;
 }
 const scope=FIELDS[plan.field].name;
 const fallbackEnabled=$("semantic-fallback")?.checked&&Boolean(SemanticCore)&&page===1;
 setStatus("Searching arXiv-hosted literature for "+scope+"…");
 $("results").replaceChildren(node("div","Checking paper records and scientific relevance…","empty"));
 renderControls();
 const service="https://api.openalex.org/works?";
 let lexical=[],semantic=[],mainError="",semanticError="",sourceTotal=0,triedAI=false;
 let rateLimited=cooldownUntil()>Date.now();
 const fetchResults=async params=>{
  const response=await fetch(service+params.toString(),{signal:ctl.signal,headers:{Accept:"application/json"}});
  if(response.status===429){
   setCooldown();
   const err=new Error("OpenAlex HTTP 429 (quota or request limit)");
   err.rateLimited=true;throw err;
  }
  if(!response.ok)throw new Error("OpenAlex HTTP "+response.status);
  return response.json()
 };
 try{
  if(!rateLimited){
   try{
    const data=await fetchResults(plan.params);
    if(ctl.signal.aborted||requestController!==ctl)return;
    sourceTotal=Number(data.meta?.count)||0;
    lexical=SearchCore.select(data.results||[],plan);
   }catch(err){
    if(ctl.signal.aborted||requestController!==ctl)return;
    if(err.rateLimited)rateLimited=true;
    mainError=String(err.message||err).slice(0,140);
   }
  }
  // A quota failure is not an empty scientific result. Do not make a second
  // OpenAlex request for semantic fallback while a 429 cooldown is active.
  if(!rateLimited&&fallbackEnabled&&lexical.length<6){
   triedAI=true;
   setStatus("Checking semantically related papers with OpenAlex…");
   try{
    await new Promise(resolve=>setTimeout(resolve,1100));
    if(ctl.signal.aborted||requestController!==ctl)return;
    const data=await fetchResults(SemanticCore.plan(plan,state).params);
    if(ctl.signal.aborted||requestController!==ctl)return;
    semantic=(data.results||[]).filter(w=>Boolean(arxivURL(w))&&SemanticCore.screen(w,plan,state,SearchCore));
   }catch(err){
    if(ctl.signal.aborted||requestController!==ctl)return;
    if(err.rateLimited)rateLimited=true;
    semanticError=String(err.message||err).slice(0,140);
   }
  }
  if(ctl.signal.aborted||requestController!==ctl)return;
  const selected=triedAI?SemanticCore.combine(lexical,semantic,plan,state,SearchCore,20):
   lexical.slice(0,20).map(work=>({work,source:"keyword"}));
  items=selected.map(x=>({...x.work,__source:x.source})).filter(w=>Boolean(arxivURL(w)));
  total=sourceTotal;
  let localNote="";
  if(!items.length&&SecondSource&&page===1){
   try{
    setStatus("Checking a second scholarly index for verified arXiv identifiers…");
    const cross=await SecondSource.search(q,{signal:ctl.signal,from,to});
    if(ctl.signal.aborted||requestController!==ctl)return;
    items=cross.items||[];
    if(items.length)localNote="OpenAlex returned no matching papers. Showing "+items.length+
     " papers with explicit arXiv identifiers from Semantic Scholar. Index coverage remains incomplete.";
   }catch(error){
    if(ctl.signal.aborted||requestController!==ctl)return;
    semanticError=String(error.message||error).slice(0,120);
   }
  }
  if(!items.length){
   const offline=await offlineArxivFallback(plan,{reason:mainError|| (rateLimited?"OpenAlex rate limit":""),from,to,sort:effectiveSort,today});
   if(ctl.signal.aborted||requestController!==ctl)return;
   if(offline.items.length){items=offline.items;total=0}
   localNote=offline.message;
  }else if(rateLimited){
   localNote="OpenAlex semantic search reached its rate limit. Showing "+items.length+
    " successfully retrieved standard-search papers. Semantic requests are paused for this browser session.";
  }
  if(ctl.signal.aborted||requestController!==ctl)return;
  const aiAdded=selected.filter(x=>x.source==="semantic").length;
  let summary=(dates.changed?"Invalid future dates were cleared. ":"");
  if(localNote){
   summary+=localNote;
  }else{
   summary+=items.length+" field-relevant arXiv-hosted papers shown for "+scope+" (batch "+page+").";
   if(triedAI)summary+=" Semantic matches added: "+aiAdded+".";
   if(semanticError)summary+=" Semantic search unavailable: "+semanticError+".";
   if(mainError)summary+=" Standard search problem: "+mainError+".";
   if(!items.length)summary+=" No relevant records on this search batch. Try another query.";
   summary+=" Indexing and scientific classification are not exhaustive.";
  }
  setStatus(summary);
 }catch(err){
  if(ctl.signal.aborted||requestController!==ctl)return;
  setStatus("Search interrupted: "+String(err.message||err)+". Try again or use arXiv directly.");
 }finally{
  if(requestController===ctl){busy=false;requestController=null;render()}
 }
}
function directArxivPaper(raw){
 const request=Arxiv?.parse(raw);if(!request)return false;
 const root=$("results");root.replaceChildren();
 const card=node("article",undefined,"paper");
 card.append(node("span","Authoritative arXiv source · exact identifier","pill"));
 card.append(node("h3","arXiv:"+request.requested));
 card.append(node("p",request.explicit?
  "Requested v"+request.version+". arXiv confirms whether that revision exists. Metadata and full version history are available on the original paper page.":
  "Open the latest available arXiv revision. The original record lists previous versions.","muted"));
 const buttons=node("div",undefined,"rl-paper-actionbar");
 link(buttons,"Read on arXiv",Arxiv.abs(request.requested));
 link(buttons,"PDF",Arxiv.pdf(request.requested));
 link(buttons,"Research Assistant","./copilot.html?id="+encodeURIComponent(request.requested));
 const save=node("button","☆ Save paper","rl-paper-action");
 save.type="button";save.onclick=()=>{
  const key="researchlens-reading-list";let values=[];
  try{values=JSON.parse(localStorage.getItem(key)||"[]")}catch{}
  if(!Array.isArray(values))values=[];
  const present=values.includes(request.requested);
  values=present?values.filter(x=>x!==request.requested):[...values,request.requested];
  try{localStorage.setItem(key,JSON.stringify(values));save.textContent=present?"☆ Save paper":"✓ Saved";
   save.setAttribute("aria-pressed",String(!present));
   window.dispatchEvent(new Event("researchlens-library-change"))}
  catch{save.textContent="Browser storage unavailable"}
 };
 buttons.append(save);card.append(buttons);root.append(card);
 $("pagination").textContent="Direct arXiv paper · "+request.requested;
 $("prev").disabled=true;$("next").disabled=true;
 return true;
}
function renderControls(){$("prev").disabled=true;$("next").disabled=true}
function init(){
for(const work of saved)mirrorArxivBookmark(work,true);
const latest=read(KEY,{});
if(latest.field&&FIELDS[latest.field]){
 state.field=latest.field;
 state.topic=FIELDS[state.field].topics.includes(latest.topic)?latest.topic:FIELDS[state.field].topics[0];
 state.subtopic=String(latest.subtopic||"");
 if(state.subtopic&&!fieldTopics(state.field,state.topic).includes(state.subtopic)&&!latest.customSubtopic)state.subtopic="";
 state.customSubtopic=Boolean(latest.customSubtopic);
 state.areaSelected=latest.areaSelected===undefined?Boolean(latest.query):Boolean(latest.areaSelected);
  state.query=state.areaSelected?(state.subtopic||state.topic):"";
}
const opts=$("field"), choices=$("field-choices");
for(const [id,f] of Object.entries(FIELDS)){
 const button=node("button",f.name,"rl-field-choice");button.type="button";button.dataset.field=id;
 button.onclick=()=>{opts.value=id;$("field-details").open=false;opts.dispatchEvent(new Event("change",{bubbles:true}))};
 choices.append(button)
}
$("field").value=state.field;$("query").value=state.query||"";
document.addEventListener("pointerdown",e=>{if(!$("field-details").contains(e.target))$("field-details").open=false});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("field-details").open){$("field-details").open=false;$("field-trigger").focus()}});$("sort").value=state.sort||"relevance";$("from").value=state.from||"";$("to").value=state.to||"";const dateRestore=normalizeSearchDates();drawField();drawSaved();if(dateRestore.changed)setStatus("Saved future publication dates were cleared. Research is available through "+dateRestore.until+".");
$("field").onchange=()=>{state.field=$("field").value;state.topic=FIELDS[state.field].topics[0];state.subtopic="";state.customSubtopic=false;state.areaSelected=false;state.query="";$("query").value=state.query;persist();drawField();window.dispatchEvent(new CustomEvent("researchlens:field-changed",{detail:{field:state.field,topic:state.topic}}));page=1;search()};
$("use-custom").onclick=()=>{const t=$("custom").value.trim();if(t.length<3){setStatus("Enter at least three characters for a custom topic.");return}state.subtopic=t;state.customSubtopic=true;state.query=t;$("query").value=t;persist();drawSubtopics();page=1;search()};
$("use-subtopic").onclick=()=>{
 const t=$("custom-subtopic").value.trim();
 if(t.length<3){setStatus("Enter at least three characters for a subtopic.");return}
 const result=window.ResearchLensCustomTaxonomy?.addInterest(state.field,state.topic,t,localStorage);
 if(!result?.ok){setStatus(result?.reason||"Could not add subtopic");return}
 subtopicSelect(result.value);
 if(!followedInterests().some(x=>x.toLowerCase()===result.value.toLowerCase()))toggleInterest(result.value);
 $("custom-subtopic").value="";
 setStatus("Added specialized subtopic: "+result.value);
 window.dispatchEvent(new Event("axiovo:taxonomy-changed"));
};
window.addEventListener("researchlens:interests-changed",()=>{drawTopics();drawSubtopics()});
window.addEventListener("axiovo:taxonomy-changed",()=>{
 if(!FIELDS[state.field].topics.includes(state.topic)){
  state.topic=FIELDS[state.field].topics[0];state.subtopic="";state.query=state.topic;
 }else if(state.subtopic&&!fieldTopics(state.field,state.topic).includes(state.subtopic)){
  state.subtopic="";state.query=state.topic;
 }
 $("query").value=state.query;
 persist();drawField();
});
window.addEventListener("researchlens:focus-change",e=>{
 const focus=e.detail||{};
 const newField=fieldKey(focus.field);
 const newTopic=FIELDS[newField].topics.includes(focus.topic)?focus.topic:FIELDS[newField].topics[0];
 const newSubtopic=String(focus.subtopic||"").trim();
 const incomingSelected=focus.areaSelected!==false;
  if(state.field===newField&&state.topic===newTopic&&state.subtopic===newSubtopic&&state.areaSelected===incomingSelected)return;
 state.field=newField;state.topic=newTopic;state.subtopic=newSubtopic;state.areaSelected=incomingSelected;
 state.customSubtopic=!!newSubtopic&&!fieldTopics(newField,newTopic).includes(newSubtopic);
 state.query=state.areaSelected?(newSubtopic||newTopic):"";
 const arxivFrom=document.getElementById("date-from")?.value||"";
 const arxivTo=document.getElementById("date-to")?.value||"";
 if(arxivFrom||arxivTo){$("from").value=arxivFrom||arxivTo;$("to").value=arxivTo||arxivFrom;}
 $("field").value=newField;$("query").value=state.query;
 persist();drawField();page=1;search();
});
window.addEventListener("researchlens:choose-field",e=>{
 const field=fieldKey(e.detail?.field);if(state.field===field)return;
 state.field=field;state.topic=FIELDS[field].topics[0];state.subtopic="";state.areaSelected=false;state.query="";
 $("query").value=state.query;persist();drawField();page=1;search()
});
$("search-author").onclick=()=>{
 const query=$("query").value.trim();
 const details=document.getElementById("axiovo-author-details");
 const finder=document.getElementById("axiovo-author-query");
 if(!details||!finder)return;
 details.open=true;
 if(query)finder.value=query;
 details.scrollIntoView({behavior:"smooth",block:"start"});
 if(finder.value.trim().length>=2)document.getElementById("axiovo-author-form")?.requestSubmit();
 else finder.focus();
};
$("search-form").onsubmit=e=>{e.preventDefault();page=1;search()};
$("sort").onchange=()=>{page=1;search()};
$("latest").onclick=()=>{const dateParts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(p=>[p.type,p.value]));const day=dateParts.year+"-"+dateParts.month+"-"+dateParts.day;$("sort").value="publication_date:desc";$("from").value=day;$("to").value=day;page=1;search()};
$("clear-dates").onclick=()=>{$("from").value="";$("to").value="";persist();page=1;search()};
$("show-saved").onclick=()=>{showingSaved=true;setStatus("This collection is stored only in your current browser.");render()};
$("prev").onclick=()=>{if(page>1){page--;if(items[0]?.__source==="arxiv-announcement")render();else search()}};$("next").onclick=()=>{if(items[0]?.__source==="arxiv-announcement"){if(page*40<items.length){page++;render()}}else if(page*100<Math.min(total,10000)){page++;search()}};
$("export-bib").onclick=()=>{if(!saved.length){setStatus("Save a paper before exporting citations.");return}download("researchlens-reading-list.bib",saved.map(bib).join("\n"),"text/plain;charset=utf-8")};
$("export-json").onclick=()=>download("researchlens-field-reading-list.json",JSON.stringify(saved,null,2),"application/json");
const u=new URLSearchParams(location.search);if(u.get("field")&&FIELDS[u.get("field")]){state.field=u.get("field");if(!FIELDS[state.field].topics.includes(state.topic)){state.topic=FIELDS[state.field].topics[0];state.subtopic=""}$("field").value=state.field;drawField()}if(u.get("q")){$("query").value=u.get("q").slice(0,250);state.query=$("query").value}if(u.get("from"))$("from").value=u.get("from").slice(0,10);if(u.get("to"))$("to").value=u.get("to").slice(0,10);if(["relevance","publication_date:desc","cited_by_count:desc"].includes(u.get("sort")))$("sort").value=u.get("sort");const dateLink=normalizeSearchDates();persist();if(dateLink.changed)setStatus("The requested future date range was removed; searching available papers.");if($("query").value.trim()||state.field!=="general")search();
}
window.addEventListener("researchlens:scholarly-open",init,{once:true});
})();
