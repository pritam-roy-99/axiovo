"use strict";
const $=id=>document.getElementById(id);
const key="researchlens-local-profile";
function safeArray(name){try{const value=JSON.parse(localStorage.getItem(name)||"[]");return Array.isArray(value)?value:[]}catch(e){return[]}}
const fields=["name","affiliation","areas","bio","orcid","github"];
function readProfile(){try{return JSON.parse(localStorage.getItem(key)||"{}")}catch(err){return{}}}
function fill(){const profile=readProfile();for(const field of fields)$(field).value=typeof profile[field]==="string"?profile[field]:""}
function validateURL(value,provider){if(!value)return true;try{const u=new URL(value);return u.protocol==="https:"&&(u.hostname===provider||u.hostname==="www."+provider)}catch(err){return false}}
function save(){const profile={version:1,updated_at:new Date().toISOString()};for(const field of fields)profile[field]=$(field).value.trim().slice(0,field==="bio"?3000:750);
if(!validateURL(profile.orcid,"orcid.org")||!validateURL(profile.github,"github.com")){$("state").textContent="ORCID and GitHub links must use the matching official HTTPS domain.";return}
try{localStorage.setItem(key,JSON.stringify(profile));$("state").textContent="Profile saved only on this device. Not published or verified."}catch(err){$("state").textContent="Device storage unavailable."}}
function download(obj,name){const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
function library(){
const bookmarks=safeArray("researchlens-reading-list"),hidden=safeArray("researchlens-hidden"),topics=safeArray("researchlens-followed-topics");
$("counts").textContent=bookmarks.length+" saved papers · "+topics.length+" followed topics · "+hidden.length+" hidden papers";
fetch("data/feed.json").then(r=>r.json()).then(doc=>{
const list=$("papers");list.replaceChildren();
const chosen=(doc.papers||[]).filter(p=>bookmarks.includes(p.id)).slice(0,50);
if(!chosen.length){const p=document.createElement("p");p.className="muted";p.textContent="No saved papers in the current local index. Save them from the research feed.";list.append(p)}
for(const p of chosen){const d=document.createElement("div");d.className="paper";const a=document.createElement("a");a.href="./paper.html?id="+encodeURIComponent(p.id);a.textContent=p.title;d.append(a);const meta=document.createElement("div");meta.className="muted";meta.textContent=p.id+" · "+(p.published||"").slice(0,10);d.append(meta);list.append(d)}
}).catch(()=>{$("papers").textContent="Could not load the current research index."})}
$("save").onclick=save;$("export").onclick=()=>download(readProfile(),"researchlens-profile.json");
$("import").onclick=()=>$("import-file").click();
$("import-file").onchange=async event=>{
const file=event.target.files?.[0];if(!file)return;
try{if(file.size>100000)throw Error("Profile file too large");const data=JSON.parse(await file.text());if(data.version!==1)throw Error("Unsupported profile format");
for(const field of fields)if(data[field]!==undefined&&typeof data[field]!=="string")throw Error("Invalid profile field");
if(!validateURL(data.orcid||"","orcid.org")||!validateURL(data.github||"","github.com"))throw Error("Invalid linked profile URL");
localStorage.setItem(key,JSON.stringify(data));fill();$("state").textContent="Imported locally. Not published."}catch(err){$("state").textContent="Import error: "+String(err.message||err)}
event.target.value=""};
$("clear-hidden").onclick=()=>{try{localStorage.setItem("researchlens-hidden","[]")}catch(err){}library();$("state").textContent="Hidden-paper list reset on this device."};
fill();library();
