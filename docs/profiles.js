"use strict";
const $=id=>document.getElementById(id);
const key="axiovo-local-profile";
function safeArray(name){try{const value=JSON.parse(localStorage.getItem(name)||"[]");return Array.isArray(value)?value:[]}catch(e){return[]}}
const fields=["name","affiliation","areas","bio","orcid","github"];
function readProfile(){try{return JSON.parse(localStorage.getItem(key)||"{}")}catch(err){return{}}}
function fill(){const profile=readProfile();for(const field of fields)$(field).value=typeof profile[field]==="string"?profile[field]:""}
function validateURL(value,provider){if(!value)return true;try{const u=new URL(value);return u.protocol==="https:"&&(u.hostname===provider||u.hostname==="www."+provider)}catch(err){return false}}
function save(){const profile={version:1,updated_at:new Date().toISOString()};for(const field of fields)profile[field]=$(field).value.trim().slice(0,field==="bio"?3000:750);
if(!validateURL(profile.orcid,"orcid.org")||!validateURL(profile.github,"github.com")){$("state").textContent="ORCID and GitHub links must use the matching official HTTPS domain.";return}
try{localStorage.setItem(key,JSON.stringify(profile));$("state").textContent="Profile saved only on this device. Not published or verified."}catch(err){$("state").textContent="Device storage unavailable."}}
function download(obj,name){const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
async function library(){
 const bookmarks=safeArray("axiovo-reading-list"),hidden=safeArray("axiovo-hidden"),topics=safeArray("axiovo-followed-topics");
 $("counts").textContent=bookmarks.length+" saved arXiv identifiers · "+topics.length+" followed topics · "+hidden.length+" hidden papers";
 const root=$("papers");root.replaceChildren();
 const A=window.AxiovoArxiv;
 let indexed=[];
 try{const res=await fetch("./data/feed.json",{cache:"no-store"});if(res.ok)indexed=(await res.json()).papers||[]}catch{}
 const byBase=new Map(indexed.map(p=>[A?.base(p.id)||p.id,p]));
 let shown=0;
 for(const raw of bookmarks){
  const p=A?.parse(raw);if(!p)continue;
  if(shown++>=80)break;
  const data=byBase.get(p.base);
  const item=document.createElement("div");item.className="paper";
  const title=document.createElement("a");title.href="./paper.html?id="+encodeURIComponent(p.requested);
  title.textContent=(data?.title||"arXiv:"+p.base)+(p.explicit?" (v"+p.version+")":"");
  item.append(title);
  const source=document.createElement("div");source.className="muted";
  const link=document.createElement("a");link.href=A.abs(p.requested);link.target="_blank";link.rel="noopener noreferrer";
  link.textContent="Open original arXiv "+(p.explicit?"v"+p.version:"latest")+" ↗";
  source.append(link);item.append(source);root.append(item);
 }
 if(!shown){
  const empty=document.createElement("p");empty.className="muted";
  empty.textContent="No arXiv papers saved in this browser. Save any historical arXiv ID in Discover.";
  root.append(empty);
 }
 if(bookmarks.length>80){
  const note=document.createElement("p");note.className="muted";note.textContent="Showing the first 80 saved identifiers. Use Workspace to search the full reading list.";root.append(note)
 }
}
$("save").onclick=save;$("export").onclick=()=>download(readProfile(),"axiovo-profile.json");
$("import").onclick=()=>$("import-file").click();
$("import-file").onchange=async event=>{
const file=event.target.files?.[0];if(!file)return;
try{if(file.size>100000)throw Error("Profile file too large");const data=JSON.parse(await file.text());if(data.version!==1)throw Error("Unsupported profile format");
for(const field of fields)if(data[field]!==undefined&&typeof data[field]!=="string")throw Error("Invalid profile field");
if(!validateURL(data.orcid||"","orcid.org")||!validateURL(data.github||"","github.com"))throw Error("Invalid linked profile URL");
localStorage.setItem(key,JSON.stringify(data));fill();$("state").textContent="Imported locally. Not published."}catch(err){$("state").textContent="Import error: "+String(err.message||err)}
event.target.value=""};
$("clear-hidden").onclick=()=>{try{localStorage.setItem("axiovo-hidden","[]")}catch(err){}library();$("state").textContent="Hidden-paper list reset on this device."};
fill();library();
