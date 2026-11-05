/* Date-complete arXiv submissions from pre-harvested, explicitly complete UTC days.
 * Never present external OpenAlex publication dates as arXiv submission dates.
 * Static GitHub Pages cannot harvest arbitrary dates on demand.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoDailyArchive=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const iso=/^\d{4}-\d{2}-\d{2}$/;
 const DAY=86400000;
 function dates(from,to,maxDays=31){
  if(!iso.test(from)||!iso.test(to))throw Error("Choose valid YYYY-MM-DD dates");
  const fromMs=Date.parse(from+"T00:00:00Z"),toMs=Date.parse(to+"T00:00:00Z");
  if(!Number.isFinite(fromMs)||!Number.isFinite(toMs)||fromMs>toMs)throw Error("Invalid date range");
  const count=Math.round((toMs-fromMs)/DAY)+1;
  if(count>maxDays)throw Error("Date range exceeds "+maxDays+" days. Search smaller intervals to keep mobile browsing responsive.");
  return Array.from({length:count},(_,i)=>new Date(fromMs+i*DAY).toISOString().slice(0,10));
 }
 function officialDateSearchUrl({from="",to="",query=""}={}){
  const params=new URLSearchParams({
   "advanced":"","date-filter_by":"date_range",
   "date-from_date":from||to,"date-to_date":to||from,
   "date-date_type":"submitted_date_first",
   "classification-include_cross_list":"include",
   "abstracts":"show","size":"200","order":"-announced_date_first"
  });
  if(query){
   params.set("terms-0-operator","AND");
   params.set("terms-0-term",query);
   params.set("terms-0-field","all");
  }
  return "https://arxiv.org/search/advanced?"+params.toString();
 }
 function matches(p,query="",category=""){
  if(category&&!(p.categories||[]).includes(category)&&p.primary_category!==category)return false;
  const q=String(query||"").trim().toLowerCase();
  if(!q)return true;
  const id=String(p.id||"").toLowerCase();
  if(q===id||q===id+"v"+p.version)return true;
  const metadata=[p.title,p.abstract,id].join(" ").toLowerCase();
  const normalizeName=value=>String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
   .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const names=(Array.isArray(p.authors)?p.authors:[]).map(normalizeName);
  const authorQuery=normalizeName(query);
  if(names.includes(authorQuery))return true;
  if(metadata.includes(q))return true;
  const terms=q.split(/\s+/).filter(x=>x.length>=2);
  return terms.length>0&&(terms.every(term=>metadata.includes(term))||
   names.some(name=>{const words=name.split(" ");return terms.every(term=>words.includes(term))}));
 }
 function filterAndSort(papers,query,category,sort="new"){
  const ids=new Map();
  for(const p of papers){
   if(!p?.id||!matches(p,query,category))continue;
   const prev=ids.get(p.id);
   if(!prev||Number(p.version||1)>Number(prev.version||1))ids.set(p.id,p);
  }
  return [...ids.values()].sort((a,b)=>{
   if(sort==="title")return String(a.title||"").localeCompare(String(b.title||""));
   const x=String(a.published||"").localeCompare(String(b.published||""));
   return (sort==="old"?x:-x)||String(a.id).localeCompare(String(b.id));
  });
 }
 async function search({from,to,query="",category="",sort="new",signal,fetcher=fetch,base="./data/arxiv-days/",maxDays=31}){
  const requested=dates(from,to,maxDays);
  let manifest;
  try{
   const response=await fetcher(base+"manifest.json",{signal,cache:"no-store"});
   if(!response.ok)throw Error("Archive manifest HTTP "+response.status);
   manifest=await response.json();
  }catch(e){
   if(e.name==="AbortError")throw e;
   return {complete:false,missing:requested,papers:[],reason:"Daily archive has not been published or is unreachable"};
  }
  const missing=requested.filter(day=>manifest.days?.[day]?.complete!==true);
  const available=requested.filter(day=>manifest.days?.[day]?.complete===true);
  if(!available.length)return {complete:false,missing,papers:[],totalHarvested:0,
   coveredDays:0,requestedDays:requested.length,
   reason:"No requested submission dates have been completely harvested"};
  const records=[];
  try{
   // Bounded concurrency, rather than loading a month of XML or a massive list at once.
   for(let start=0;start<available.length;start+=4){
    const batch=await Promise.all(available.slice(start,start+4).map(async day=>{
     const res=await fetcher(base+day+".json",{signal,cache:"no-store"});
     if(!res.ok)throw Error("Daily file missing: "+day);
     const value=await res.json();
     if(!value.complete||value.date!==day||value.paper_count!==value.source_total
         ||value.paper_count!==manifest.days[day].count||!Array.isArray(value.papers)
         ||value.papers.length!==value.paper_count){
      throw Error("Incomplete or inconsistent daily metadata: "+day);
     }
     return value.papers;
    }));
    batch.forEach(items=>records.push(...items));
   }
  }catch(e){
   if(e.name==="AbortError")throw e;
   return {complete:false,missing:requested,papers:[],reason:String(e.message||e)};
  }
  return {complete:missing.length===0,missing,
   papers:filterAndSort(records,query,category,sort),
   totalHarvested:records.length,coveredDays:available.length,
   requestedDays:requested.length,from,to,
   reason:missing.length?"Only "+available.length+"/"+requested.length+" UTC submission dates have been fully harvested.":"All requested UTC submission dates fully harvested."};
 }
 return {dates,matches,filterAndSort,search,officialDateSearchUrl};
});