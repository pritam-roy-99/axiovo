/* Zotero-compatible RIS integration. Import only records that explicitly contain an arXiv ID.
 * No permission to write into Zotero; users import the file in Zotero or use its Connector on arxiv.org.
 */
(function(root,factory){
 "use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoCitation=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const arxiv=/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?\/\d{7})(?:v\d+)?$/i;
 const fromText=value=>{
  const s=String(value||"").trim();
  const direct=s.replace(/^arxiv:\s*/i,"").replace(/^https?:\/\/(?:www\.)?arxiv\.org\/(?:abs|pdf)\//i,"").replace(/\.pdf$/i,"");
  if(arxiv.test(direct))return direct;
  const embedded=s.match(/(?:arxiv\.org\/(?:abs|pdf)\/|arxiv:\s*)(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+(?:\.[a-z]{2})?\/\d{7}(?:v\d+)?)/i);
  return embedded&&arxiv.test(embedded[1])?embedded[1]:"";
 };
 const clean=v=>String(v||"").replace(/[\r\n]+/g," ").trim();
 function ris(p){
  const id=fromText(p.id||p.arxiv||"");
  if(!id)throw Error("RIS export requires a verified arXiv identifier");
  const lines=["TY  - ELEC","TI  - "+clean(p.title),"PY  - "+clean(p.published||"").slice(0,4),
   ...(p.authors||[]).map(x=>"AU  - "+clean(x)),
   "UR  - https://arxiv.org/abs/"+id,"AN  - arXiv:"+id];
  if(/^10\.\d{4,9}\//.test(String(p.doi||"").replace(/^https:\/\/doi\.org\//,"")))lines.push("DO  - "+String(p.doi).replace(/^https:\/\/doi\.org\//,""));
  lines.push("ER  - ");return lines.join("\r\n");
 }
 function parseRIS(text){
  if(typeof text!=="string"||text.length>2e6)throw Error("RIS file too large");
  const records=[];let lines=[],current=null;
  for(const line of text.split(/\r?\n/)){
   const m=line.match(/^([A-Z0-9]{2})  - ?(.*)$/);
   if(!m)continue;
   if(m[1]==="TY"){current={};lines=[]}
   if(!current)continue;
   if(!current[m[1]])current[m[1]]=[];
   current[m[1]].push(m[2].trim());
   if(m[1]==="ER"){
    const id=[...(current.AN||[]),...(current.UR||[]),...(current.N1||[]),...(current.ID||[])].map(fromText).find(Boolean);
    if(id)records.push(id);
    current=null;
   }
  }
  return [...new Set(records)].slice(0,10000);
 }
 function download(name,content){
  const url=URL.createObjectURL(new Blob([content],{type:"application/x-research-info-systems"}));
  const a=document.createElement("a");a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return {fromText,ris,parseRIS,download};
});