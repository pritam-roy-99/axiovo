/* Shared preprint retrieval, source identity and library storage. */
(function(root){
"use strict";
const names={arxiv:"arXiv",biorxiv:"bioRxiv",chemrxiv:"ChemRxiv",eprint:"Cryptology ePrint"};
const paths={arxiv:"feed.json",biorxiv:"biorxiv.json",chemrxiv:"chemrxiv.json",eprint:"eprint.json"};
const keys={arxiv:"axiovo-reading-list",biorxiv:"axiovo-biorxiv-reading-v1",chemrxiv:"axiovo-chemrxiv-reading-v1",eprint:"axiovo-eprint-reading-v1"};
const ARXIV_METADATA="axiovo-archive-library-v1";
const COMPARISON="axiovo-desk-comparison-v1";
const official={arxiv:"https://arxiv.org/search/",biorxiv:"https://www.biorxiv.org/",chemrxiv:"https://chemrxiv.org/",eprint:"https://eprint.iacr.org/"};
const clean=value=>String(value??"").trim();
const simple=value=>clean(value).normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const plain=value=>clean(value).replace(/<\/?[a-z][^>]*>/gi," ").replace(/&(?:lt|gt|amp|quot|apos|nbsp);/g,m=>({"&lt;":"<","&gt;":">","&amp;":"&","&quot;":'"',"&apos;":"'","&nbsp;":" "}[m])).replace(/\s+/g," ");
const list=value=>Array.isArray(value)?value:[];
const day=value=>/^\d{4}-\d{2}-\d{2}/.test(clean(value))?clean(value).slice(0,10):"";
const citationCount=value=>{
 if(typeof value==="number")return Number.isInteger(value)&&value>=0?value:null;
 if(typeof value==="string"&&/^\d+$/.test(value.trim())){
  const parsed=Number(value);return Number.isSafeInteger(parsed)?parsed:null;
 }
 return null;
};
const today=()=>new Date().toISOString().slice(0,10);
const daysAgo=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);
const parseArxiv=value=>root.AxiovoArxiv.parse(clean(value));
const parseDOI=value=>{
 const doi=clean(value).replace(/^(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)/i,"");
 return /^10\.\d{4,9}\/[-a-z0-9._;()/:+]+$/i.test(doi)?doi.toLowerCase():"";
};
// IACR ePrint IDs are year/number, never arXiv IDs or DOI revisions.
function parseEprint(raw){
 const value=clean(raw).replace(/^https?:\/\/eprint\.iacr\.org\//i,"")
  .replace(/^(?:oai:eprint\.iacr\.org:|eprint:)/i,"");
 const match=value.match(/^((?:19|20)\d{2})\/(\d{1,6})(?:\.pdf)?$/);
 return match&&Number(match[2])>0?match[1]+"/"+match[2]:"";
}
function read(key,fallback){
 try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}
}
function write(key,value){
 try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}
}
// Recover older Library data only when its current key has never been written.
for(const [suffix,valid] of [
 ["reading-list",Array.isArray],["field-saved-v1",Array.isArray],
 ["research-projects-v1",Array.isArray],["library-metadata-v1",value=>value&&typeof value==="object"&&!Array.isArray(value)]
]){
 const key="axiovo-"+suffix;
 if(read(key,null)!==null)continue;
 const legacy=read("researchlens-"+suffix,null);
 if(valid(legacy))write(key,legacy);
}
function normalize(source,p){
 if(!p||!Object.hasOwn(names,source)||!plain(p.title))return null;
 const authors=(Array.isArray(p.authors)?p.authors:clean(p.authors).split(/;\s*/))
  .map(a=>plain(typeof a==="string"?a:(a?.name||[a?.given,a?.family].filter(Boolean).join(" ")))).filter(Boolean);
 const version=Number(p.version);
 const record={
  source,title:plain(p.title),authors,abstract:plain(p.abstract||p.summary),date:day(p.published||p.date||p.created),
  category:clean(p.primary_category||p.category),categories:list(p.categories).map(clean).filter(Boolean),
  affiliations:list(p.affiliations).map(plain).filter(Boolean),citations:citationCount(p.citations),
  provenance:clean(p.provenance||p.metadata_source),announcementDate:day(p.announcementDate||p.announcement_date),doi:parseDOI(p.doi||p.DOI)
 };
 if(record.category&&!record.categories.includes(record.category))record.categories.unshift(record.category);
 if(source==="eprint"){
  const id=parseEprint(p.recordId||p.id||p.link||p.url);
  if(!id)return null;
  const url="https://eprint.iacr.org/"+id;
  return {...record,id,recordId:id,version:null,url,pdf:url+".pdf",
   metadataUpdated:day(p.metadata_updated||p.updated),
   provenance:record.provenance||"IACR ePrint OAI-PMH"};
 }
 if(source==="arxiv"){
  const id=parseArxiv(p.recordId||p.id||p.arxiv_id||p.link);
  if(!id)return null;
  const exact=id.version||((Number.isInteger(version)&&version>0&&version<10000)?version:null);
  const recordId=id.base+(exact?"v"+exact:"");
  return {...record,id:id.base,recordId,version:exact,url:root.AxiovoArxiv.abs(recordId),pdf:root.AxiovoArxiv.pdf(recordId)};
 }
 const doi=record.doi;
 if(source==="biorxiv"&&!/^10\.(?:1101|64898)\//.test(doi))return null;
 if(source==="chemrxiv"&&!/^10\.26434\/chemrxiv(?:[.\/-]|$)/.test(doi))return null;
 const versioned=source==="biorxiv"&&Number.isInteger(version)&&version>0&&version<10000;
 const url=source==="biorxiv"?"https://www.biorxiv.org/content/"+doi+(versioned?"v"+version:""):"https://doi.org/"+doi;
 return {...record,id:doi,recordId:doi,version:versioned?version:null,url,pdf:source==="biorxiv"?url+".full.pdf":null};
}
function workKey(p){
 return p.source+":"+(p.source==="chemrxiv"?p.id.replace(/(?:\/|-)v\d+$/i,""):p.id);
}
function mergeRecords(keyFor,groups){
 const results=new Map();
 for(const p of groups.flat()){
  const key=keyFor(p),previous=results.get(key);
  if(!previous){results.set(key,p);continue}
  const revision=x=>x.version||(x.source==="chemrxiv"?Number(x.id.match(/(?:\/|-)v(\d+)$/i)?.[1])||0:0);
  const newer=revision(p)>=revision(previous)?p:previous, older=newer===p?previous:p;
  // An abstract or date from another revision cannot describe the pinned record.
  if(revision(newer)&&revision(older)!==revision(newer)){results.set(key,newer);continue}
  results.set(key,{...newer,
   date:newer.date||older.date,
   announcementDate:newer.announcementDate||older.announcementDate,
   citations:newer.citations??older.citations,
   authors:newer.authors.length?newer.authors:older.authors,
   category:newer.category||older.category,
   categories:[...new Set([...newer.categories,...older.categories])],
   abstract:newer.abstract||older.abstract,
   affiliations:newer.affiliations.length?newer.affiliations:older.affiliations});
 }
 return [...results.values()];
}
const merge=(...groups)=>mergeRecords(workKey,groups);
function queryWords(query){
 return (clean(query).match(/"[^"]+"|[^\s"]+/g)||[]).map(word=>word.replace(/^"|"$/g,"")).filter(Boolean);
}
function matchesText(value,term){
 // Match whole normalized terms, not arbitrary substrings such as
 // "ion" inside "information". Apply conservative plural normalization.
 const hay=" "+normalizePhrase(value)+" ";
 return queryWords(term).map(normalizePhrase).filter(Boolean)
  .every(word=>hay.includes(" "+word+" "));
}
const normalizePhrase=value=>simple(value).split(" ").map(word=>word.length>4?
 word.replace(/ies$/,"y").replace(/(?<![siu])s$/,""):word).join(" ");
