/* Local, opt-in text attachments for ProofLab; no background uploads. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const MAX_TEXT=80000,MAX_FILES=4,MAX_BYTES=8000000;
let items=[],busy=false;
function status(message){$("prooflab-attachment-status").textContent=message;}
function stripControl(text){return String(text||"").replace(/\u0000/g,"").slice(0,MAX_TEXT);}
function summary(){
 const wrap=$("prooflab-attachment-list");wrap.replaceChildren();
 items.forEach((item,i)=>{
  const chip=document.createElement("span");chip.className="prooflab-attachment-chip";
  const name=document.createElement("span");name.textContent=item.name+" ("+Math.ceil(item.text.length/1024)+" KB text)";
  const del=document.createElement("button");del.type="button";del.textContent="×";del.setAttribute("aria-label","Remove "+item.name);
  del.addEventListener("click",()=>{items.splice(i,1);$("prooflab-send-files").checked=false;summary();});
  chip.append(name,del);wrap.append(chip);
 });
 if(!items.length)status("Attachments stay on this device unless you approve sending extracted text. Supported: TXT, Markdown, LaTeX, Lean, CSV, JSON and PDF.");
 else status(items.length+" local file(s) selected. Only extracted text (up to 80 KB combined) can be sent after explicit approval.");
}
let pdfLoader;
function pdfjs(){
 if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
 if(!pdfLoader)pdfLoader=new Promise((resolve,reject)=>{
  const urls=["https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js","https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"];
  function attempt(i){
   if(i===urls.length){reject(Error("PDF reader unavailable. Check your internet connection or convert the PDF to text."));return}
   const script=document.createElement("script");script.src=urls[i];script.async=true;
   script.onload=()=>window.pdfjsLib?resolve(window.pdfjsLib):attempt(i+1);
   script.onerror=()=>attempt(i+1);document.head.append(script);
  }
  attempt(0);
 });
 return pdfLoader;
}
async function extract(file){
 if(file.size>MAX_BYTES)throw Error(file.name+" is larger than the 8 MB file limit.");
 const ext=file.name.toLowerCase().split(".").pop();
 if(ext==="pdf"){
  const lib=await pdfjs();
  lib.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  const bytes=new Uint8Array(await file.arrayBuffer());
  const doc=await lib.getDocument({data:bytes,useSystemFonts:true}).promise;
  let text="";
  try{
   for(let page=1;page<=Math.min(doc.numPages,80);page++){
    const data=await (await doc.getPage(page)).getTextContent();
    text+="\n[Page "+page+"]\n"+data.items.map(x=>x.str||"").join(" ")+"\n";
    if(text.length>=MAX_TEXT)break;
   }
  }finally{await doc.destroy();}
  if(!text.trim())throw Error("No extractable text found in "+file.name+". Scanned PDFs require OCR, which is not available here.");
  return stripControl(text);
 }
 if(!["txt","md","tex","lean","json","csv"].includes(ext))throw Error("Unsupported file type: "+file.name);
 const decoded=await file.text();
 if(decoded.includes("\u0000"))throw Error(file.name+" does not appear to be a text file.");
 return stripControl(decoded);
}
function approvedText(){
 if(!$("prooflab-send-files").checked||!items.length)return "";
 let length=0;const chunks=[];
 for(const item of items){
  const remaining=MAX_TEXT-length;
  if(remaining<=0)break;
  const segment="[Attached file: "+item.name+"]\n"+item.text.slice(0,Math.max(0,remaining-180));
  chunks.push(segment);length+=segment.length+2;
 }
 return chunks.join("\n\n").slice(0,MAX_TEXT);
}
$("prooflab-attach").addEventListener("click",()=>$("prooflab-file-input").click());
$("prooflab-file-input").addEventListener("change",async()=>{
 if(busy)return;busy=true;$("prooflab-send-files").checked=false;const files=Array.from($("prooflab-file-input").files||[]);
 try{
  for(const file of files){
   if(items.length>=MAX_FILES){status("Maximum four files per request.");break;}
   if(items.some(x=>x.name===file.name&&x.size===file.size)){continue;}
   status("Reading "+file.name+" locally…");
   try{
    const text=await extract(file);
    if(!text.trim())throw Error("The selected file contains no readable text.");
    if(items.reduce((n,item)=>n+item.text.length,0)+text.length>MAX_TEXT)throw Error("Combined extracted text exceeds 80 KB. Remove a file or choose a smaller one.");
    items.push({name:file.name,size:file.size,text});
   }catch(error){status(error.message);return;}
  }
  summary();
 }finally{busy=false;$("prooflab-file-input").value="";}
});
$("prooflab-send-files").addEventListener("change",()=>{
 if($("prooflab-send-files").checked&&!items.length){$("prooflab-send-files").checked=false;status("Attach a supported file first.");}
});
summary();
window.AxiovoProofLabAttachments={approvedText,hasFiles:()=>items.length>0,list:()=>items.map(x=>x.name)};
})();