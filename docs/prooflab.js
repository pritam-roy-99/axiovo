"use strict";
(function(){
const $=id=>document.getElementById(id),P=window.AxiovoProofLab;let project=null;
function feedback(s){$("feedback").textContent=s}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function render(){if(!project)return;const open=P.report(project).open;$("workspace").hidden=false;$("project-title").textContent=project.title;$("project-status").textContent="Status: Unverified draft · "+open+" open obligations";$("obligation-count").textContent=open+" open";$("prooflab-toolbar-status").textContent=project.title+" · Draft · "+open+" open";$("prooflab-empty-obligations").hidden=open>0;const ol=$("obligations");ol.replaceChildren();for(const item of project.obligations){const li=document.createElement("li");li.textContent=item.statement+" (open)";ol.append(li)}}
// Optional user-initiated handoff from the Research Assistant; never fetch paper content automatically.
const params=new URLSearchParams(location.search);
let prefill=params.get("statement");
if(!prefill){
 try{
  const stored=sessionStorage.getItem("axiovo-prooflab-handoff-v1");
  if(stored){
   sessionStorage.removeItem("axiovo-prooflab-handoff-v1");
   const handoff=JSON.parse(stored);
   if(typeof handoff.statement==="string"&&
      Number.isFinite(handoff.createdAt)&&
      Date.now()-handoff.createdAt<30*60*1000){
    prefill=handoff.statement;
   }
  }
 }catch{/* The independent ProofLab workspace remains available. */}
}
if(prefill){
 $("statement").value=prefill.slice(0,12000);
 feedback("Imported draft from Research Assistant. Check that it is a theorem, then review all assumptions and regenerate the proof plan. AI suggestions are not verified proofs.");
}
$("create").addEventListener("click",()=>{project=P.create($("title").value,$("statement").value,$("assumptions").value);if(!project.title||!project.statement){feedback("A title and theorem statement are required.");project=null;return}render();chatHistory=[];const thread=$("prooflab-thread");if(thread){thread.replaceChildren();const welcome=document.createElement("p");welcome.className="prooflab-welcome";welcome.textContent="Your proof plan is ready. Ask your local AI model for a strategy or a lemma.";thread.append(welcome)}feedback("Proof plan created locally. No data uploaded.")});
$("add").addEventListener("click",()=>{if(!project)return;try{project=P.addObligation(project,$("obligation").value);$("obligation").value="";render()}catch(e){feedback(e.message)}});
$("lean").addEventListener("input",()=>{if(project){project=P.setLean(project,$("lean").value);render()}});
const O=window.AxiovoProofLabOllama;let chatHistory=[];
function displayError(message){const issue=String(message||"Connection unavailable.");const guide="Check that Ollama is running on this computer at http://127.0.0.1:11434, that OLLAMA_ORIGINS includes https://pritam-roy-99.github.io, and that your browser allows local-network requests.";chatMessage("assistant","Connection issue: "+issue+"\n\n"+guide);$("ollama-status").textContent="Connection issue: "+issue+" Check the conversation for troubleshooting steps.";}
function waitingMessage(){return chatMessage("assistant","Generating with your local model… A 7B model can take some time on a 4 GB graphics card. Your request has been sent; no proof is verified yet.");}
function chatMessage(role,content){const thread=$("prooflab-thread");const welcome=thread.querySelector(".prooflab-welcome");if(welcome)welcome.remove();const article=document.createElement("article");article.className="prooflab-message "+role;const name=document.createElement("strong");name.textContent=role==="user"?"You":"Local AI · unverified";const body=document.createElement("div");if(role==="assistant"&&window.AxiovoProofLabMath){window.AxiovoProofLabMath.render(body,content)}else body.textContent=content;article.append(name,body);thread.append(article);thread.scrollTop=thread.scrollHeight;return article;}
$("prooflab-prompt").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();$("ollama-suggest").click();}});
$("prooflab-strategy").addEventListener("click",()=>{$("prooflab-prompt").value="Propose a rigorous proof strategy, identify essential lemmas, and explain any gaps in the argument.";$("ollama-suggest").click();});
$("ollama-detect").addEventListener("click",async()=>{
 const b=$("ollama-detect");b.disabled=true;$("ollama-status").textContent="Checking Ollama at http://127.0.0.1:11434…";
 try{
  const models=await O.models(),select=$("ollama-model");select.replaceChildren();
  if(!models.length){const option=document.createElement("option");option.value="";option.textContent="No installed models";select.append(option);displayError("Ollama is reachable but no models were found. Install one with: ollama pull qwen2.5:3b");return;}
  for(const model of models){const option=document.createElement("option");option.value=model;option.textContent=model;select.append(option)}
  const preferred=models.find(name=>name==="deepseek-r1:7b")||models.find(name=>name==="qwen2.5:3b")||models[0];select.value=preferred;
  $("ollama-status").textContent="Connected to local Ollama · "+models.length+" installed model"+(models.length===1?"":"s")+". Selected "+preferred+".";
  chatMessage("assistant","Connected to your local Ollama server. Using "+preferred+". Enter a question and press Send to local AI to generate an unverified proof strategy.");
 }catch(e){displayError("Cannot detect local Ollama models: "+String(e.message||e).slice(0,160))}
 finally{b.disabled=false}
});
$("ollama-suggest").addEventListener("click",async()=>{
 if(!project){displayError("Create a proof project first.");return;}
 const model=$("ollama-model").value;
 if(!model){displayError("No model selected. Click Find installed Ollama models, then select your installed Qwen or DeepSeek model.");return;}
 const question=$("prooflab-prompt").value.trim()||"Suggest a proof strategy with intermediate lemmas and identify any gaps.";
 const b=$("ollama-suggest"),strategy=$("prooflab-strategy");b.disabled=true;strategy.disabled=true;
 chatMessage("user",question);$("prooflab-prompt").value="";const pending=waitingMessage();
 $("ollama-status").textContent="Generating with "+model+"…";
 try{
  const answer=await O.suggest({model,statement:project.statement,assumptions:project.assumptions,obligations:project.obligations,question,history:chatHistory});
  pending.remove();chatMessage("assistant",answer);
  chatHistory.push({role:"user",content:question},{role:"assistant",content:answer});chatHistory=chatHistory.slice(-8);
  $("ollama-output").textContent=answer;
  $("ollama-status").textContent="Answer received from "+model+". This is a draft argument, not a verified Lean proof.";
 }catch(e){
  pending.remove();const issue=String(e.message||e).slice(0,200);
  $("prooflab-prompt").value=question;displayError("Generation failed: "+issue);
 }finally{b.disabled=false;strategy.disabled=false}
});
$("download-lean").addEventListener("click",()=>{if(!project)return;download("axiovo-prooflab.lean",project.lean||"-- Unverified Lean 4 draft\n","text/plain")});
$("download-json").addEventListener("click",()=>{if(!project)return;download("axiovo-prooflab.json",P.exportJSON(project),"application/json")});
// Start with an editable local draft to make the whole studio useful on first load.
$("create").click();
})();