function topicHit(p,terms=[]){
 if(!terms.length)return null;
 const title=" "+normalizePhrase(p.title)+" ";
 const abstract=" "+normalizePhrase(p.abstract)+" ";
 for(const field of [title,abstract])for(const term of terms){
  const phrase=normalizePhrase(term);
  if(phrase&&field.includes(" "+phrase+" "))return {term,where:field===title?"title":"abstract"};
 }
 return null;
}
function categoryMatch(p,category){
 const exact=category.codes||[category.code];
 return p.categories.some(code=>exact.some(value=>simple(code)===simple(value)));
}
function eprintIdentifier(value){
 const raw=clean(value);
 if(!/^(?:eprint:\s*|https?:\/\/eprint\.iacr\.org\/|(?:19|20)\d{2}\/)/i.test(raw))return "";
 return parseEprint(raw);
}
function identifier(value){
 const doi=parseDOI(value);
 const arxiv=parseArxiv(value)||(doi.startsWith("10.48550/arxiv.")?parseArxiv(doi.slice("10.48550/arxiv.".length)):null);
 return {arxiv,doi:arxiv?"":doi};
}
function matchesAuthor(authors,query){
 const words=simple(query).split(" ").filter(Boolean);
 return !words.length||authors.some(author=>{
  if(root.AxiovoAuthorFollow?.matchesName(query,author))return true;
  const parts=simple(author).split(" ");
  return words.every(word=>parts.some(part=>part===word||(word.length===1&&part.startsWith(word))));
 });
}
function matchScore(p,c){
 if(c.from&&(!p.date||p.date<c.from)||c.to&&(!p.date||p.date>c.to))return null;
 const cryptoId=eprintIdentifier(c.q);
 if(cryptoId&&(p.source!=="eprint"||p.id!==cryptoId))return null;
 const {arxiv:id,doi}=identifier(c.q);
 if(id&&(p.source!=="arxiv"||p.id.toLowerCase()!==id.base.toLowerCase()||(id.explicit&&p.recordId.toLowerCase()!==id.requested.toLowerCase())))return null;
 if(doi&&p.doi!==doi)return null;
 if(c.crosslisted&&(p.source!=="arxiv"||p.categories.length<2))return null;
 const text=[p.title,p.abstract,p.authors.join(" "),p.categories.join(" "),p.id,p.doi].join(" ");
 if(!id&&!doi&&!cryptoId&&!matchesText(c.match==="title"?p.title:text,c.q))return null;
 if(!matchesAuthor(p.authors,c.author)||!matchesText(p.affiliations.join(" "),c.affiliation))return null;
 const terms=c.topicTerms||[],hit=topicHit(p,terms);
 if(terms.length&&!hit)return null;
 const category=c.category;
 if(category&&!categoryMatch(p,category)){
  if(p.source==="arxiv"||p.categories.length)return null;
  const inferredSubject=p.source==="chemrxiv"&&Boolean(topicHit(p,c.categoryTerms||[])||matchesText([p.title,p.abstract].join(" "),category.name));
  const inferredBioSubject=p.source==="biorxiv"&&p.provenance==="Europe PMC"&&topicHit(p,c.categoryTerms||[]);
  if(!inferredSubject&&!inferredBioSubject&&!hit)return null;
 }
 if(!matchesText(text,c.refinement))return null;
 // Deterministic evidence ranking: exact title phrases are prioritized,
 // followed by matching title terms, abstract evidence and subject terms.
 // This affects ordering only; metadata filters above remain mandatory.
 const q=simple(c.q),title=simple(p.title);
 const phrase=q&&title.includes(q)?15:0;
 const queryScore=c.q?phrase+(matchesText(p.title,c.q)?20:0)
  +(matchesText(p.abstract,c.q)?7:0)+(matchesAuthor(p.authors,c.q)&&simple(p.authors.join(" ")).includes(simple(c.q))?9:0):0;
 const topicScore=hit?(hit.where==="title"?18:7):0;
 const categoryScore=c.category&&categoryMatch(p,c.category)?4:0;
 return queryScore+topicScore+categoryScore;
}
function filter(papers,criteria){
 const scored=papers.map(p=>({p,score:matchScore(p,criteria)})).filter(row=>row.score!==null);
 const mode=criteria.sort||"relevance";
 const values=scored.map(x=>x.p);
 const lookup=new Map(scored.map(x=>[x.p,x.score]));
 if(root.AxiovoPaperSort)return root.AxiovoPaperSort.sort(values,mode,p=>lookup.get(p)||0);
 // Standalone fallback for pages that do not load the shared sorter.
 return scored.sort((a,b)=>b.score-a.score||String(b.p.date||"").localeCompare(a.p.date||"")).map(x=>x.p);
}
async function request(url,signal,json=true,cacheMode){
 const timeout=AbortSignal.timeout(11000);
 const response=await fetch(url,{signal:signal?AbortSignal.any([signal,timeout]):timeout,
  cache:cacheMode|| (url.startsWith("./data/")?"no-store":"default")});
 if(!response.ok)throw Error("HTTP "+response.status);
 return json?response.json():response.text();
}
const snapshots=new Map();
const SNAPSHOT_TTL_MS=5*60*1000;
async function snapshot(source,options={}){
 if(options?.force===true)snapshots.delete(source);
 const cached=snapshots.get(source);
 if(cached&&Date.now()-cached.at>=SNAPSHOT_TTL_MS)snapshots.delete(source);
 if(!snapshots.has(source)){
  const load=async path=>{
   // Feed may use the normal HTTP cache for unchanged, official snapshots.
   // Other pages retain no-store by default; a manual Feed Refresh revalidates.
   const data=await request("./data/"+path,undefined,true,
    options.cache==="default"?"default":undefined);
   const rows=data?.papers??data?.records??data;
   if(!Array.isArray(rows))throw Error("Invalid "+source+" snapshot");
   return {stamp:clean(data.generated_at||data.checked_at),papers:rows.map(p=>normalize(source,p)).filter(Boolean),
    fullOaiTraversal:source==="eprint"&&data.historical_oai_traversal_complete===true};
  };
  // Announcements are the source of newly released records, not proof of v1 dates.
  // Keep announcementDate distinct from the first-submission date, and never
  // treat a missing first-submission date as verified date-filter coverage.
  const files=source==="arxiv"?["oai-recent.json",paths[source],"announcements.json"]:[paths[source]];
  const loaded=Promise.allSettled(files.map(load)).then(results=>{
   const available=results.filter(result=>result.status==="fulfilled").map(result=>result.value);
   if(!available.length)throw Error("No "+source+" snapshot available");
   // Keep distinct revisions available for exact-ID searches. Browsing
   // results combine versions after applying the user's filters.
   return {stamp:available.map(result=>result.stamp).sort().at(-1),
    papers:mergeRecords(recordKey,available.map(result=>result.papers)),
    fullOaiTraversal:source==="eprint"&&available.some(result=>result.fullOaiTraversal)};
  }).catch(error=>{if(snapshots.get(source)?.promise===loaded)snapshots.delete(source);throw error});
  snapshots.set(source,{at:Date.now(),promise:loaded});
 }
 return snapshots.get(source).promise;
}
/* Official announcement batch. A released paper may have been first submitted
 * on another UTC date, so NEVER filter this by p.date or silently treat a
 * submission-day shard as the announced release.
 */
