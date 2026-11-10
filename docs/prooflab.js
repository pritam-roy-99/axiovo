"use strict";
(function(){
const $=id=>document.getElementById(id),P=window.AxiovoProofLab;let project=null;
function feedback(s){$("feedback").textContent=s}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function render(){if(!project)return;const open=P.report(project).open;$("workspace").hidden=false;$("project-title").textContent=project.title;$("project-status").textContent="Status: Unverified draft · "+open+" open obligations";$("obligation-count").textContent=open+" open";$("prooflab-toolbar-status").textContent=project.title+" · Draft · "+open+" open";$("prooflab-empty-obligations").hidden=open>0;const ol=$("obligations");ol.replaceChildren();for(const item of project.obligations){const li=document.createElement("li");li.textContent=item.statement+" (open)";ol.append(li)}}
// Optional user-initiated handoff from the Research Assistant; never fetch paper content automatically.
const params=new URLSearchParams(location.search);
const prefill=params.get("statement");
if(prefill){$("statement").value=prefill.slice(0,12000);feedback("Statement imported from the Research Assistant. Review its assumptions before proceeding.");}
$("create").addEventListener("click",()=>{project=P.create($("title").value,$("statement").value,$("assumptions").value);if(!project.title||!project.statement){feedback("A title and theorem statement are required.");project=null;return}render();chatHistory=[];const thread=$("prooflab-thread");if(thread){thread.replaceChildren();const welcome=document.createElement("p");welcome.className="prooflab-welcome";welcome.textContent="Your proof plan is ready. Ask your local AI model for a strategy or a lemma.";thread.append(welcome)}feedback("Proof plan created locally. No data uploaded.")});
$("add").addEventListener("click",()=>{if(!project)return;try{project=P.addObligation(project,$("obligation").value);$("obligation").value="";render()}catch(e){feedback(e.message)}});
$("lean").addEventListener("input",()=>{if(project){project=P.setLean(project,$("lean").value);render()}});
const O=window.AxiovoProofLabOllama;let chatHistory=[];
function chatMessage(role,content){const thread=$("prooflab-thread");const welcome=thread.querySelector(".prooflab-welcome");if(welcome)welcome.remove();const article=document.createElement("article");article.className="prooflab-message "+role;const name=document.createElement("strong");name.textContent=role==="user"?"You":"Local AI · unverified";const body=document.createElement("div");body.textContent=content;article.append(name,body);thread.append(article);thread.scrollTop=thread.scrollHeight;return article;}
$("prooflab-prompt").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();$("ollama-suggest").click();}});
$("prooflab-strategy").addEventListener("click",()=>{$("prooflab-prompt").value="Propose a rigorous proof strategy, identify essential lemmas, and explain any gaps in the argument.";$("ollama-suggest").click();});
$("ollama-detect").addEventListener("click",async()=>{const b=$("ollama-detect");b.disabled=true;$("ollama-status").textContent="Checking local Ollama…";try{const models=await O.models();const select=$("ollama-model");select.replaceChildren();for(const model of models){const option=document.createElement("option");option.value=model;option.textContent=model;select.append(option)}$("ollama-status").textContent=models.length?"Connected. Select a model and request a proof strategy.":"Ollama is running but has no installed models. Run: ollama pull qwen2.5:3b";}catch(e){$("ollama-status").textContent="Local Ollama unavailable. Start Ollama and allow this site's origin. "+String(e.message||e).slice(0,160)}finally{b.disabled=false}});
$("ollama-suggest").addEventListener("click",async()=>{
 if(!project){feedback("Create a proof project first.");return}
 const model=$("ollama-model").value;if(!model){$("ollama-status").textContent="Detect and select an installed model first.";return}
 const question=$("prooflab-prompt").value.trim()||"Suggest a proof strategy with intermediate lemmas and identify any gaps.";
 const b=$("ollama-suggest");b.disabled=true;$("ollama-status").textContent="Generating a local, unverified suggestion…";
 try{
  const answer=await O.suggest({model,statement:project.statement,assumptions:project.assumptions,obligations:project.obligations,question,history:chatHistory});
  chatMessage("user",question);chatMessage("assistant",answer);chatHistory.push({role:"user",content:question},{role:"assistant",content:answer});chatHistory=chatHistory.slice(-8);
  $("ollama-output").textContent=answer;$("prooflab-prompt").value="";
  $("ollama-status").textContent="Local suggestion received from "+model+". Check the steps using Lean 4.";
 }catch(e){$("ollama-status").textContent="Local generation failed: "+String(e.message||e).slice(0,200)}
 finally{b.disabled=false}
});
$("download-lean").addEventListener("click",()=>{if(!project)return;download("axiovo-prooflab.lean",project.lean||"-- Unverified Lean 4 draft\n","text/plain")});
$("download-json").addEventListener("click",()=>{if(!project)return;download("axiovo-prooflab.json",P.exportJSON(project),"application/json")});
// Start with an editable local draft to make the whole studio useful on first load.
$("create").click();
})();