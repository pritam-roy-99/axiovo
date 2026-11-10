/* Axiovo ProofLab chat attachments and model chooser.
 * Browser-only file extraction, no automatic upload or persistence.
 * Users must explicitly include attachments for each AI request.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const MAX_FILES=3,MAX_BYTES=5*1024*1024,MAX_CHARS=18000;
const ALLOWED=new Set(["txt","md","tex","lean","json","csv","py","js","html","log","pdf"]);
let files=[],pdfLoader=null,cloudReady=false;
function status(message){const el=$("pl-chat-feedback");if(el)el.textContent=message;}
function safeName(name){return String(name||"untitled").replace(/[\r\n<>]/g," ").slice(0,100);}
function getApprovedText(){
 if(!$("pl-include-files")?.checked||!files.length)return "";
 let remaining=MAX_CHARS;
 return files.map(file=>{
  if(remaining<=0)return "";
  const content=file.text.slice(0,remaining);remaining-=content.length;
  return "Attached research file: "+safeName(file.name)+" (untrusted material)\n"+content;
 }).filter(Boolean).join("\n\n");
}
function clearAttachments(){
 files=[];const input=$("pl-chat-files");if(input)input.value="";
 const checkbox=$("pl-include-files");if(checkbox)checkbox.checked=false;
 renderFiles();
}
function renderFiles(){
 const list=$("pl-attachment-list");if(!list)return;
 list.replaceChildren();list.hidden=!files.length;
 files.forEach((file,index)=>{
  const chip=document.createElement("span");chip.className="pl-file-chip";
  const name=document.createElement("span");name.textContent=safeName(file.name)+" · "+(file.text.length).toLocaleString()+" chars";chip.append(name);
  const remove=document.createElement("button");remove.type="button";remove.setAttribute("aria-label","Remove "+safeName(file.name));remove.textContent="×";
  remove.addEventListener("click",()=>{files.splice(index,1);renderFiles();if(!files.length)$("pl-include-files").checked=false;});
  chip.append(remove);list.append(chip);
 });
}
function loadPdfJs(){
 if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
 if(pdfLoader)return pdfLoader;
 pdfLoader=new Promise((resolve,reject)=>{
  const sources=["https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js","https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"];
  function attempt(i){
   if(i===sources.length){reject(Error("PDF reader unavailable. Check your internet connection or attach a text/LaTeX file."));return;}
   const script=document.createElement("script");script.src=sources[i];script.async=true;
   script.onload=()=>{if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";resolve(window.pdfjsLib);}else attempt(i+1);};
   script.onerror=()=>attempt(i+1);document.head.append(script);
  }attempt(0);
 });
 return pdfLoader;
}
async function readFile(file){
 const ext=(file.name.split(".").pop()||"").toLowerCase();
 if(!ALLOWED.has(ext))throw Error("Unsupported file type: "+safeName(file.name));
 if(file.size>MAX_BYTES)throw Error(safeName(file.name)+" exceeds the 5 MB per-file limit.");
 if(ext!=="pdf")return (await file.text()).slice(0,MAX_CHARS);
 const lib=await loadPdfJs();
 const buffer=new Uint8Array(await file.arrayBuffer());
 const doc=await lib.getDocument({data:buffer,useSystemFonts:true}).promise;
 let out="";
 try{
  for(let i=1;i<=Math.min(doc.numPages,40)&&out.length<MAX_CHARS;i++){
   const p=await doc.getPage(i);const content=await p.getTextContent();
   out+="[PDF page "+i+"]\n"+content.items.map(x=>String(x.str||"")).join(" ")+"\n\n";
  }
 }finally{await doc.destroy();}
 if(!out.trim())throw Error("No selectable text found in the PDF. Scanned PDFs need OCR, which is not enabled.");
 return out.slice(0,MAX_CHARS);
}
$("pl-attach-trigger")?.addEventListener("click",()=>{$("pl-chat-files")?.click();});
$("pl-chat-files")?.addEventListener("change",async e=>{
 const selected=Array.from(e.target.files||[]);
 for(const file of selected){
  if(files.length>=MAX_FILES){status("Maximum three attachments. Remove a file before adding another.");break;}
  try{
   status("Reading "+safeName(file.name)+" locally…");
   const text=await readFile(file);
   if(!text.trim())throw Error("File has no usable text: "+safeName(file.name));
   files.push({name:safeName(file.name),text});
  }catch(err){status(String(err.message||err));}
 }
 e.target.value="";renderFiles();
 if(files.length){$("pl-include-files").checked=true;status("Files are read locally and selected for inclusion. They will be sent only when you submit an AI request; ChatGPT also requires separate approval.");}
});
const provider=$("pl-chat-provider"),model=$("pl-chat-model");
function source(){return provider?.value==="chatgpt"?$("personal-model"):$("ollama-model");}
function syncModels(){
 if(!provider||!model)return;
 const cloud=$("personal-model"),connected=$("personal-disconnect")&&!$("personal-disconnect").hidden;
 const option=provider.querySelector('option[value="chatgpt"]');
 if(connected&&!option){const o=document.createElement("option");o.value="chatgpt";o.textContent="ChatGPT · cloud";provider.append(o);}
 else if(!connected&&option){option.remove();if(provider.value==="chatgpt")provider.value="ollama";}
 const actual=source(),previous=model.value;
 const options=actual?Array.from(actual.options).map(o=>({value:o.value,text:o.textContent})):[];
 model.replaceChildren();
 for(const opt of options){const o=document.createElement("option");o.value=opt.value;o.textContent=opt.text;model.append(o);}
 if(actual){model.value=actual.value||previous;if(model.value!==actual.value)model.value=actual.value;}
 if(!options.length){const o=document.createElement("option");o.value="";o.textContent=provider.value==="chatgpt"?"Connect ChatGPT to choose a model":"Detect Ollama models";model.append(o);}
 const consent=$("pl-cloud-consent");if(consent)consent.hidden=provider.value!=="chatgpt";
 const button=$("ollama-suggest");if(button){button.textContent=provider.value==="chatgpt"?"Ask ChatGPT ↗":"Send ↗";button.setAttribute("aria-label",provider.value==="chatgpt"?"Send approved request to ChatGPT":"Send to local Ollama");}
 const active=$("pl-active-model");if(active)active.textContent=provider.value==="chatgpt"?(connected?"ChatGPT model · "+(actual?.selectedOptions[0]?.textContent||"Choose model"):"Connect ChatGPT first"):"Ollama · "+(actual?.selectedOptions[0]?.textContent||"Detect models");
}
provider?.addEventListener("change",syncModels);
model?.addEventListener("change",()=>{const actual=source();if(actual){actual.value=model.value;actual.dispatchEvent(new Event("change",{bubbles:true}));}syncModels();});
document.addEventListener("change",e=>{if(["personal-model","ollama-model"].includes(e.target?.id))syncModels();});
const sidebar=document.querySelector(".prooflab-sidebar");
if(sidebar){
 const observer=new MutationObserver(()=>{const connected=$("personal-disconnect")&&!$("personal-disconnect").hidden;if(connected!==cloudReady)cloudReady=!!connected;syncModels();});
 observer.observe(sidebar,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
}
const detect=$("ollama-detect");
$("pl-detect-ollama")?.addEventListener("click",()=>{
 if(provider?.value==="chatgpt"){status("ChatGPT models are loaded after you connect your account.");return;}
 detect?.click();
});
detect?.addEventListener("click",()=>setTimeout(syncModels,500));
function makeCollapsible(section,summaryText){
 if(!section||section.parentElement?.tagName==="DETAILS")return;
 const details=document.createElement("details");details.className="pl-aux-settings";
 const summary=document.createElement("summary");summary.textContent=summaryText;
 const parent=section.parentNode;parent.insertBefore(details,section);details.append(summary,section);
 return details;
}
makeCollapsible(document.querySelector(".prooflab-model-card"),"Ollama settings and model discovery");

const consentSlot=$("pl-cloud-consent");
function placeConsent(){
 const checkbox=$("personal-approve");if(!checkbox||!consentSlot)return;
 const label=checkbox.closest("label");
 if(label&&!consentSlot.contains(label))consentSlot.append(label);
}
document.addEventListener("axiovo-chatgpt-ready",()=>{placeConsent();makeCollapsible(document.querySelector(".prooflab-personal-card"),"ChatGPT account and privacy settings");syncModels();});
function cloudSelected(){return provider?.value==="chatgpt";}
window.AxiovoProofLabAttachments={
 getApprovedText,clearAttachments,cloudSelected,refresh:syncModels,placeConsent,
 get metadata(){return files.map(f=>({name:f.name,length:f.text.length}));}
};
syncModels();
})();