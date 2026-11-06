"use strict";
/* This is a browser-local researcher dashboard; no private data is uploaded. */
(()=>{
const $=id=>document.getElementById(id);
const archive=window.AxiovoArchiveData;
const META_KEY="axiovo-library-metadata-v1";
const OLD_KEY="axiovo-reading-list";
const FIELD_KEY="axiovo-field-saved-v1";
const PROJECT_KEY="axiovo-research-projects-v1";
const COLLECTION_KEY="axiovo-paper-collections-v1";
let activeCollection="all";
let libraryPage=1;
const LIBRARY_PAGE_SIZE=50;
function collections(){const val=read(COLLECTION_KEY,[]);return Array.isArray(val)?val.filter(x=>x&&typeof x.name==="string"&&Array.isArray(x.paper_keys)):[]}
const libraryStatus=message=>{$("library-status").textContent=message};
function collectionUI(){
 const controls=$("library-search")?.parentElement;
 if(!controls||$("axiovo-collection-filter"))return;
 const wrap=document.createElement("div");wrap.className="axiovo-collection-controls";
 const select=document.createElement("select");select.id="axiovo-collection-filter";select.setAttribute("aria-label","Filter research collection");
 const create=document.createElement("button");create.type="button";create.className="rl-button secondary";create.textContent="+ New collection";
 create.onclick=()=>{
  const name=prompt("Name your paper collection");
  if(!name||!name.trim())return;
  const n=name.trim().slice(0,90);const items=collections();
  if(items.some(x=>x.name.toLowerCase()===n.toLowerCase()))return;
  const id="collection-"+Date.now().toString(36);
  items.push({id,name:n,paper_keys:[]});
  if(!write(COLLECTION_KEY,items)){libraryStatus("Could not save the collection on this device.");return}
  activeCollection=id;updateCollectionFilter();renderLibrary();
 };
 select.onchange=()=>{activeCollection=select.value;libraryPage=1;renderLibrary()};
 wrap.append(select,create);controls.append(wrap);updateCollectionFilter();
}
function updateCollectionFilter(){
 const select=$("axiovo-collection-filter");if(!select)return;
 select.replaceChildren();
 const a=document.createElement("option");a.value="all";a.textContent="All collections";select.append(a);
 for(const c of collections()){const o=document.createElement("option");o.value=c.id;o.textContent=c.name+" ("+c.paper_keys.length+")";select.append(o)}
 if(activeCollection!=="all"&&!collections().some(x=>x.id===activeCollection))activeCollection="all";
 select.value=activeCollection;
}

function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}}
function write(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true}catch{return false}}
const statuses=new Set(["to-read","reading","done","cited"]); // done means reviewed in existing saved data
function readMetadata(){
 const current=read(META_KEY,{});
 return current&&typeof current==="object"&&!Array.isArray(current)?current:{};
}
let metadata=readMetadata();
let lookup=new Map(),recent=[],storedFeed=[];
const indexedById=new Map(),indexedByBase=new Map();
const paperKey=w=>w.key||w.arxiv_id&&"arxiv:"+w.arxiv_id||w.id&&"openalex:"+w.id||"";
const arxivID=raw=>window.AxiovoArxiv?.parse(raw)?.requested||"";
function normalizeArxiv(p,requestedId){const id=arxivID(requestedId||p.id)||arxivID(p.link);if(!id)return null;return{key:"arxiv:"+id,arxiv_id:id,title:p.title||("arXiv:"+id),authors:p.authors||[],date:p.published||p.date||"",abstract:p.abstract||"",source:"arxiv",url:window.AxiovoArxiv.abs(id),doi:p.doi||"",citations:p.citations??null}}
function normalizeOpenAlex(p){if(!p||typeof p!=="object")return null;const id=typeof p.id==="string"&&/^https:\/\/openalex.org\//.test(p.id)?p.id:null;if(!id)return null;
const a=(p.authorships||[]).map(x=>x.author?.display_name).filter(Boolean);const link=(p.best_oa_location?.landing_page_url||p.doi||id);
return {key:"openalex:"+id,title:p.display_name||p.title||"Untitled research",authors:a,date:String(p.publication_year||""),source:"openalex",url:link,doi:p.doi||"",openalex_id:id}}
function library(){
 const list=new Map();
 const cached=new Map((archive?.savedRecords("arxiv")||[]).map(p=>[p.recordId,p]));
 const local=read(OLD_KEY,[]);
 if(Array.isArray(local))for(const raw of local){
  const parsed=window.AxiovoArxiv.parse(raw);
  if(!parsed)continue;
  const id=parsed.requested;
  const indexed=parsed.explicit?indexedById.get(id):indexedByBase.get(parsed.base);
  list.set("arxiv:"+id,normalizeArxiv(cached.get(id)||indexed||{id},id));
 }
 for(const source of ["biorxiv","chemrxiv"])for(const p of archive?.savedRecords(source)||[]){
  const key=archive.recordKey(p);list.set(key,{...p,key});
 }
 const ext=read(FIELD_KEY,[]);if(Array.isArray(ext))for(const paper of ext){const p=normalizeOpenAlex(paper);if(p){const match=paper.locations?.map(x=>arxivID(x.landing_page_url||x.pdf_url)).find(Boolean);if(match&&list.has("arxiv:"+match))continue;list.set(p.key,p)}}
 return [...list.values()].filter(Boolean);
}
function text(parent,tag,value,className){const el=document.createElement(tag);el.textContent=String(value??"");if(className)el.className=className;parent.append(el);return el}
function link(parent,label,url){if(!/^https:\/\//.test(url||""))return;const a=text(parent,"a",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer"}
function download(filename,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function bib(p){const a=(p.authors||[]).join(" and ").replace(/[{}]/g,"");const key=(p.authors?.[0]?.split(" ").slice(-1)[0]||"research").replace(/\W/g,"")+"_"+(p.date||"nd").slice(0,4)+"_"+(p.title||"work").split(/\W+/).slice(0,2).join("");let out="@article{"+key+",\n  title = {"+p.title.replace(/[{}]/g,"")+"},\n  author = {"+a+"},\n  year = {"+(p.date||"").slice(0,4)+"},\n";if(p.arxiv_id)out+="  eprint = {"+p.arxiv_id+"},\n  archivePrefix = {arXiv},\n";if(p.doi)out+="  doi = {"+p.doi.replace(/^https:\/\/doi.org\//,"")+"},\n";out+="  url = {"+p.url+"}\n}\n";return out}
function fillFocus(){
 const prefs=window.AxiovoFeedPreferences?.derive(localStorage);
 const count=(prefs?.directTopics.length||0)+(prefs?.paths.length||0);
 $("focus-name").textContent="Your research interests";
 $("focus-summary").textContent=count?count+" topics or paths selected on this device.":"Follow a topic in My Feed or save a path in Discover.";
}
function paperCard(p){const art=document.createElement("article");art.className="rl-paper";const h=document.createElement("h3");const a=document.createElement("a");a.href=p.url;a.textContent=p.title;a.target="_blank";a.rel="noopener noreferrer";h.append(a);art.append(h);
text(art,"p",(p.authors||[]).slice(0,4).join(", ")+(p.authors?.length>4?" et al.":"")+(p.date?" · "+p.date.slice(0,10):""),"rl-paper-meta");
const r=text(art,"div","","rl-paper-actions");if(p.arxiv_id){const detail=document.createElement("a");detail.href="./paper.html?id="+encodeURIComponent(p.arxiv_id);detail.textContent="Paper details";detail.className="rl-paper-primary";r.append(detail)}link(r,"Original "+(archive?.names[p.source]||"source")+" record",p.url);
if(p.abstract&&window.AxiovoAbstractAudio){const listen=text(r,"button","Listen to abstract","rl-button secondary");listen.type="button";listen.onclick=()=>window.AxiovoAbstractAudio.play([p])}
if(p.arxiv_id){const cop=document.createElement("a");cop.href="./copilot.html?id="+encodeURIComponent(p.arxiv_id);cop.textContent="Research Assistant";r.append(cop)}
return art}
function showRecent(){const root=$("recent-list");if(!root)return;root.replaceChildren();const pick=window.AxiovoPaperSort?.sort(storedFeed,$("recent-papers-sort")?.value||"recent")||storedFeed;
recent=pick.slice(0,6).map(normalizeArxiv).filter(Boolean);
if(!recent.length){text(root,"div","No recent papers in the latest synced announcements. Search the historical arXiv-linked index in Discover.","rl-empty");return}
for(const p of recent)root.append(paperCard(p))
}
function saveMeta(key,value){
 const next=readMetadata();
 next[key]={...(next[key]||{status:"to-read",note:""}),...value};
 if(!write(META_KEY,next)){libraryStatus("Could not save this change on this device.");return false}
 metadata=next;libraryStatus("Library updated on this device.");return true;
}
function renderLibrary(){const root=$("library-list");root.replaceChildren();const q=$("library-search").value.trim().toLowerCase(),status=$("library-filter").value;const papers=library();lookup=new Map(papers.map(p=>[p.key,p]));$("library-count").textContent=papers.length+" papers";
const source=$("library-source").value;
const allCollections=collections();const selectedCollection=allCollections.find(x=>x.id===activeCollection);const filtered=(window.AxiovoPaperSort?.sort(papers,$("library-papers-sort")?.value||"recent")||papers).filter(p=>(source==="all"||p.source===source)&&(!selectedCollection||selectedCollection.paper_keys.includes(p.key))&&(status==="all"||(metadata[p.key]?.status||"to-read")===status)&&(!q||[p.title,(p.authors||[]).join(" "),p.arxiv_id||p.doi||"",metadata[p.key]?.note||"",...allCollections.filter(c=>c.paper_keys.includes(p.key)).map(c=>c.name)].join(" ").toLowerCase().includes(q)));
const listen=$("listen-library");listen.hidden=!window.AxiovoAbstractAudio||!filtered.some(p=>p.abstract);listen.onclick=()=>window.AxiovoAbstractAudio?.play(filtered.slice(0,50));
if(!filtered.length){text(root,"div",papers.length?"No saved papers match these filters.":"No saved papers yet. Discover a paper and save it to your Library.","rl-empty");return}
libraryPage=Math.max(1,Math.min(libraryPage,Math.ceil(filtered.length/LIBRARY_PAGE_SIZE)));
 for(const p of filtered.slice((libraryPage-1)*LIBRARY_PAGE_SIZE,libraryPage*LIBRARY_PAGE_SIZE)){
 const art=paperCard(p);
 const details=text(art,"details","","library-paper-notes");
 const labels={"to-read":"To read",reading:"Reading",done:"Reviewed",cited:"Cited"};
 const summary=text(details,"summary","Notes and organization · "+(labels[metadata[p.key]?.status]||"To read"));
 const row=text(details,"div","","rl-entry-tools");
 const collectionsSelect=document.createElement("select");collectionsSelect.setAttribute("aria-label","Assign "+p.title+" to a collection");
 const first=document.createElement("option");first.value="";first.textContent="Add to collection…";collectionsSelect.append(first);
 for(const c of collections()){const opt=document.createElement("option");opt.value=c.id;opt.textContent=(c.paper_keys.includes(p.key)?"✓ ":"")+c.name;collectionsSelect.append(opt)}
 collectionsSelect.onchange=()=>{
  const items=collections(),c=items.find(x=>x.id===collectionsSelect.value);if(!c)return;
  if(c.paper_keys.includes(p.key))c.paper_keys=c.paper_keys.filter(x=>x!==p.key);
  else c.paper_keys.push(p.key);
  if(!write(COLLECTION_KEY,items)){libraryStatus("Could not update the collection on this device.");return}
  updateCollectionFilter();renderLibrary();
 };
 row.append(collectionsSelect);

 const select=document.createElement("select");select.setAttribute("aria-label","Reading status for "+p.title);
 for(const [v,t] of [["to-read","To read"],["reading","Reading"],["done","Reviewed"],["cited","Cited"]]){const opt=document.createElement("option");opt.value=v;opt.textContent=t;select.append(opt)}
 select.value=statuses.has(metadata[p.key]?.status)?metadata[p.key].status:"to-read";
 select.onchange=()=>{if(!saveMeta(p.key,{status:select.value}))return;summary.textContent="Notes and organization · "+labels[select.value];if(status!=="all")renderLibrary()};
 const note=document.createElement("textarea");note.rows=2;note.maxLength=2000;note.placeholder="Private reading note, e.g. check Theorem 2";note.setAttribute("aria-label","Private note for "+p.title);note.value=metadata[p.key]?.note??(p.source==="biorxiv"?read("axiovo-biorxiv-notes-v1",{})[p.doi]||"":"");
 note.onchange=()=>saveMeta(p.key,{note:note.value});row.append(select,note);
 if(archive?.names[p.source]){
  const remove=text(row,"button","Remove from Library","rl-button secondary");remove.type="button";
  remove.onclick=()=>{libraryStatus(archive.unsave(p)?"Paper removed from Library.":"Could not remove this paper on this device.")};
 }
 if(p.arxiv_id){
  const projectOptions=read(PROJECT_KEY,[]);
  const projects=Array.isArray(projectOptions)?projectOptions.filter(x=>x&&x.id&&x.title):[];
  const wrap=text(row,"div","","axiovo-library-project");
  const title=text(wrap,"label","Research question");
  const project=document.createElement("select");
  title.htmlFor="axiovo-project-"+p.arxiv_id;project.id=title.htmlFor;
  project.setAttribute("aria-label","Attach "+p.title+" to research question");
  let empty=document.createElement("option");empty.value="";empty.textContent=projects.length?"Choose question…":"Add a question in Research questions below";project.append(empty);
  const base=window.AxiovoArxiv?.base(p.arxiv_id)||p.arxiv_id;
  for(const q of projects){const opt=document.createElement("option");opt.value=q.id;opt.textContent=q.title;
   if(Array.isArray(q.paper_ids)&&q.paper_ids.includes(base))opt.textContent="✓ "+q.title+" (linked)";
   project.append(opt)}
  project.disabled=!projects.length;
  project.onchange=()=>{
   const id=project.value;
   const stored=read(PROJECT_KEY,[]);
   if(!Array.isArray(stored))return;
   const found=stored.find(x=>x.id===id);if(!found)return;
   const ids=Array.isArray(found.paper_ids)?found.paper_ids:[];
   found.paper_ids=[...new Set([...ids,base])].slice(0,200);
   found.updated_at=new Date().toISOString();
   if(write(PROJECT_KEY,stored)){
    window.dispatchEvent(new Event("axiovo:projects-updated"));
    renderLibrary();
   }
  };
  wrap.append(project);
 }
 root.append(art);
}
if(filtered.length>LIBRARY_PAGE_SIZE){
  const nav=text(root,"nav","","axiovo-library-pagination");
  nav.setAttribute("aria-label","Saved paper results pages");
  const first=(libraryPage-1)*LIBRARY_PAGE_SIZE+1,last=Math.min(filtered.length,libraryPage*LIBRARY_PAGE_SIZE);
  const prev=text(nav,"button","Previous 50","rl-button secondary");
  prev.type="button";prev.disabled=libraryPage===1;prev.onclick=()=>{libraryPage--;renderLibrary();document.getElementById("library-list")?.scrollIntoView({block:"start"});};
  const count=text(nav,"span","Showing "+first+"–"+last+" of "+filtered.length+" matching papers · Page "+libraryPage+" of "+Math.ceil(filtered.length/LIBRARY_PAGE_SIZE),"rl-subtext");
  count.setAttribute("role","status");
  const next=text(nav,"button","Next 50","rl-button secondary");
  next.type="button";next.disabled=last>=filtered.length;next.onclick=()=>{libraryPage++;renderLibrary();document.getElementById("library-list")?.scrollIntoView({block:"start"});};
 }
}
function init(){
 fillFocus();collectionUI();$("library-search").addEventListener("input",()=>{libraryPage=1;renderLibrary()});$("library-filter").addEventListener("change",()=>{libraryPage=1;renderLibrary()});$("library-source").addEventListener("change",()=>{libraryPage=1;renderLibrary()});
 $("quick-search").addEventListener("submit",e=>{
 e.preventDefault();const q=$("research-query").value.trim();if(!q)return;
 const input=document.getElementById("scholar-query"),form=document.getElementById("scholar-search-form"),source=document.getElementById("rl-source-scholarly");
 if(!input||!form||!source){location.href="./desk.html?q="+encodeURIComponent(q);return}
 source.click();input.value=q;
 const target=new URL(location.href);target.searchParams.set("view","scholarly");target.searchParams.set("q",q);target.hash="discover";
 history.replaceState({source:"scholarly"},"",target.href);window.dispatchEvent(new Event("axiovo:navigate"));
 form.requestSubmit();
});
 $("export-library").onclick=()=>{const papers=library();if(!papers.length){$("library-count").textContent="No papers to export";return}download("axiovo-library.json",JSON.stringify({version:2,exported_at:new Date().toISOString(),papers,metadata,collections:collections(),research_projects:read(PROJECT_KEY,[])},null,2),"application/json")};
 $("export-citations").onclick=()=>{
  const papers=library();if(!papers.length){libraryStatus("No saved papers to export.");return}
  const format=$("axiovo-citation-format")?.value||"bibtex";
  const adapter=window.AxiovoCitationFormats;
  if(!adapter){libraryStatus("Citation exporter is unavailable. Try reloading.");return}
  const validated=[],skipped=[];
  for(const p of papers){
   try{
    const source=String(p.source||"").toLowerCase();
    const input={...p,source,source_id:p.arxiv_id||p.doi||p.id||p.recordId,
      version:p.version??(p.arxiv_id?.match(/v(\d+)$/)?.[1]?Number(p.arxiv_id.match(/v(\d+)$/)[1]):null),
      landing_url:p.url,submitted_date:p.date};
    adapter.normalize(input);validated.push(input);
   }catch(_error){skipped.push(p.title||p.key||"Unidentified paper")}
  }
  if(!validated.length){libraryStatus("No source-verified archive records available for citation export.");return}
  try{
   const content=adapter.exportAs(validated,format);
   const formats={bibtex:["bib","text/plain"],ris:["ris","application/x-research-info-systems"],
     "csl-json":["json","application/json"]};
   const [extension,mime]=formats[format]||formats.bibtex;
   download("axiovo-library."+extension,content,mime);
   libraryStatus("Exported "+validated.length+" source-linked papers as "+format+
     (skipped.length?"; "+skipped.length+" unsupported records were not invented.":"."));
  }catch(error){libraryStatus("Citation export unavailable: "+String(error.message||error))}
 };
 renderLibrary();
 let feedRequested=false;
 function resolveLegacyPaperTitles(){
  const ids=read(OLD_KEY,[]);
  const cached=new Set(archive.savedRecords("arxiv").map(p=>p.recordId));
  if(feedRequested||!$("recent-list")&&(!Array.isArray(ids)||!ids.some(id=>!cached.has(arxivID(id)))))return;
  feedRequested=true;
  fetch("./data/feed.json",{cache:"no-cache",signal:AbortSignal.timeout(9000)}).then(r=>{
   if(!r.ok)throw Error("HTTP "+r.status);
   return r.json();
  }).then(data=>{
   storedFeed=Array.isArray(data.papers)?data.papers:[];
   for(const raw of storedFeed){
    const paper=archive.normalize("arxiv",raw);
    if(!paper)continue;
    indexedById.set(paper.recordId,paper);
    indexedByBase.set(paper.id,paper);
   }
   showRecent();renderLibrary();
  }).catch(()=>libraryStatus("Some older titles are unavailable. Their saved links and notes are still accessible."));
 }
 resolveLegacyPaperTitles();
 window.addEventListener("storage",()=>{metadata=readMetadata();fillFocus();updateCollectionFilter();renderLibrary()});
 $("library-papers-sort")?.addEventListener("change",renderLibrary);
 $("recent-papers-sort")?.addEventListener("change",showRecent);
 window.addEventListener("axiovo-library-change",()=>{resolveLegacyPaperTitles();renderLibrary()});
 window.addEventListener("axiovo:projects-updated",renderLibrary);
 window.addEventListener("axiovo:workspace-activated",()=>{fillFocus();renderLibrary()});
}
init();
})();
