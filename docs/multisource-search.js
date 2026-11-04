/* Independent Semantic Scholar fallback for arXiv-identified papers.
 * DOI-only and title-only matches must not be presented as verified arXiv records.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoMultiSource=factory();
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const pattern=/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7})$/i;
 function arxivId(record){
  const raw=String(record?.externalIds?.ArXiv||"").replace(/^arxiv:/i,"").replace(/v\d+$/i,"");
  return pattern.test(raw)?raw:"";
 }
 function normalize(record){
  const id=arxivId(record);
  if(!id||!record?.title)return null;
  const authors=(record.authors||[]).map(a=>a?.name).filter(x=>typeof x==="string");
  const published=/^\d{4}-\d{2}-\d{2}$/.test(String(record.publicationDate||""))?record.publicationDate:"";
  return {
   id:"https://arxiv.org/abs/"+id,display_name:String(record.title),title:String(record.title),
   publication_date:published,publication_year:Number(record.year)||null,
   authorships:authors.map(name=>({author:{display_name:name}})),
   primary_location:{landing_page_url:"https://arxiv.org/abs/"+id,source:{display_name:"arXiv"}},
   locations:[{landing_page_url:"https://arxiv.org/abs/"+id}],
   doi:record.externalIds?.DOI?"https://doi.org/"+record.externalIds.DOI:null,
   __source:"semantic-scholar"
  }
 }
 function queryParams(query){
  return new URLSearchParams({
   query:String(query||"").trim().slice(0,200),
   limit:"50",fields:"title,authors,year,publicationDate,externalIds"
  })
 }
 async function search(query,{signal,from="",to=""}={}){
  if(!String(query||"").trim())return {items:[],reason:"A topic or title is needed for independent search."};
  // This provider does not verify original arXiv v1 dates. Do not violate date filters.
  if(from||to)return {items:[],reason:"Secondary source skipped for exact arXiv date filtering."};
  const response=await fetch("https://api.semanticscholar.org/graph/v1/paper/search?"+queryParams(query),
   {signal,headers:{Accept:"application/json"}});
  if(!response.ok)throw Error("Semantic Scholar HTTP "+response.status);
  const data=await response.json();
  const found=(Array.isArray(data.data)?data.data:[]).map(normalize).filter(Boolean);
  return {items:[...new Map(found.map(w=>[w.id,w])).values()],reason:"Semantic Scholar arXiv identifiers verified."};
 }
 return {arxivId,normalize,queryParams,search};
});