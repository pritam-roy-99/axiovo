/* Independent source-verified paper discovery. No shared mixed-source results. */
(function(){
"use strict";
const source=document.body.dataset.archive;
if(!["arxiv","biorxiv","chemrxiv"].includes(source))return;
const definition=window.AxiovoArchiveTaxonomy?.[source];if(!definition)return;
const $=id=>document.getElementById(id);
const memory="axiovo-browser-state-"+source,customKey="axiovo-custom-fields-"+source;
const saveKey={arxiv:"researchlens-reading-list",biorxiv:"axiovo-biorxiv-reading-v1",chemrxiv:"axiovo-chemrxiv-reading-v1"}[source];
const official={arxiv:"https://arxiv.org/search/",biorxiv:"https://www.biorxiv.org/search/",chemrxiv:"https://chemrxiv.org/"}[source];
const read=(k,def)=>{try{return JSON.parse(localStorage.getItem(k)||"null")??def}catch{return def}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const clean=x=>String(x??"").trim();
const simple=x=>clean(x).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s.\/-]/g," ").replace(/\s+/g," ");
const make=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e};
let state=read(memory,{topic:0,field:0,subfield:"",query:"",author:"",affiliation:"",scope:"subfield",sort:"relevance",from:"",to:""});
let custom=read(customKey,{}),localPapers=[],shown=[],allResults=[],page=0,lastSync="",requestSeq=0;
const responseCache=new Map();
const group=()=>definition.groups[Number(state.topic)]||definition.groups[0];
const field=()=>group().areas[Number(state.field)]||group().areas[0];
const userSubs=()=>Array.isArray(custom[field().code])?custom[field().code]:[];
const subs=()=>[...field().subfields.map(x=>({name:x.name,code:x.code})),...userSubs().map(x=>({name:x,code:x}))];
function remember(){write(memory,state)}
function option(parent,value,name){const item=make("option",null,name);item.value=value;parent.append(item)}
function selectMenu(node,rows,selected){node.replaceChildren();for(const row of rows)option(node,row.code,row.name);node.value=selected}
function taxonomy(){
 if(!group()){state.topic=0;state.field=0}
 if(!field())state.field=0;
 if(!subs().some(x=>x.code===state.subfield))state.subfield="";
 selectMenu($("archive-topic"),definition.groups.map((g,i)=>({code:String(i),name:g.label})),String(state.topic));
 selectMenu($("archive-field"),group().areas.map((a,i)=>({code:String(i),name:a.name})),String(state.field));
 selectMenu($("archive-subfield"),[{code:"",name:"All "+field().name},...subs()],state.subfield);
 const chips=$("archive-category-list");chips.replaceChildren();
 for(const [i,a] of group().areas.entries()){
  const button=make("button",null,a.name);button.type="button";button.setAttribute("aria-pressed",String(i===Number(state.field)));
  button.onclick=()=>{state.field=String(i);state.subfield="";remember();taxonomy();search()};chips.append(button);
 }
 const own=$("archive-custom-list");own.replaceChildren();
 for(const name of userSubs()){
  const b=make("button",null,name+" ×");b.type="button";b.setAttribute("aria-label","Remove "+name);
  b.onclick=()=>{custom[field().code]=userSubs().filter(x=>x!==name);write(customKey,custom);if(state.subfield===name)state.subfield="";remember();taxonomy()};
  own.append(b);
 }
 const list=$("archive-suggestions");list.replaceChildren();
 const vals=[...new Set([...group().areas.map(x=>x.name),...subs().map(x=>x.name),...allResults.slice(0,40).map(x=>x.title)])];
 for(const value of vals.slice(0,80))option(list,value,value);
}
function normalArxiv(p){
 const id=clean(p.id||p.arxiv_id).replace(/^arxiv:/i,"").replace(/v\d+$/,"");
 if(!/^(\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z-]+)?\/\d{7})$/i.test(id))return null;
 const authors=(p.authors||[]).map(a=>typeof a==="string"?a:a?.name||"").filter(Boolean);
 return {id,doi:clean(p.doi),title:clean(p.title),authors,date:clean(p.published||p.date).slice(0,10),abstract:clean(p.abstract||p.summary),
  category:clean(p.primary_category||p.category),categories:Array.isArray(p.categories)?p.categories:[],affiliations:Array.isArray(p.affiliations)?p.affiliations:[],url:"https://arxiv.org/abs/"+id,pdf:"https://arxiv.org/pdf/"+id,citations:null,source:"arxiv"};
}
function normalDOI(p){
 const doi=clean(p.doi||p.DOI).toLowerCase();
 if(!/^10\.\d{4,9}\//.test(doi))return null;
 if(source==="biorxiv"&&!/^10\.(?:1101|64898)\//.test(doi))return null;
 if(source==="chemrxiv"&&!doi.startsWith("10.26434/")&&!/chemrxiv/i.test(clean(p.source)))return null;
 const title=clean(p.title);if(!title)return null;
 const authors=(Array.isArray(p.authors)?p.authors:clean(p.authors).split(/[;,]/)).map(x=>typeof x==="string"?x:clean(x.name||[x.given,x.family].filter(Boolean).join(" "))).filter(Boolean);
 return {id:doi,doi,title,authors,date:clean(p.date||p.firstPublicationDate).slice(0,10),abstract:clean(p.abstract),
  category:clean(p.category),categories:[clean(p.category)],affiliations:Array.isArray(p.affiliations)?p.affiliations:[],url:source==="biorxiv"?"https://www.biorxiv.org/content/"+doi:"https://doi.org/"+doi,
  pdf:source==="biorxiv"?"https://www.biorxiv.org/content/"+doi+".full.pdf":null,citations:p.citations??null,source};
}
function verified(p){return p&&p.source===source&&(source==="arxiv"?p.url.startsWith("https://arxiv.org/abs/"):source==="biorxiv"?/^10\.(?:1101|64898)\//.test(p.doi):p.doi.startsWith("10.26434/"))}
async function getJSON(url){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),13000);
 try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(timer)}
}
async function local(){
 const name={arxiv:"feed.json",biorxiv:"biorxiv.json",chemrxiv:"chemrxiv.json"}[source];
 try{const d=await getJSON("./data/"+name);lastSync=clean(d.generated_at||"").slice(0,19);
  const rows=Array.isArray(d.papers)?d.papers:Array.isArray(d)?d:[];
  return rows.map(x=>source==="arxiv"?normalArxiv(x):normalDOI(x)).filter(verified);
 }catch{return []}
}
function atom(xml){
 const doc=new DOMParser().parseFromString(xml,"application/xml");
 if(doc.querySelector("parsererror"))throw Error("Invalid arXiv Atom response");
 const ns="http://www.w3.org/2005/Atom";
 return [...doc.getElementsByTagNameNS(ns,"entry")].map(entry=>{
  const val=tag=>entry.getElementsByTagNameNS(ns,tag)[0]?.textContent||"";
  const id=val("id").split("/abs/").pop().replace(/v\d+$/,"");
  const authors=[...entry.getElementsByTagNameNS(ns,"author")].map(x=>x.getElementsByTagNameNS(ns,"name")[0]?.textContent||"");
  const categories=[...entry.getElementsByTagName("category")].map(x=>x.getAttribute("term")).filter(Boolean);
  return normalArxiv({id,title:val("title"),abstract:val("summary"),published:val("published"),authors,categories,primary_category:categories[0]});
 }).filter(verified);
}
function chosenTerm(){return state.query||((state.scope==="subfield")?(state.subfield||field().name):"")}
async function remote(){
 const term=(source==="arxiv"?(state.query||state.subfield):chosenTerm()).slice(0,150);
 if(source==="arxiv"){
  const chosen=state.scope==="subfield"?(state.subfield||field().code):"";
  const code=/^[a-z-]+(?:\.[A-Za-z-]+)?$/.test(chosen)?chosen:field().code;
  const officialCode=state.scope==="subfield"&&/^[a-z-]+(?:\.[A-Za-z-]+)?$/.test(code)?code:"";
  const q=[officialCode?"cat:"+officialCode:"",term?"all:"+term.replace(/[:()"\\]/g," "):""].filter(Boolean).join(" AND ")||"all:science";
  const url="https://export.arxiv.org/api/query?"+new URLSearchParams({search_query:q,start:"0",max_results:"100",sortBy:(state.sort==="recent"||!term)?"submittedDate":"relevance",sortOrder:"descending"});
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),15000);
  try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error("HTTP "+r.status);return atom(await r.text())}finally{clearTimeout(timer)}
 }
 if(source==="biorxiv"){
  const q='SRC:PPR AND JOURNAL:"bioRxiv"'+(term?" AND ("+term.replace(/[():"]/g," ")+")":"");
  const url="https://www.ebi.ac.uk/europepmc/webservices/rest/search?"+new URLSearchParams({query:q,format:"json",pageSize:"100",resultType:"core"});
  const data=await getJSON(url);
  return (data.resultList?.result||[]).filter(p=>/biorxiv/i.test(clean(p.journalTitle||p.journalInfo?.journal?.title)))
    .map(p=>normalDOI({doi:p.doi,title:p.title,authors:p.authorString,date:p.firstPublicationDate,abstract:p.abstractText,category:p.journalTitle})).filter(verified);
 }
 const params={rows:"100",sort:state.sort==="recent"?"published":"score",order:"desc"};
 if(term)params["query.bibliographic"]=term;
 const url="https://api.crossref.org/prefixes/10.26434/works?"+new URLSearchParams(params);
 const pmcQuery='SRC:PPR AND JOURNAL:"ChemRxiv"'+(term?" AND ("+term.replace(/[():"]/g," ")+")":"");
 const pmcURL="https://www.ebi.ac.uk/europepmc/webservices/rest/search?"+new URLSearchParams({query:pmcQuery,format:"json",pageSize:"100",resultType:"core"});
 const calls=await Promise.allSettled([getJSON(url),getJSON(pmcURL)]);
 const cross=calls[0].status==="fulfilled"?calls[0].value.message?.items||[]:[];
 const pmc=calls[1].status==="fulfilled"?calls[1].value.resultList?.result||[]:[];
 if(!cross.length&&!pmc.length&&calls.every(x=>x.status==="rejected"))throw Error("Crossref and Europe PMC unavailable");
 const works=cross.map(x=>normalDOI({doi:x.DOI,title:x.title?.[0],authors:(x.author||[]).map(a=>[a.given,a.family].filter(Boolean).join(" ")),
 abstract:clean(x.abstract).replace(/<[^>]*>/g," "),date:x.published?.["date-parts"]?.[0]?.map((n,i)=>String(n).padStart(i?2:4,"0")).join("-"),
 category:(x.subject||[]).join(", "),source:"ChemRxiv",citations:x["is-referenced-by-count"]})).filter(verified);
 const epmc=pmc.filter(x=>/chemrxiv/i.test(clean(x.journalTitle||x.journalInfo?.journal?.title)))
 .map(x=>normalDOI({doi:x.doi,title:x.title,authors:x.authorString,abstract:x.abstractText,date:x.firstPublicationDate,category:x.journalTitle,source:"ChemRxiv"})).filter(verified);
 const byDOI=new Map();for(const x of [...epmc,...works])byDOI.set(x.doi,x);
 return [...byDOI.values()];
}
// Optional cross-corpus discovery is accepted ONLY after verifying the paper's
// native archive identifier. This broadens title/abstract concept retrieval
// without mixing in records hosted by other preprint servers.
function abstractFromInverted(index){
 if(!index||typeof index!=="object")return "";
 const pairs=[];
 for(const [word,positions] of Object.entries(index))
  for(const pos of positions||[])if(Number.isInteger(pos)&&pos>=0&&pos<1800)pairs.push([pos,word]);
 return pairs.sort((a,b)=>a[0]-b[0]).slice(0,1800).map(x=>x[1]).join(" ");
}
async function sourceVerifiedOpenAlex(){
 const term=clean(state.query||state.author||state.affiliation).slice(0,150);
 if(!term)return [];
 const url="https://api.openalex.org/works?"+new URLSearchParams({search:term,"per-page":"60"});
 const data=await getJSON(url);
 const out=[];
 for(const x of data.results||[]){
  const urls=(x.locations||[]).flatMap(loc=>[loc.landing_page_url,loc.pdf_url]).filter(Boolean);
  const title=clean(x.title),abstract=abstractFromInverted(x.abstract_inverted_index);
  const authors=(x.authorships||[]).map(a=>clean(a.author?.display_name)).filter(Boolean);
  const affiliations=[...new Set((x.authorships||[]).flatMap(a=>(a.institutions||[]).map(i=>clean(i.display_name))).filter(Boolean))];
  const date=clean(x.publication_date);
  let item=null;
  if(source==="arxiv"){
   const ref=urls.map(u=>u.match(/arxiv\.org\/(?:abs|pdf)\/((?:\d{4}\.\d{4,5}|[a-z-]+\/\d{7})(?:v\d+)?)/i)).find(Boolean);
   if(ref)item=normalArxiv({id:ref[1],title,abstract,published:date,authors,affiliations,categories:(x.topics||[]).map(t=>t.subfield?.display_name).filter(Boolean)});
  }else{
   const doi=clean(x.doi).replace(/^https?:\/\/doi\.org\//i,"").toLowerCase();
   const native=urls.some(u=>source==="biorxiv"?/biorxiv\.org/i.test(u):/chemrxiv\.org/i.test(u))||
    (x.locations||[]).some(loc=>new RegExp(source,"i").test(clean(loc.source?.display_name)));
   if(native&&((source==="biorxiv"&&/^10\.(?:1101|64898)\//.test(doi))||(source==="chemrxiv"&&doi.startsWith("10.26434/"))))
    item=normalDOI({doi,title,authors,affiliations,abstract,date,source:source==="biorxiv"?"bioRxiv":"ChemRxiv"});
  }
  if(verified(item)){item.semanticMatch=true;item.citations=Number.isFinite(x.cited_by_count)?x.cited_by_count:null;out.push(item)}
 }
 return out;
}
function match(hay,needle){
 const h=simple(hay),q=simple(needle);if(!q)return 1;if(h.includes(q))return 5;
 let n=0;for(const w of q.split(" ").filter(Boolean))if(h.includes(w))n++;
 if(n)return n;
 if(q.length<5||q.includes(" "))return 0;
 for(const token of h.split(" ")){if(Math.abs(token.length-q.length)>1)continue;let edits=0,i=0,j=0;
  while(i<token.length&&j<q.length&&edits<2){if(token[i]===q[j]){i++;j++;continue}edits++;if(token.length>q.length)i++;else if(q.length>token.length)j++;else{i++;j++}}
  if(edits+Math.abs(token.length-i-(q.length-j))<=1)return .5;
 }
 return 0;
}
function relevant(p){
 if(!verified(p))return false;
 if(state.from&&p.date&&p.date<state.from)return false;
 if(state.to&&p.date&&p.date>state.to)return false;
 if(state.author&&!match(p.authors.join(" "),state.author))return false;
 if(state.affiliation&&!match((p.affiliations||[]).join(" "),state.affiliation))return false;
 const combined=[p.title,p.abstract,p.category,p.categories.join(" "),p.id,p.authors.join(" ")].join(" ");
 if(state.query&&!match(combined,state.query)&&!p.semanticMatch)return false;
 if(state.scope==="subfield"){
  const term=state.subfield||field().code;
  const exact=source==="arxiv"&&p.categories.some(cat=>cat===term||cat.startsWith(term+"."));
  if(term&&!exact&&!match(combined,term))return false;
 }
 return true;
}
function rank(p){return 8*match(p.title,state.query)+3*match(p.abstract,state.query)+5*match(p.authors.join(" "),state.query)+2*match(p.category,state.subfield||field().code)}
function highlight(node,text,query){
 node.replaceChildren();
 const value=String(text||""),terms=clean(query).split(/\s+/).filter(x=>x.length>=3).slice(0,7);
 if(!terms.length){node.textContent=value;return}
 const low=value.toLowerCase();let at=0,seen=0;
 while(at<value.length&&seen<50){
  let found=-1,len=0;
  for(const word of terms){const pos=low.indexOf(word.toLowerCase(),at);if(pos>=0&&(found<0||pos<found)){found=pos;len=word.length}}
  if(found<0)break;
  if(found>at)node.append(document.createTextNode(value.slice(at,found)));
  node.append(make("mark",null,value.slice(found,found+len)));
  at=found+len;seen++;
 }
 node.append(document.createTextNode(value.slice(at)));
}
function outgoing(container,label,url,primary=false){
 const a=make("a",primary?"axiovo-primary":null,label);a.href=url;if(url.startsWith("https:")){a.target="_blank";a.rel="noopener noreferrer"}container.append(a);return a;
}
function saved(p){
 const old=read(saveKey,[]);
 if(source==="arxiv"){const vals=new Set(old.map(x=>typeof x==="string"?x:x.id));vals.add(p.id);return write(saveKey,[...vals])}
 if(old.some(x=>x.doi===p.doi))return true;
 return write(saveKey,[...old,p]);
}
function card(p){
 const root=make("article","axiovo-result-card");
 root.append(make("p","axiovo-paper-meta",(source==="arxiv"?"arXiv: ":"DOI: ")+p.id+" · "+(p.date||"Date unavailable")+" · "+(p.category||"Unclassified")));
 const title=make("h3");
 const titleButton=make("button","axiovo-paper-title-button");highlight(titleButton,p.title,state.query);
 titleButton.type="button";titleButton.setAttribute("aria-label","View paper details for "+p.title);
 title.append(titleButton);root.append(title);
 const author=make("p","axiovo-paper-meta");
 p.authors.slice(0,25).forEach((name,i)=>{if(i)author.append(document.createTextNode(", "));const b=make("button","axiovo-author-link",name);b.type="button";b.onclick=()=>{$("archive-author").value=name;$("archive-query").value="";$("archive-scope").value="all";search()};author.append(b)});
 if(!p.authors.length)author.textContent="Author metadata unavailable";root.append(author);
 if(p.affiliations?.length)root.append(make("p","axiovo-paper-meta","Affiliations: "+p.affiliations.slice(0,5).join("; ")));
 const preview=make("p","axiovo-abstract");
 highlight(preview,(p.abstract||"Abstract unavailable in this source").slice(0,460)+(p.abstract.length>460?"…":""),state.query);
 root.append(preview);
 const actions=make("div","axiovo-paper-actions");
 const details=make("div","axiovo-article-details");details.hidden=true;
 details.append(make("h4",null,"Full available abstract"),make("p",null,p.abstract||"No abstract provided by source."));
 details.append(make("p","axiovo-paper-meta","Publication date: "+(p.date||"Unspecified")+" · Subjects: "+(p.categories.filter(Boolean).join(", ")||p.category||"Unspecified")));
 details.append(make("p","axiovo-paper-meta",p.citations===null?"Citation count unavailable":"Crossref citation references: "+p.citations+" (not a quality score)"));
 if(p.doi)outgoing(details,"DOI ↗","https://doi.org/"+p.doi);
 outgoing(details,"Find citations and related work ↗","https://openalex.org/works?search="+encodeURIComponent(p.doi||p.id));
 const near=allResults.filter(x=>x.id!==p.id&&x.category&&x.category===p.category).slice(0,3);
 if(near.length){details.append(make("h4",null,"Related indexed papers"));
  for(const x of near){const line=make("p");outgoing(line,x.title,x.url);details.append(line)}}

 const toggle=make("button",null,"View details");toggle.type="button";toggle.onclick=()=>{details.hidden=!details.hidden;toggle.textContent=details.hidden?"View details":"Hide details"};
 titleButton.onclick=()=>toggle.click();actions.append(toggle);outgoing(actions,"Source page ↗",p.url,true);
 if(p.pdf)outgoing(actions,"PDF ↗",p.pdf);
 if(source==="arxiv")outgoing(actions,"Research workspace","./paper.html?id="+encodeURIComponent(p.id));
 const saveButton=make("button",null,"Save paper");saveButton.type="button";saveButton.onclick=()=>{if(saved(p))saveButton.textContent="✓ Saved";else saveButton.textContent="Storage unavailable"};actions.append(saveButton);
 root.append(actions,details);return root;
}
function render(){
 shown=allResults.filter(relevant);
 if(state.sort==="recent")shown.sort((a,b)=>b.date.localeCompare(a.date));
 else if(state.sort==="cited")shown.sort((a,b)=>(b.citations??-1)-(a.citations??-1));
 else shown.sort((a,b)=>rank(b)-rank(a)||b.date.localeCompare(a.date));
 const list=$("archive-results");list.replaceChildren();
 const max=(page+1)*20;
 $("archive-result-count").textContent=shown.length+" matching verified "+source+" records in the current search. Coverage may be incomplete.";
 for(const p of shown.slice(0,max))list.append(card(p));
 if(!shown.length){
  const none=make("div","axiovo-no-results","No matches in the available verified index. This does not establish that the archive has no relevant paper.");
  const tips=make("p",null,"Try a shorter phrase, a different spelling, removing the date range, or searching the whole archive.");
  const reset=make("button","axiovo-clear-filters","Clear filters");reset.type="button";
  reset.onclick=()=>{$("archive-query").value="";$("archive-author").value="";$("archive-affiliation").value="";$("archive-from").value="";$("archive-to").value="";$("archive-scope").value="all";search()};
  none.append(tips,reset);outgoing(none,"Search official archive ↗",official);list.append(none);
 }
 const bar=$("archive-result-actions");bar.replaceChildren();
 if(max<shown.length){const more=make("button",null,"Show 20 more");more.type="button";more.onclick=()=>{page++;render()};bar.append(more)}
 const datalist=$("archive-suggestions");datalist.replaceChildren();
 for(const val of [...new Set([...group().areas.map(x=>x.name),...subs().map(x=>x.name),...allResults.slice(0,25).map(x=>x.title),...allResults.slice(0,15).flatMap(x=>x.authors.slice(0,2))])].slice(0,100))option(datalist,val,val);
}
async function search(){
 state.query=$("archive-query").value.trim();state.author=$("archive-author").value.trim();state.affiliation=$("archive-affiliation").value.trim();
 state.scope=$("archive-scope").value;state.sort=$("archive-sort").value;state.from=$("archive-from").value;state.to=$("archive-to").value;remember();
 page=0;const seq=++requestSeq;
 // Show cached results immediately while a separate remote request updates them.
 allResults=[...localPapers];render();
 $("archive-result-count").textContent="Showing cached source records; refreshing search…";
 const cacheKey=JSON.stringify([source,state.topic,state.field,state.subfield,state.query,state.author,state.affiliation,state.scope,state.sort]);
 let fresh=[],extra=[],error="";
 const cached=responseCache.get(cacheKey);
 if(cached&&Date.now()-cached.time<300000){fresh=cached.fresh;extra=cached.extra;error=cached.error}
 else{
  const settled=await Promise.allSettled([remote(),sourceVerifiedOpenAlex()]);
  if(seq!==requestSeq)return;
  if(settled[0].status==="fulfilled")fresh=settled[0].value;
  else error=clean(settled[0].reason?.message||"Remote unavailable").slice(0,90);
  if(settled[1].status==="fulfilled")extra=settled[1].value;
  responseCache.set(cacheKey,{time:Date.now(),fresh,extra,error});
  if(responseCache.size>25)responseCache.delete(responseCache.keys().next().value);
 }
 if(seq!==requestSeq)return;
 const unique=new Map();for(const p of [...localPapers,...extra,...fresh])if(verified(p))unique.set(p.id,p);
 allResults=[...unique.values()];
 $("archive-sync-status").textContent=(error?"Live query unavailable ("+error+"); showing verified cached records. ":"Source query completed. ")+allResults.length+" verified records retrieved or cached"+(lastSync?" · cached snapshot "+lastSync:"")+". Optional OpenAlex matches accepted only with native archive verification. Not a complete historical archive.";
 render();
}
async function init(){
 const cat=definition.groups;
 if(!cat[Number(state.topic)])state.topic=0;
 if(!group().areas[Number(state.field)])state.field=0;
 taxonomy();
 $("archive-topic").onchange=()=>{state.topic=$("archive-topic").value;state.field="0";state.subfield="";remember();taxonomy();search()};
 $("archive-field").onchange=()=>{state.field=$("archive-field").value;state.subfield="";remember();taxonomy();search()};
 $("archive-subfield").onchange=()=>{state.subfield=$("archive-subfield").value;remember();search()};
 $("archive-custom-form").onsubmit=e=>{e.preventDefault();const name=clean($("archive-custom").value).slice(0,90);if(!name)return;
  if(!userSubs().some(x=>simple(x)===simple(name))){custom[field().code]=[...userSubs(),name].slice(0,40);write(customKey,custom)}
  state.subfield=name;$("archive-custom").value="";remember();taxonomy();search()};
 $("archive-reset").onclick=()=>{delete custom[field().code];write(customKey,custom);state.subfield="";remember();taxonomy();search()};
 $("archive-search-form").onsubmit=e=>{e.preventDefault();search()};
 $("archive-query").value=state.query||"";$("archive-author").value=state.author||"";$("archive-affiliation").value=state.affiliation||"";
 $("archive-scope").value=state.scope||"subfield";$("archive-sort").value=state.sort||"relevance";
 $("archive-from").value=state.from||"";$("archive-to").value=state.to||"";
 for(const name of ["archive-scope","archive-sort","archive-from","archive-to"])$(name).onchange=search;
 try{const file={arxiv:"feed.json",biorxiv:"biorxiv.json",chemrxiv:"chemrxiv.json"}[source];const d=await getJSON("./data/"+file);
  lastSync=clean(d.generated_at||"").slice(0,19);
  localPapers=(Array.isArray(d.papers)?d.papers:Array.isArray(d)?d:[]).map(x=>source==="arxiv"?normalArxiv(x):normalDOI(x)).filter(verified);
 }catch{localPapers=[]}
 search();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();