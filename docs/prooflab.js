"use strict";
(function(){
const $=id=>document.getElementById(id),P=window.AxiovoProofLab;let project=null;
function feedback(s){$("feedback").textContent=s}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function render(){if(!project)return;$("workspace").hidden=false;$("project-title").textContent=project.title;$("project-status").textContent="Status: Unverified draft · "+P.report(project).open+" open obligations";const ol=$("obligations");ol.replaceChildren();for(const item of project.obligations){const li=document.createElement("li");li.textContent=item.statement+" (open)";ol.append(li)}}
$("create").addEventListener("click",()=>{project=P.create($("title").value,$("statement").value,$("assumptions").value);if(!project.title||!project.statement){feedback("A title and theorem statement are required.");project=null;return}render();feedback("Proof plan created locally. No data uploaded.")});
$("add").addEventListener("click",()=>{if(!project)return;try{project=P.addObligation(project,$("obligation").value);$("obligation").value="";render()}catch(e){feedback(e.message)}});
$("lean").addEventListener("input",()=>{if(project){project=P.setLean(project,$("lean").value);render()}});
$("download-lean").addEventListener("click",()=>{if(!project)return;download("axiovo-prooflab.lean",project.lean||"-- Unverified Lean 4 draft\n","text/plain")});
$("download-json").addEventListener("click",()=>{if(!project)return;download("axiovo-prooflab.json",P.exportJSON(project),"application/json")});
})();