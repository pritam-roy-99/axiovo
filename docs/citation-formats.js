/* Source-linked citation exports. No journal status inferred from preprints. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoCitationFormats=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const clean=x=>String(x??"").replace(/[\x00-\x1f]+/g," ").replace(/\s+/g," ").trim();
 function normalize(p){
  if(!p||!p.title)throw Error("Missing citation title");
  const source=clean(p.source).toLowerCase(),id=clean(p.source_id||p.recordId||p.id);
  if(!["arxiv","biorxiv","chemrxiv"].includes(source))throw Error("Unsupported source");
  let url=clean(p.landing_url||p.url),doi=clean(p.doi).toLowerCase().replace(/^https?:\/\/doi.org\//,"");
  if(!/^https:\/\//i.test(url))throw Error("Verified source URL required");
  if(!doi)doi=null;
  const version=p.version==null?null:Number(p.version);
  if(version!==null&&(!Number.isInteger(version)||version<1))throw Error("Invalid revision");
  const authors=(p.authors||[]).map(x=>clean(typeof x==="string"?x:x.name)).filter(Boolean);
  return {id,source,title:clean(p.title),authors,doi,version,url,
   date:clean(p.submitted_date||p.date||p.published).slice(0,10)||null,
   journal:clean(p.journal_ref)||null};
 }
 function ris(p){
  const r=normalize(p);
  const out=["TY  - ELEC","TI  - "+r.title,...r.authors.map(a=>"AU  - "+a),
   "UR  - "+r.url,"AN  - "+r.source+":"+r.id];
  if(r.date)out.push("PY  - "+r.date.slice(0,4));
  if(r.doi)out.push("DO  - "+r.doi);
  if(r.version)out.push("N1  - Preprint revision v"+r.version);
  if(r.journal)out.push("N1  - Journal reference (as supplied): "+r.journal);
  out.push("ER  - ");
  return out.join("\r\n")+"\r\n";
 }
 function bibtex(p){
  const r=normalize(p);
  const escape=x=>clean(x).replace(/[{}\\]/g," ").replace(/&/g,"\\&").replace(/%/g,"\\%");
  const label=(r.source+"_"+r.id+"_"+(r.version||"unversioned")).replace(/[^A-Za-z0-9_-]/g,"_");
  const fields={title:r.title,author:r.authors.join(" and "),url:r.url,
   archiveprefix:r.source,eprint:r.id};
  if(r.doi)fields.doi=r.doi;
  if(r.date)fields.year=r.date.slice(0,4);
  if(r.version)fields.note="preprint revision v"+r.version;
  if(r.journal)fields.journal=r.journal;
  return "@misc{"+label+",\n"+Object.entries(fields).filter(([,x])=>x).map(([key,value])=>"  "+key+" = {"+escape(value)+"}").join(",\n")+"\n}\n";
 }
 function csl(p){
  const r=normalize(p),givenFamily=name=>{
   const s=name.trim();
   if(s.includes(",")){const [family,given]=s.split(",",2);return {family:family.trim(),given:given.trim()}}
   const parts=s.split(" ");return {family:parts.pop(),given:parts.join(" ")};
  };
  const o={type:"report",id:r.source+":"+r.id+(r.version?"v"+r.version:""),
   title:r.title,author:r.authors.map(givenFamily),URL:r.url,
   genre:"preprint",publisher:r.source};
  if(r.doi)o.DOI=r.doi;
  if(r.date)o.issued={"date-parts":[r.date.split("-").map(Number)]};
  if(r.version)o.version=String(r.version);
  if(r.journal)o.note="Journal reference (source supplied): "+r.journal;
  return o;
 }
 function unique(papers){
  const found=new Set(),out=[];
  for(const p of papers||[]){
   const r=normalize(p),key=r.source+":"+r.id+":v"+(r.version??"unknown");
   if(!found.has(key)){out.push(p);found.add(key)}
  }
  return out;
 }
 function exportAs(papers,format){
  const rows=unique(papers);
  if(format==="ris")return rows.map(ris).join("\r\n");
  if(format==="bibtex")return rows.map(bibtex).join("\n");
  if(format==="csl-json")return JSON.stringify(rows.map(csl),null,2);
  throw Error("Unsupported citation format");
 }
 return Object.freeze({normalize,ris,bibtex,csl,unique,exportAs});
});