async function latestArxivAnnouncement(signal){
 const response=await fetch("./data/announcements.json",{
  cache:"no-store",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(18000)]):AbortSignal.timeout(18000)
 });
 if(!response.ok)throw Error("arXiv announcement HTTP "+response.status);
 const payload=await response.json();
 if(payload.date_type!=="announcement"||!/^\d{4}-\d{2}-\d{2}$/.test(payload.announcement_date)||
    !Array.isArray(payload.papers))throw Error("Invalid official announcement snapshot");
 // The latest date is a US Eastern announcement date, not the v1 UTC date.
 const papers=payload.papers.filter(p=>p.announcement_date===payload.announcement_date)
  .map(p=>normalize("arxiv",p)).filter(Boolean);
 return {date:payload.announcement_date,checkedAt:clean(payload.checked_at),
  total:payload.count,complete:payload.complete===true&&papers.length===payload.count,
  papers,source:clean(payload.source)};
}
async function datedArxiv(criteria,signal){
 if(!criteria.from||!criteria.to||!root.AxiovoDailyArchive)return null;
 try{root.AxiovoDailyArchive.dates(criteria.from,criteria.to)}catch{return null}
 const result=await root.AxiovoDailyArchive.search({from:criteria.from,to:criteria.to,signal});
 return {...result,papers:result.papers.map(p=>normalize("arxiv",p)).filter(Boolean)};
}
const words=value=>clean(value).replace(/[:"()\\[\]{}]/g," ").trim().slice(0,220);
const quoted=value=>'"'+words(value)+'"';
const endpoints={
 arxiv:"https://api.datacite.org/dois",
 bio:"https://api.biorxiv.org/details/biorxiv/",
 pmc:"https://www.ebi.ac.uk/europepmc/webservices/rest/search?",
 chem:"https://api.crossref.org/prefixes/10.26434/works?"
};
function dataCiteArxiv(item){
 const p=item?.attributes;
 if(!p||!/^10\.48550\/arxiv\./i.test(p.doi||""))return null;
 // The DOI suffix is the canonical arXiv identifier. The landing URL may
 // be a DOI resolver or a rewritten publisher URL, so never require it to
 // contain /abs/<id>. Reject a conflicting explicit arXiv URL if present.
 const doi=clean(p.doi),suffix=doi.match(/^10\.48550\/arxiv\.(.+)$/i);
 const id=suffix?parseArxiv(suffix[1]):null,linked=parseArxiv(p.url);
 if(!id||(linked&&linked.base.toLowerCase()!==id.base.toLowerCase()))return null;
 const submitted=list(p.dates).find(d=>d.dateType==="Submitted"&&d.dateInformation==="v1");
 // DataCite arXiv subjects occur both as "Quantum Physics (quant-ph)" and
 // as literal category codes. Only accept codes explicitly carried by the
 // arXiv scheme, not guessed keyword mappings.
 const arxivCode=/^(?:[a-z-]+(?:\.[A-Z]{2})?|[a-z]+\.[A-Z]{2})$/i;
 const categories=[...new Set(list(p.subjects).filter(s=>/^arxiv$/i.test(clean(s.subjectScheme)))
  .map(s=>clean(s.subject)).map(subject=>{
   const parenthesized=subject.match(/\(([^()]*)\)\s*$/);
   const code=parenthesized?parenthesized[1].trim():subject;
   return arxivCode.test(code)?code:"";
  }).filter(Boolean))];
 return normalize("arxiv",{id:id.base,title:p.titles?.[0]?.title,date:submitted?.date,doi:p.doi,
  authors:list(p.creators).map(a=>a.name),affiliations:list(p.creators).flatMap(a=>list(a.affiliation).map(x=>x.name)),categories,primary_category:categories[0],
  abstract:list(p.descriptions).find(d=>d.descriptionType==="Abstract")?.description,
  citations:p.citationCount,provenance:"arXiv DOI metadata via DataCite"});
}
async function arxivLive(c,signal,cursor){
 const id=identifier(c.q).arxiv;
 if(id){
  if(id.explicit)return {papers:[],total:0,provider:"Check the requested revision at the original arXiv record",next:null};
  const data=await request(endpoints.arxiv+"/10.48550/arXiv."+id.base,signal);
  const paper=dataCiteArxiv(data.data);
  return {papers:paper?[paper]:[],total:paper?1:0,provider:"arXiv DOI metadata via DataCite",next:null};
 }
 // DataCite cursor pagination ignores requested sort (always created ascending).
 // Interactive search uses page numbers to honor relevance, date and citations.
 // This covers up to 10,000 provider matches; older complete date coverage is
 // supplied separately by the verified arXiv daily archive shards.
 const page=cursor?Number(cursor):1;
 if(!Number.isInteger(page)||page<1||page>167)throw Error("Invalid DataCite page");
 const q=new URLSearchParams({prefix:"10.48550","page[size]":"60","page[number]":String(page)});
 const clauses=[];
 if(c.category){
  const codes=c.category.codes||[c.category.code];
  clauses.push("("+codes.map(code=>"subjects.subject:"+quoted(code)).join(" OR ")+")");
 }
 const keywordField=c.match==="title"?"titles.title:":"";
 clauses.push(...queryWords([c.q,c.refinement].filter(Boolean).join(" ")).map(term=>keywordField+quoted(term)));
 if(c.topicTerms?.length)clauses.push("("+c.topicTerms.map(quoted).join(" OR ")+")");
 if(words(c.author)){
   // Search the surname to avoid losing records indexed with expanded initials.
   // Full author names are validated after retrieval by matchesAuthor().
   const authorParts=simple(c.author).split(" ").filter(Boolean);
   const surname=authorParts.at(-1);
   if(surname)clauses.push("creators.name:"+quoted(surname));
  }
 if(c.from||c.to)clauses.push("publicationYear:["+(c.from?.slice(0,4)||"1991")+" TO "+(c.to?.slice(0,4)||today().slice(0,4))+"]");
 if(clauses.length)q.set("query",clauses.join(" AND "));
 const order=c.sort==="oldest"?"published":c.sort==="cited"?"-citation-count":
  c.sort==="recent"||(!c.q&&!c.topicTerms?.length)?"-published":"relevance";
 q.set("sort",order);
 const result=await request(endpoints.arxiv+"?"+q,signal);
 const papers=list(result.data).map(dataCiteArxiv).filter(Boolean);
 const nextNumber=result.links?.next?
  Number(new URL(result.links.next,endpoints.arxiv).searchParams.get("page[number]")):null;
 const next=Number.isInteger(nextNumber)&&nextNumber>page&&nextNumber<=167?String(nextNumber):null;
 return {papers,total:Number(result.meta?.total)||0,provider:"arXiv DOI metadata via DataCite",next};
}
async function bioNative(c,signal,cursor){
 const doi=parseDOI(c.q);
 const start=Number(cursor)||0;
 // An upper bound includes all earlier dates. Recent browsing uses a shorter window.
 // Without a date constraint, only browse the recent stream. Historical
 // controls specify the full year interval explicitly, so the provider
 // paginates that range instead of silently falling back to recent papers.
 const historical=Boolean(c.to||c.category?.legacy||c.sort==="oldest");
 const startDate=c.from||(historical?"2013-11-01":daysAgo(c.category?7:2));
 const interval=startDate+"/"+(c.to||today());
 const query=c.category?("?"+new URLSearchParams({category:c.category.code.toLowerCase()})):"";
 const url=endpoints.bio+(doi?doi+"/na/json":interval+"/"+start+"/json")+query;
 const data=await request(url,signal);
 const meta=data.messages?.[0];
 if(!Array.isArray(data.collection)||(!data.collection.length&&!/^(ok|no (?:results|posts) found)$/i.test(clean(meta?.status))))throw Error("bioRxiv response unavailable");
 const papers=data.collection.filter(p=>!p.server||clean(p.server).toLowerCase()==="biorxiv").map(p=>normalize("biorxiv",{...p,provenance:"bioRxiv API"})).filter(Boolean);
 const declared=meta?.total;
 const total=declared!==undefined&&Number.isFinite(Number(declared))?Number(declared):null;
 return {papers,total:total??papers.length,provider:"bioRxiv API",
  next:!doi&&total!==null&&data.collection.length&&start+data.collection.length<total
   ?start+data.collection.length:null};
}
async function bioIndex(c,signal,cursor){
 const parts=['SRC:PPR AND PUBLISHER:"bioRxiv"'];
 const keywordField=c.match==="title"?"TITLE:":"TITLE_ABS:";
 parts.push(...queryWords([c.q,c.refinement].filter(Boolean).join(" ")).map(term=>keywordField+quoted(term)));
 if(c.topicTerms?.length)parts.push("("+c.topicTerms.map(term=>"TITLE_ABS:"+quoted(term)).join(" OR ")+")");
 if(words(c.author))parts.push("AUTH:"+quoted(c.author));
 if(c.from||c.to)parts.push("FIRST_PDATE:["+ (c.from||"2013-11-01")+" TO "+(c.to||today())+"]");
 const query=new URLSearchParams({query:parts.join(" AND "),format:"json",pageSize:"50",resultType:"core",cursorMark:cursor||"*"});
 if(c.sort==="recent"||c.sort==="oldest")query.set("sort","P_PDATE_D "+(c.sort==="oldest"?"asc":"desc"));
 if(c.sort==="cited")query.set("sort","CITED desc");
 const data=await request(endpoints.pmc+query,signal);
 const rows=list(data.resultList?.result);
 const papers=rows.filter(p=>/^biorxiv$/i.test(clean(p.bookOrReportDetails?.publisher||p.journalTitle||p.journalInfo?.journal?.title))).map(p=>
  normalize("biorxiv",{doi:p.doi,title:p.title,authors:p.authorList?.author?.map(a=>a.fullName)||clean(p.authorString).split(/,\s*/),
   date:p.firstPublicationDate,abstract:p.abstractText,provenance:"Europe PMC",citations:p.citedByCount,
   affiliations:list(p.authorList?.author).flatMap(a=>list(a.authorAffiliationDetailsList?.authorAffiliation).map(x=>x.affiliation))})).filter(Boolean);
 return {papers,total:Number(data.hitCount)||0,provider:"Europe PMC",next:rows.length&&data.nextCursorMark!==query.get("cursorMark")?data.nextCursorMark||null:null};
}
function dateParts(value){
 const parts=value?.["date-parts"]?.[0];
 return parts?.length>=3?parts.slice(0,3).map((n,i)=>String(n).padStart(i?2:4,"0")).join("-"):"";
}
async function chemLive(c,signal,cursor){
 const doi=parseDOI(c.q);
 const filters=["type:posted-content"];
 if(c.from)filters.push("from-posted-date:"+c.from);
 if(c.to)filters.push("until-posted-date:"+c.to);
 const orderBy=c.sort==="cited"?"is-referenced-by-count":
  c.sort==="oldest"||c.sort==="recent"||(!c.q&&!c.category&&!c.topicTerms?.length)?"published":"score";
 const query=new URLSearchParams({rows:"50",filter:filters.join(","),sort:orderBy,order:c.sort==="oldest"?"asc":"desc",cursor:cursor||"*"});
 const scope=c.topicTerms?.[0]||c.category?.name;
 const term=words([c.q,scope,c.refinement].filter(Boolean).join(" "));
 if(term)query.set("query.bibliographic",term);
 if(words(c.author))query.set("query.author",words(c.author));
 const endpoint=doi?"https://api.crossref.org/works/"+doi:endpoints.chem+query;
 const message=(await request(endpoint,signal)).message;
 const rows=doi?[message]:list(message?.items);
 const papers=rows.filter(p=>/^10\.26434\/chemrxiv(?:[.\/-]|$)/i.test(p?.DOI||"")).map(p=>
  normalize("chemrxiv",{doi:p.DOI,title:p.title?.[0],authors:p.author,abstract:p.abstract,date:dateParts(p.posted)||dateParts(p.published),
   categories:p.subject,affiliations:list(p.author).flatMap(a=>list(a.affiliation).map(x=>x.name)),citations:p["is-referenced-by-count"],
   provenance:c.category?"Crossref subject query":"Crossref"})).filter(Boolean);
 return {papers,total:doi?papers.length:Number(message?.["total-results"])||0,provider:"Crossref",next:!doi&&rows.length===50?message?.["next-cursor"]||null:null};
}
function live(source,criteria,signal,cursor){
 if(source==="arxiv")return arxivLive(criteria,signal,cursor);
 if(source==="eprint")return snapshot("eprint").then(data=>({papers:filter(data.papers,criteria),total:null,
  provider:data.fullOaiTraversal?"IACR OAI-PMH full available history traversal (not an archive-wide census)":"IACR OAI-PMH indexed snapshot (partial coverage)",next:null}));
 if(source==="biorxiv"){
  const browse=!criteria.q&&!criteria.author&&!criteria.refinement&&!criteria.topicTerms?.length;
  const orderedSearch=!criteria.category&&(criteria.sort==="oldest"||criteria.sort==="cited");
  return parseDOI(criteria.q)||(browse&&!orderedSearch)?bioNative(criteria,signal,cursor):bioIndex(criteria,signal,cursor);
 }
 return chemLive(criteria,signal,cursor);
}
function sourceLink(source,criteria={}){
 if(source==="eprint"){
  const id=eprintIdentifier(criteria.q);
  return id?"https://eprint.iacr.org/"+id:"https://eprint.iacr.org/search";
 }
 if(source==="arxiv"){
  const id=identifier(criteria.q).arxiv;
  if(id)return root.AxiovoArxiv.abs(id.requested);
  const query=criteria.q||criteria.topicTerms?.[0]||criteria.refinement;
  if((criteria.from||criteria.to)&&root.AxiovoDailyArchive)return root.AxiovoDailyArchive.officialDateSearchUrl({from:criteria.from||"1991-01-01",to:criteria.to||today(),query});
  if(query)return root.AxiovoArxiv.officialSearchUrl(query);
  if(criteria.category?.code)return "https://arxiv.org/list/"+criteria.category.code+"/recent";
 }
 if(parseDOI(criteria.q))return "https://doi.org/"+parseDOI(criteria.q);
 const query=criteria.q||criteria.topicTerms?.[0]||criteria.category?.name||criteria.refinement;
 if(source==="biorxiv"&&query)return "https://www.biorxiv.org/search/"+encodeURIComponent(query);
 if(source==="chemrxiv"&&query)return "https://chemrxiv.org/action/doSearch?AllField="+encodeURIComponent(query);
 return official[source];
}
function storedId(source,item){
 if(source==="eprint")return parseEprint(typeof item==="string"?item:item?.recordId||item?.id||item?.url);
 if(source==="arxiv")return parseArxiv(item)?.requested;
 const doi=parseDOI(item?.doi);
 return source==="biorxiv"&&item?.version?doi+"v"+Number(item.version):doi;
}
function saved(p){
 const id=storedId(p.source,p.source==="arxiv"?p.recordId:p);
 return Boolean(id)&&list(read(keys[p.source],[])).some(item=>storedId(p.source,item)===id);
}
function save(p){
 const items=list(read(keys[p.source],[]));
 if(!saved(p)&&!write(keys[p.source],[...items,p.source==="arxiv"?p.recordId:p]))return false;
 if(p.source==="arxiv"){
  const meta=list(read(ARXIV_METADATA,[])).filter(x=>x.recordId!==p.recordId);
  write(ARXIV_METADATA,[p,...meta].slice(0,200));
 }
 root.dispatchEvent(new Event("axiovo-library-change"));
 return true;
}
function unsave(p){
 const id=storedId(p.source,p.source==="arxiv"?p.recordId||p.arxiv_id:p);
 if(!id)return false;
 const items=list(read(keys[p.source],[]));
 if(!write(keys[p.source],items.filter(item=>storedId(p.source,item)!==id)))return false;
 if(p.source==="arxiv"){
  const meta=list(read(ARXIV_METADATA,[])).filter(item=>item.recordId!==id);
  write(ARXIV_METADATA,meta);
 }
 root.dispatchEvent(new Event("axiovo-library-change"));
 return true;
}
function savedRecords(source){
 const entries=list(read(source==="arxiv"?ARXIV_METADATA:keys[source],[]));
 const ids=source==="arxiv"?new Set(list(read(keys.arxiv,[])).map(item=>storedId("arxiv",item))):null;
 return entries.map(p=>normalize(source,p)).filter(p=>p&&(!ids||ids.has(p.recordId)));
}
function recordKey(p){return p.source+":"+p.recordId+(p.source==="biorxiv"&&p.version?"v"+p.version:"")}
function comparison(){
 return list(read(COMPARISON,[])).map(p=>normalize(p?.source,p)).filter(Boolean).slice(0,5);
}
function addComparison(p){
 const papers=comparison();
 if(papers.some(item=>recordKey(item)===recordKey(p)))return "added";
 if(papers.length>=5)return "full";
 if(!write(COMPARISON,[...papers,p]))return "unavailable";
 root.dispatchEvent(new Event("axiovo:comparison-change"));
 return "added";
}
function removeComparison(p){
 if(!write(COMPARISON,comparison().filter(item=>recordKey(item)!==recordKey(p))))return false;
 root.dispatchEvent(new Event("axiovo:comparison-change"));
 return true;
}
root.AxiovoArchiveData={names,clean,simple,read,write,normalize,workKey,recordKey,merge,filter,topicHit,categoryMatch,identifier,snapshot,latestArxivAnnouncement,datedArxiv,live,sourceLink,
 saved,save,unsave,savedRecords,parseDOI,parseEprint,eprintIdentifier,comparison,addComparison,removeComparison};
})(window);
