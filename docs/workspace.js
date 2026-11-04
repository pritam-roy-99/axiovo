"use strict";
/* This is a browser-local researcher dashboard; no private data is uploaded. */
(()=>{
const $=id=>document.getElementById(id);
const META_KEY="researchlens-library-metadata-v1";
const OLD_KEY="researchlens-reading-list";
const FIELD_KEY="researchlens-field-saved-v1";
const PROJECT_KEY="researchlens-research-projects-v1";
const fieldPrefs=()=>{
 try{const p=JSON.parse(localStorage.getItem("researchlens-field-explorer-v1")||"{}");return p&&typeof p==="object"?p:{}}catch{return{}}};
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}}
function write(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true}catch{return false}}
const statuses=new Set(["to-read","reading","done"]);
let metadata=read(META_KEY,{});if(!metadata||typeof metadata!=="object"||Array.isArray(metadata))metadata={};
let lookup=new Map(),recent=[],storedFeed=[];
const paperKey=w=>w.key||w.arxiv_id&&"arxiv:"+w.arxiv_id||w.id&&"openalex:"+w.id||"";
const arxivID=raw=>window.ResearchLensArxiv?.parse(raw)?.requested||"";
function normalizeArxiv(p,requestedId){const id=arxivID(requestedId||p.id)||arxivID(p.link);if(!id)return null;return{key:"arxiv:"+id,arxiv_id:id,title:p.title||("arXiv:"+id),authors:p.authors||[],date:p.published||"",url:window.ResearchLensArxiv.abs(id),doi:p.doi||""}}
function normalizeOpenAlex(p){if(!p||typeof p!=="object")return null;const id=typeof p.id==="string"&&/^https:\/\/openalex.org\//.test(p.id)?p.id:null;if(!id)return null;
const a=(p.authorships||[]).map(x=>x.author?.display_name).filter(Boolean);const link=(p.best_oa_location?.landing_page_url||p.doi||id);
return {key:"openalex:"+id,title:p.display_name||p.title||"Untitled research",authors:a,date:String(p.publication_year||""),url:link,doi:p.doi||"",openalex_id:id}}
function library(){
 const list=new Map();
 const local=read(OLD_KEY,[]);if(Array.isArray(local))for(const raw of local){const id=arxivID(raw);if(id)list.set("arxiv:"+id,normalizeArxiv(storedFeed.find(x=>window.ResearchLensArxiv?.base(x.id)===window.ResearchLensArxiv?.base(id))||{id},id))}
 const ext=read(FIELD_KEY,[]);if(Array.isArray(ext))for(const paper of ext){const p=normalizeOpenAlex(paper);if(p){const match=paper.locations?.map(x=>arxivID(x.landing_page_url||x.pdf_url)).find(Boolean);if(match&&list.has("arxiv:"+match))continue;list.set(p.key,p)}}
 return [...list.values()].filter(Boolean);
}
function text(parent,tag,value,className){const el=document.createElement(tag);el.textContent=String(value??"");if(className)el.className=className;parent.append(el);return el}
function link(parent,label,url){if(!/^https:\/\//.test(url||""))return;const a=text(parent,"a",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer"}
function download(filename,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function bib(p){const a=(p.authors||[]).join(" and ").replace(/[{}]/g,"");const key=(p.authors?.[0]?.split(" ").slice(-1)[0]||"research").replace(/\W/g,"")+"_"+(p.date||"nd").slice(0,4)+"_"+(p.title||"work").split(/\W+/).slice(0,2).join("");let out="@article{"+key+",\n  title = {"+p.title.replace(/[{}]/g,"")+"},\n  author = {"+a+"},\n  year = {"+(p.date||"").slice(0,4)+"},\n";if(p.arxiv_id)out+="  eprint = {"+p.arxiv_id+"},\n  archivePrefix = {arXiv},\n";if(p.doi)out+="  doi = {"+p.doi.replace(/^https:\/\/doi.org\//,"")+"},\n";out+="  url = {"+p.url+"}\n}\n";return out}
function fillFocus(){const p=fieldPrefs();const names={general:"All research disciplines",quantum:"Quantum information & physics",statmech:"Statistical mechanics",condmat:"Condensed matter physics",highenergy:"High-energy physics & particle physics",mathematics:"Mathematics",astrophysics:"Astronomy & astrophysics",computer:"Computer science & AI",biology:"Biology & bioinformatics",medicine:"Medicine & public health",chemistry:"Chemistry & materials",engineering:"Engineering & robotics",social:"Social sciences & economics"};const label=names[p.field]||"Choose your research field";$("focus-name").textContent=label;const API=window.ResearchLensInterests;const followed=API?.get(read(API.KEY,{}),p.field||"general",p.topic||"")||[];$("focus-summary").textContent=(p.subtopic?"Current interest: "+p.topic+" / "+p.subtopic+". ":p.topic?"Current area: "+p.topic+". ":"Choose a field and area in Discover. ")+(followed.length?"Following: "+followed.slice(0,3).join(", ")+(followed.length>3?" and more.":"."):"Star specialized interests in Discover to personalize recommendations.");}
function paperCard(p){const art=document.createElement("article");art.className="rl-paper";const h=document.createElement("h3");const a=document.createElement("a");a.href=p.url;a.textContent=p.title;a.target="_blank";a.rel="noopener noreferrer";h.append(a);art.append(h);
text(art,"p",(p.authors||[]).slice(0,4).join(", ")+(p.authors?.length>4?" et al.":"")+(p.date?" · "+p.date.slice(0,10):""),"rl-paper-meta");
const r=text(art,"div","","rl-paper-actions");link(r,"Read on arXiv",p.url);
if(p.arxiv_id){const cop=document.createElement("a");cop.href="./copilot.html?id="+encodeURIComponent(p.arxiv_id);cop.textContent="Research Assistant";r.append(cop)}
return art}
function showRecent(){const root=$("recent-list");if(!root)return;root.replaceChildren();const p=fieldPrefs();const query=String(p.subtopic||p.topic||"").trim().toLowerCase();let pick=storedFeed.slice().sort((a,b)=>String(b.published||"").localeCompare(String(a.published||"")));
if(query){const terms=query.split(/\s+/).filter(t=>t.length>3);const relevant=pick.filter(w=>terms.some(t=>(w.title+" "+(w.abstract||"")).toLowerCase().includes(t)));if(relevant.length>=2)pick=relevant}
recent=pick.slice(0,6).map(normalizeArxiv).filter(Boolean);
if(!recent.length){text(root,"div","No recent papers in the latest synced announcements. Search the historical arXiv-linked index in Discover.","rl-empty");return}
for(const p of recent)root.append(paperCard(p))
}
function saveMeta(key,value){metadata[key]={...(metadata[key]||{status:"to-read",note:""}),...value};write(META_KEY,metadata)}
function renderLibrary(){const root=$("library-list");root.replaceChildren();const q=$("library-search").value.trim().toLowerCase(),status=$("library-filter").value;const papers=library();lookup=new Map(papers.map(p=>[p.key,p]));$("library-count").textContent=papers.length+" papers";
const filtered=papers.filter(p=>(status==="all"||(metadata[p.key]?.status||"to-read")===status)&&(!q||[p.title,(p.authors||[]).join(" "),p.arxiv_id||""].join(" ").toLowerCase().includes(q)));
if(!filtered.length){text(root,"div",papers.length?"No saved papers match these filters.":"No saved papers yet. Discover a paper and save it to your Library.","rl-empty");return}
for(const p of filtered.slice(0,50)){
 const art=paperCard(p);const row=text(art,"div","","rl-entry-tools");
 const select=document.createElement("select");select.setAttribute("aria-label","Reading status for "+p.title);
 for(const [v,t] of [["to-read","To read"],["reading","Reading"],["done","Finished"]]){const opt=document.createElement("option");opt.value=v;opt.textContent=t;select.append(opt)}
 select.value=statuses.has(metadata[p.key]?.status)?metadata[p.key].status:"to-read";
 select.onchange=()=>{saveMeta(p.key,{status:select.value});if(status!=="all")renderLibrary()};
 const note=document.createElement("textarea");note.rows=2;note.maxLength=2000;note.placeholder="Private reading note, e.g. check Theorem 2";note.setAttribute("aria-label","Private note for "+p.title);note.value=metadata[p.key]?.note||"";
 note.onchange=()=>saveMeta(p.key,{note:note.value});row.append(select,note);
 if(p.arxiv_id){
  const projectOptions=read(PROJECT_KEY,[]);
  const projects=Array.isArray(projectOptions)?projectOptions.filter(x=>x&&x.id&&x.title):[];
  const wrap=text(row,"div","","axiovo-library-project");
  const title=text(wrap,"label","Research question");
  const project=document.createElement("select");
  title.htmlFor="axiovo-project-"+p.arxiv_id;project.id=title.htmlFor;
  project.setAttribute("aria-label","Attach "+p.title+" to research question");
  let empty=document.createElement("option");empty.value="";empty.textContent=projects.length?"Choose question…":"Create a research question above";project.append(empty);
  const base=window.ResearchLensArxiv?.base(p.arxiv_id)||p.arxiv_id;
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
if(filtered.length>50)text(root,"p","Showing the first 50 matching saved papers. Narrow the search to find more.","rl-subtext")
}
function init(){
 fillFocus();$("library-search").addEventListener("input",renderLibrary);$("library-filter").addEventListener("change",renderLibrary);
 $("quick-search").addEventListener("submit",e=>{
 e.preventDefault();const q=$("research-query").value.trim();if(!q)return;
 const input=document.getElementById("scholar-query"),form=document.getElementById("scholar-search-form"),source=document.getElementById("rl-source-scholarly");
 if(!input||!form||!source){location.href="./?view=scholarly&q="+encodeURIComponent(q)+"#discover";return}
 source.click();input.value=q;
 const target=new URL(location.href);target.searchParams.set("view","scholarly");target.searchParams.set("q",q);target.hash="discover";
 history.replaceState({source:"scholarly"},"",target.href);window.dispatchEvent(new Event("axiovo:navigate"));
 form.requestSubmit();
});
 $("export-library").onclick=()=>{const papers=library();if(!papers.length){$("library-count").textContent="No papers to export";return}download("axiovo-library.json",JSON.stringify({version:1,exported_at:new Date().toISOString(),papers,metadata},null,2),"application/json")};
 $("export-citations").onclick=()=>{const papers=library();if(!papers.length){$("library-count").textContent="No papers to export";return}download("axiovo-library.bib",papers.map(bib).join("\n"),"text/plain")};
 renderLibrary();
 fetch("./data/feed.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{storedFeed=Array.isArray(data.papers)?data.papers:[];if($("feed-status"))$("feed-status").textContent= "Latest arXiv announcements: "+storedFeed.length+" records · refreshed "+(data.generated_at?new Date(data.generated_at).toLocaleString():"date unavailable");showRecent();renderLibrary()}).catch(()=>{if($("feed-status"))$("feed-status").textContent="Recent feed is temporarily unavailable. Saved papers are still accessible.";if($("recent-list"))text($("recent-list"),"div","Please try the arXiv feed from the navigation.","rl-empty")});
 window.addEventListener("storage",()=>{fillFocus();renderLibrary()});
 window.addEventListener("researchlens-library-change",renderLibrary);
 window.addEventListener("axiovo:projects-updated",renderLibrary);
 window.addEventListener("researchlens:workspace-activated",()=>{fillFocus();renderLibrary()});
}
init();
})();
