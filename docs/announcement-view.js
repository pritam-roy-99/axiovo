/* Official announcement-date browsing, independent of arXiv's submission-date cache.
 * No first-submission timestamps are inferred from RSS announcement dates.
 */
(function(){
"use strict";
const PAGE_SIZE=40;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function start(){
 if(document.body.classList.contains("axiovo-home"))return;
 const main=document.getElementById("local-feed-view"),history=document.getElementById("history-view");
 const parent=main?.parentElement;
 if(!main||!parent)return;
 const section=document.createElement("section");section.id="axiovo-announcement-view";section.hidden=true;
 section.innerHTML='<div class="row" style="align-items:center;justify-content:space-between;margin-bottom:14px"><h2 style="font-size:20px;margin:0">Latest official arXiv announcements</h2><button class="btn" id="axiovo-return-feed">Return to rolling feed</button></div><p id="axiovo-announcement-status" class="small" role="status">Loading official arXiv announcement feed…</p><div class="row" style="margin:12px 0"><input id="axiovo-announcement-query" type="search" placeholder="Filter today’s announced papers" aria-label="Filter announced papers" style="max-width:420px"><select id="axiovo-announcement-category" aria-label="Filter arXiv archive" style="max-width:220px"><option value="">All archives</option></select></div><div id="axiovo-announcement-cards"></div><div id="axiovo-announcement-pages" class="row" style="justify-content:center;align-items:center;margin:16px 0"></div>';
 parent.prepend(section);
 const button=document.createElement("button");
 button.className="btn primary";button.type="button";button.id="axiovo-announcement-button";
 button.textContent="Latest arXiv announcements";
 const dates=document.getElementById("date-today");
 if(dates){dates.parentElement.insertBefore(button,dates);dates.textContent="Today’s announcements"}
 const status=section.querySelector("#axiovo-announcement-status"),cards=section.querySelector("#axiovo-announcement-cards"),pages=section.querySelector("#axiovo-announcement-pages");
 const query=section.querySelector("#axiovo-announcement-query"),category=section.querySelector("#axiovo-announcement-category");
 let snapshot=null, page=0;
 const dateLabel=d=>/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d||"")?d:"unavailable";
 function save(id,control){
  let ids=[];try{ids=JSON.parse(localStorage.getItem("axiovo-reading-list")||"[]")}catch{}
  if(!Array.isArray(ids))ids=[];
  if(ids.includes(id))ids=ids.filter(x=>x!==id);else ids.push(id);
  try{localStorage.setItem("axiovo-reading-list",JSON.stringify(ids))}catch{return}
  control.textContent=ids.includes(id)?"✓ Saved":"☆ Save paper";
  window.dispatchEvent(new Event("axiovo-library-change"));
 }
 function draw(){
  cards.replaceChildren();pages.replaceChildren();
  if(!snapshot)return;
  const q=query.value.toLowerCase().trim(),cat=category.value;
  const visible=(snapshot.papers||[]).filter(p=>(!cat||(p.categories||[]).includes(cat))&&(!q||[p.title,p.abstract,p.id,(p.authors||[]).join(" ")].join(" ").toLowerCase().includes(q)));
  const n=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));page=Math.min(page,n-1);
  status.textContent="arXiv announcement "+dateLabel(snapshot.announcement_date)+" · "+visible.length.toLocaleString()+" matching of "+snapshot.count.toLocaleString()+" indexed papers · "+(snapshot.complete?"All archive feeds returned consistently":"PARTIAL: not all archive feeds verified")+". RSS updates at midnight US Eastern, after the official announcement.";
  for(const p of visible.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)){
   const el=document.createElement("article");el.className="paper";
   const type=String(p.announce_type||"unspecified");
   const tags=(p.categories||[]).map(c=>'<span class="category">'+esc(c)+'</span>').join(" ");
   el.innerHTML='<div class="row">'+tags+'<span class="small">Announce type: '+esc(type)+'</span></div><h2>'+esc(p.title)+'</h2><div class="meta">'+esc((p.authors||[]).join(", "))+' · Announced: '+esc(p.announcement_date)+' · arXiv:'+esc(p.id)+'</div><p>'+esc(p.abstract||"Abstract not included in RSS")+'</p>';
   const row=document.createElement("div");row.className="row";
   const link=document.createElement("a");link.className="btn primary";link.href="https://arxiv.org/abs/"+encodeURIComponent(p.id);link.target="_blank";link.rel="noopener noreferrer";link.textContent="Read arXiv paper";row.append(link);
   const assist=document.createElement("a");assist.className="btn";assist.href="./copilot.html?id="+encodeURIComponent(p.id);assist.textContent="Research Assistant";row.append(assist);
   const saved=document.createElement("button");saved.className="btn";saved.type="button";
   let ids=[];try{ids=JSON.parse(localStorage.getItem("axiovo-reading-list")||"[]")}catch{}
   saved.textContent=ids.includes(p.id)?"✓ Saved":"☆ Save paper";
   saved.addEventListener("click",()=>save(p.id,saved));row.append(saved);
   el.append(row);cards.append(el);
  }
  if(!visible.length){const empty=document.createElement("div");empty.className="empty";empty.textContent="No matching papers in this official RSS snapshot. Try another archive or query.";cards.append(empty)}
  const prev=document.createElement("button");prev.className="btn";prev.textContent="Previous";prev.disabled=page===0;prev.onclick=()=>{page--;draw()};
  const next=document.createElement("button");next.className="btn";next.textContent="Next";next.disabled=page===n-1;next.onclick=()=>{page++;draw()};
  const counter=document.createElement("span");counter.className="small";counter.textContent="Page "+(page+1)+" of "+n;
  pages.append(prev,counter,next);
 }
 async function open(){
  main.hidden=true;if(history)history.hidden=true;section.hidden=false;
  section.scrollIntoView({behavior:"smooth",block:"start"});
  if(snapshot){draw();return}
  try{
   const response=await fetch("./data/announcements.json?fresh="+Date.now(),{cache:"no-store"});
   if(!response.ok)throw Error("HTTP "+response.status);
   const data=await response.json();
   if(!Array.isArray(data.papers)||!data.papers.length||!data.announcement_date)throw Error("No validated announcement batch");
   snapshot=data;
   const archives=[...new Set(data.papers.flatMap(p=>p.categories||[]))].sort();
   for(const a of archives){const opt=document.createElement("option");opt.value=a;opt.textContent=a;category.append(opt)}
   draw();
  }catch(e){
   status.textContent="The official announcement snapshot has not been harvested yet. Check the GitHub Actions synchronization logs.";
   cards.replaceChildren();
   const link=document.createElement("a");link.className="btn primary";link.textContent="Open arXiv’s official new-paper list";link.href="https://arxiv.org/list/quant-ph/new";link.target="_blank";link.rel="noopener noreferrer";cards.append(link);
  }
 }
 function close(){section.hidden=true;main.hidden=false}
 button.addEventListener("click",open);
 section.querySelector("#axiovo-return-feed").addEventListener("click",close);
 query.addEventListener("input",()=>{page=0;draw()});
 category.addEventListener("change",()=>{page=0;draw()});
 // Stop legacy UTC submittedDate 'Today' selection from concealing new announcements.
 document.addEventListener("click",event=>{
  if(event.target?.closest?.("#date-today")){
   event.preventDefault();event.stopImmediatePropagation();open();
  }
 },true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();