/* Local PDF passage extraction only. No uploads, network calls or invented equations. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoPdfEvidence=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 async function extract(file,{pdfjs,paper,maxPages=40}={}){
  if(!file||typeof file.arrayBuffer!=="function")throw Error("Choose a local PDF file");
  if(!pdfjs||!pdfjs.getDocument)throw Error("PDF.js is required for local extraction");
  if(!paper?.id||!paper.version&&paper?.version!==0)throw Error("Paper ID and revision must be explicitly identified");
  if(file.size>45*1024*1024)throw Error("PDF exceeds the 45 MB local processing limit");
  const bytes=new Uint8Array(await file.arrayBuffer());
  const task=pdfjs.getDocument({data:bytes});
  let document;
  try{
   document=await task.promise;
   const count=Math.min(document.numPages,Math.max(1,Math.min(100,maxPages)));
   const passages=[];
   for(let pageNumber=1;pageNumber<=count;pageNumber++){
    const page=await document.getPage(pageNumber);
    const text=await page.getTextContent();
    const blocks=(text.items||[]).map(item=>String(item.str||"").trim()).filter(Boolean);
    if(!blocks.length){
     passages.push({source_id:paper.id,version:paper.version,page:pageNumber,
      extraction_status:"no-extractable-text",method:"PDF.js-local",
      text:"",warning:"Scanned or image-only content; no quotation asserted"});
     continue;
    }
    // PDF.js reading order is NOT guaranteed for multicolumn pages, math or tables.
    passages.push({source_id:paper.id,version:paper.version,page:pageNumber,
     section:null,method:"PDF.js-local",
     extraction_status:"layout-uncertain",
     text:blocks.join(" "),
     warning:"Reading order and equations require manual verification against this PDF"});
   }
   return {private_file:true,uploaded:false,paper_id:paper.id,version:paper.version,
    pages_read:count,document_pages:document.numPages,passages};
  }finally{
   if(document)await document.destroy();
   else if(task.destroy)await task.destroy();
  }
 }
 return Object.freeze({extract});
});