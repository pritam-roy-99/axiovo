/* Axiovo research detail: source-linked metadata, version navigation,
   reusable notes and evidence-aware cross-paper comparison.
   All private reading data stays in browser localStorage. */
(function(){
"use strict";
const BASE="axiovo-library-metadata-v1",COLLECTIONS="axiovo-paper-collections-v1";
const $=id=>document.getElementById(id);
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}};
const write=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));return true}catch{return false}};
const parse=window.AxiovoArxiv?.parse;
const query=new URLSearchParams(location.search);
const requested=parse?.(query.get("id")||"");
if(!requested)return;
const id=requested.base;
function make(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el}
function link(parent,label,url,cls){const a=make("a",label,cls);a.href=url;a.target=url.startsWith("https:")?"_blank":"_self";if(a.target==="_blank")a.rel="noopener noreferrer";parent.append(a);return a}
function key(){return "arxiv:"+id}
function panel(label){const section=make("section",undefined,"axiovo-paper-section panel");const h=make("h2",label);section.append(h);return section}
function mount(){
 const article=$("title")?.closest("article");if(!article)return;
 const actions=make("nav",undefined,"axiovo-detail-tabs");actions.setAttribute("aria-label","Paper research sections");
 for(const [label,anchor] of [["Overview","#abstract"],["Versions","#axiovo-versions"],["Research links","#axiovo-references"],["My notes","#axiovo-paper-notes"],["Compare","#axiovo-comparison"]])
  link(actions,label,anchor);
 article.prepend(actions);
 const versions=panel("arXiv version history");
 versions.id="axiovo-versions";
 versions.append(make("p","Axiovo does not infer the available revision count. Check arXiv for the authoritative version history.","muted"));
 const row=make("div",undefined,"axiovo-paper-inline");
 const selector=make("input");selector.type="number";selector.min="1";selector.max="9999";selector.step="1";selector.placeholder="Latest";selector.setAttribute("aria-label","Version number, leave empty for latest");
 const open=link(row,"Open latest revision","https://arxiv.org/abs/"+id,"btn");
 selector.addEventListener("input",()=>{const n=Number(selector.value);const good=selector.value===""||(Number.isInteger(n)&&n>=1&&n<=9999);open.href="https://arxiv.org/abs/"+id+(good&&selector.value?"v"+n:"");open.textContent=selector.value&&good?"Open version "+n:"Open latest revision"});
 row.prepend(selector);versions.append(row);
 link(versions,"Official arXiv version details ↗","https://arxiv.org/abs/"+id);
 article.after(versions);
 const sources=panel("Research connections");sources.id="axiovo-references";
 sources.append(make("p","These searches locate possible references and follow-ups. Axiovo does not automatically certify a citation relationship.","muted"));
 const sourceRow=make("div",undefined,"axiovo-paper-inline");
 link(sourceRow,"Find on Semantic Scholar","https://www.semanticscholar.org/search?q="+encodeURIComponent(id),"btn");
 link(sourceRow,"Search OpenAlex literature","https://openalex.org/works?filter=locations.source.id%3AS4306400194&search="+encodeURIComponent(id),"btn");
 link(sourceRow,"arXiv search","https://arxiv.org/search/?query="+encodeURIComponent(id)+"&searchtype=all","btn");
 sources.append(sourceRow);
 versions.after(sources);
 const notes=panel("Private reading notes");notes.id="axiovo-paper-notes";
 const saved=read(BASE,{});const meta=saved[key()]||{};
 const status=make("select");status.setAttribute("aria-label","Reading status");
 for(const [value,label] of [["to-read","To read"],["reading","Reading"],["done","Reviewed"],["cited","Cited"]]){const opt=make("option",label);opt.value=value;status.append(opt)}
 status.value=meta.status||"to-read";
 const textarea=make("textarea");textarea.rows=5;textarea.maxLength=12000;textarea.placeholder="Record the claim, assumptions, method, limitations, or questions to verify.";textarea.value=meta.note||"";textarea.setAttribute("aria-label","Private paper notes");
 const feedback=make("p","Saved locally in this browser","muted");feedback.setAttribute("role","status");
 function save(){const all=read(BASE,{});all[key()]={...(all[key()]||{}),status:status.value,note:textarea.value};feedback.textContent=write(BASE,all)?"Saved on this device":"Unable to save; check browser storage."}
 status.onchange=save;textarea.onchange=save;notes.append(status,textarea,feedback);
 sources.after(notes);
 const compare=panel("Compare research papers");compare.id="axiovo-comparison";
 compare.append(make("p","Choose a saved paper to compare source metadata, assumptions and your own notes. Open both originals to verify the scientific claims.","muted"));
 const select=make("select");select.setAttribute("aria-label","Select another saved arXiv paper");
 const empty=make("option","Choose a saved paper");empty.value="";select.append(empty);
 const stored=read("axiovo-reading-list",[]);
 const unique=[...new Set(Array.isArray(stored)?stored:[])];
 for(const candidate of unique){const parsed=parse?.(candidate);if(!parsed||parsed.base===id)continue;const opt=make("option","arXiv:"+parsed.base);opt.value=parsed.base;select.append(opt)}
 const compareLink=link(compare,"Compare selected papers","./compare.html?ids="+encodeURIComponent(id),"btn primary");
 select.onchange=()=>{compareLink.href="./compare.html?ids="+encodeURIComponent([id,select.value].filter(Boolean).join(","));compareLink.textContent=select.value?"Compare these two papers":"Select another paper";};
 compare.prepend(select);notes.after(compare);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();