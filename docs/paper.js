"use strict";
const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get("id")||"";
const valid=/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7})$/i.test(id);
const issueTerm="arXiv:"+id;
const repoName="pritam-roy-99/researchlens";const curatedIssue={"2608.13942":1};
const issueSearch="https://github.com/"+repoName+"/issues?q="+encodeURIComponent("is:issue "+issueTerm);
const issueCreate="https://github.com/"+repoName+"/issues/new?"+new URLSearchParams({title:"Paper discussion: "+issueTerm,body:"### Paper\nhttps://arxiv.org/abs/"+id+"\n\n### Discussion\nPlease add technical comments, references, verification questions or follow-up results below. Reactions are not endorsements of scientific correctness.\n"});
function line(parent,label,value){const p=document.createElement("p");p.className="muted";p.textContent=label+": "+value;parent.append(p)}
function external(parent,label,url,cls="btn"){const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.className=cls;a.textContent=label;parent.append(a);return a}
function tokens(s){return new Set((String(s||"").toLowerCase().match(/[a-z]{4,}/g)||[]))}
function overlap(a,b){const x=tokens(a),y=tokens(b);if(!x.size||!y.size)return 0;return [...x].filter(t=>y.has(t)).length/Math.sqrt(x.size*y.size)}
function bibEntry(p){return "@misc{arxiv"+p.id.replace(/\W/g,"")+",\n  title={"+p.title.replace(/[{}]/g,"")+"},\n  author={"+(p.authors||[]).join(" and ")+"},\n  year={"+(p.published||"").slice(0,4)+"},\n  eprint={"+p.id+"},\n  archivePrefix={arXiv}\n}"}
function mount(p,all){
document.title=p.title+" | ResearchLens";
$("title").textContent=p.title;$("authors").textContent=(p.authors||[]).join(", ")+" · first submitted "+(p.published||"unknown").slice(0,10);
$("abstract").textContent=p.abstract||"Abstract unavailable in this index";
const links=$("links");links.replaceChildren();
external(links,"arXiv abstract ↗","https://arxiv.org/abs/"+id,"btn primary");
external(links,"PDF ↗","https://arxiv.org/pdf/"+id);
if(p.doi)external(links,"DOI ↗","https://doi.org/"+p.doi.replace(/^https?:\/\/doi.org\//,""));
external(links,"SciRate ↗","https://scirate.com/arxiv/"+id);
external(links,"Similar literature ↗","./search.html?q="+encodeURIComponent(p.title),"btn");
const e=document.createElement("button");e.className="btn";e.textContent="Copy BibTeX";e.onclick=()=>navigator.clipboard?.writeText(bibEntry(p));links.append(e);
const fields=$("fields");fields.replaceChildren();
line(fields,"arXiv ID",id);line(fields,"First submitted",p.published||"unknown");line(fields,"Last version update",p.updated||"unknown");line(fields,"arXiv categories",(p.categories||[]).join(", "));line(fields,"Inferred topics",(p.topics||[]).join(", ")||"uncategorized");
const authors=$("author-links");authors.replaceChildren();
for(const name of (p.authors||[]).slice(0,12)){const div=document.createElement("div");div.className="related";const query="https://arxiv.org/search/?"+new URLSearchParams({query:name,searchtype:"author"});external(div,name+" ↗",query,"");authors.append(div)}
const related=all.filter(x=>x.id!==id).map(x=>({paper:x,score:overlap(p.title+" "+p.abstract,x.title+" "+x.abstract)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
const list=$("related");list.replaceChildren();for(const {paper,score} of related){const d=document.createElement("div");d.className="related";external(d,paper.title,"./paper.html?id="+encodeURIComponent(paper.id),"");line(d,"Lexical match",score.toFixed(2)+" · "+paper.id);list.append(d)}
let saved=[];try{saved=JSON.parse(localStorage.getItem("researchlens-reading-list")||"[]")}catch(err){}
const b=$("save");function saveLabel(){b.textContent=saved.includes(id)?"★ Saved":"☆ Save to reading list"}saveLabel();b.onclick=()=>{saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];localStorage.setItem("researchlens-reading-list",JSON.stringify(saved));saveLabel()};
$("share").onclick=()=>navigator.clipboard?.writeText(location.href);
}
async function renderGithubComments(number){
 const root=$("github-comments");if(!root)return;root.replaceChildren();
 try{
  const url="https://api.github.com/repos/"+repoName+"/issues/"+number+"/comments?per_page=50";
  const response=await fetch(url,{headers:{Accept:"application/vnd.github+json"}});
  if(!response.ok)throw Error("GitHub API "+response.status);
  const comments=await response.json();
  const heading=document.createElement("h3");heading.textContent="Recent public comments ("+comments.length+" shown)";root.append(heading);
  if(!comments.length){line(root,"Discussion","No comments yet. Open the GitHub thread to contribute.");return}
  for(const comment of comments){
   const item=document.createElement("div");item.className="related";
   const author=document.createElement("a");author.href=comment.user?.html_url||"https://github.com";author.target="_blank";author.rel="noopener noreferrer";author.textContent="@"+(comment.user?.login||"GitHub user");item.append(author);
   const when=document.createElement("span");when.className="muted";when.textContent=" · "+(comment.created_at||"").slice(0,10);item.append(when);
   const body=document.createElement("p");body.className="abstract";body.style.fontSize="13px";body.textContent=(comment.body||"").slice(0,1800);item.append(body);
   external(item,"View or reply on GitHub ↗",comment.html_url,"");
   root.append(item);
  }
 }catch(err){line(root,"Comments","Could not retrieve GitHub comments; open the thread to read or contribute.")}
}
async function findDiscussion(){
$("new-thread").href=issueCreate;$("browse-threads").href=issueSearch;
$("report-error").href="https://github.com/"+repoName+"/issues/new?"+new URLSearchParams({title:"Metadata issue for "+issueTerm,body:"https://arxiv.org/abs/"+id+"\n\nDescribe the correction needed:"});
if(curatedIssue[id]){$("discussion-status").textContent="Dedicated paper discussion is available. Add a comment or 👍 reaction on GitHub.";const a=$("existing-thread");a.href="https://github.com/"+repoName+"/issues/"+curatedIssue[id];a.hidden=false;$("new-thread").hidden=true;renderGithubComments(curatedIssue[id]);try{const r=await fetch("https://api.github.com/repos/"+repoName+"/issues/"+curatedIssue[id]);if(r.ok){const d=await r.json();$("discussion-status").textContent="Dedicated discussion: "+(d.comments||0)+" public comments · "+(d.reactions?.["+1"]||0)+" 👍 reactions (GitHub)."}}catch(err){}return}
try{
 const url="https://api.github.com/search/issues?"+new URLSearchParams({q:"repo:"+repoName+" is:issue in:title "+issueTerm,per_page:"20"});
 const response=await fetch(url,{headers:{Accept:"application/vnd.github+json"}});
 if(!response.ok)throw Error("GitHub API "+response.status);
 const data=await response.json();const found=(data.items||[]).find(x=>x.title?.includes(issueTerm)&&x.title?.includes("Paper discussion:"));
 if(found){$("discussion-status").textContent="Public discussion is available. Comment or add a 👍 reaction on GitHub.";const a=$("existing-thread");a.href=found.html_url;a.hidden=false;$("new-thread").hidden=true;renderGithubComments(found.number)}
 else $("discussion-status").textContent="No dedicated discussion issue exists yet. Be the first to start one.";
}catch(err){$("discussion-status").textContent="GitHub discussion lookup unavailable. Use Browse discussions to find an existing thread before opening a new one."}
}
if(valid){fetch("data/feed.json",{cache:"no-cache"}).then(r=>r.json()).then(d=>{
 const all=d.papers||[],p=all.find(x=>x.id===id);
 if(p)mount(p,all);
 else{$("title").textContent="Paper not yet stored in ResearchLens";$("abstract").textContent="The paper is discoverable through arXiv; ResearchLens has a limited local index.";external($("links"),"Open original arXiv record ↗","https://arxiv.org/abs/"+id,"btn primary")}
}).catch(()=>{$("title").textContent="Paper metadata unavailable";external($("links"),"Open original arXiv record ↗","https://arxiv.org/abs/"+id)});findDiscussion();}
else{$("title").textContent="Invalid or missing arXiv identifier";$("discussion-status").textContent="Choose a paper from the research feed."}
