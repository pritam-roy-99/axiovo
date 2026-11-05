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
 function matches(p,query="",category=""){
  if(category&&!(p.categories||[]).includes(category)&&p.primary_category!==category)return false;
  const q=String(query||"").trim().toLowerCase();
  if(!q)return true;
  const id=String(p.id||"").toLowerCase();
  if(q===id||q===id+"v"+p.version)return true;
  const text=[p.title,p.abstract,(p.authors||[]).join(" "),id].join(" ").toLowerCase();
  // A full author name or exact title fragment takes precedence over keywords.
  if(text.includes(q))return true;
  const terms=q.split(/\s+/).filter(x=>x.length>=2);
  return terms.length>0&&terms.every(term=>text.includes(term));
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
  if(missing.length)return {complete:false,missing,papers:[],reason:"Some requested submission dates have not yet been completely harvested"};
  const records=[];
  try{
   // Bounded concurrency, rather than loading a month of XML or a massive list at once.
   for(let start=0;start<requested.length;start+=4){
    const batch=await Promise.all(requested.slice(start,start+4).map(async day=>{
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
  return {complete:true,missing:[],papers:filterAndSort(records,query,category,sort),
   totalHarvested:records.length,coveredDays:requested.length,from,to};
 }
 return {dates,matches,filterAndSort,search};
});