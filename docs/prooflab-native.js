/* Native Axiovo layout glue: mirrors models beside the composer without bypassing consent. */
(function(){
"use strict";
const $=id=>document.getElementById(id), provider=$("prooflab-provider"),pick=$("prooflab-composer-model"),source=$("ollama-model"),send=$("ollama-suggest");
const settings=$("prooflab-settings");
let syncing=false,cloudMounted=false;
function setOptions(from){
 const previous=pick.value;pick.replaceChildren();
 if(!from){const opt=document.createElement("option");opt.value="";opt.textContent="Connect model";pick.append(opt);return}
 for(const option of from.options){const out=document.createElement("option");out.value=option.value;out.textContent=option.textContent;pick.append(out)}
 pick.value=Array.from(pick.options).some(x=>x.value===previous)?previous:from.value;
}
function syncModels(){
 if(syncing)return;syncing=true;
 try{setOptions(provider.value==="chatgpt"?$("personal-model"):source)}
 finally{syncing=false}
}
provider.addEventListener("change",()=>{
 syncModels();const cloud=$("prooflab-cloud-consent");if(cloud)cloud.classList.toggle("is-active",provider.value==="chatgpt");
});
pick.addEventListener("change",()=>{
 const target=provider.value==="chatgpt"?$("personal-model"):source;
 if(target){target.value=pick.value;target.dispatchEvent(new Event("change",{bubbles:true}));}
});
source.addEventListener("change",syncModels);
const modelsObserver=new MutationObserver(()=>syncModels());
modelsObserver.observe(source,{childList:true,subtree:true});
function mountCloudControls(){
 const card=document.querySelector(".prooflab-personal-card");
 if(!card)return;
 if(card.parentElement!==settings)settings.append(card);
 if(!cloudMounted){
  if(!Array.from(provider.options).some(x=>x.value==="chatgpt")){const opt=document.createElement("option");opt.value="chatgpt";opt.textContent="ChatGPT · cloud";provider.append(opt);}
  const consent=document.createElement("section");consent.className="prooflab-cloud-consent";consent.id="prooflab-cloud-consent";consent.setAttribute("aria-label","ChatGPT privacy and approval");
  const note=document.createElement("p");note.className="rd-small";note.textContent="ChatGPT uses the cloud. Check the selected context and approve each request. Attached files are sent only when their separate checkbox is selected.";
  consent.append(note);
  const form=card.querySelector(".prooflab-personal-privacy"),approve=card.querySelector(".prooflab-approve");
  if(form)consent.append(form);
  if(approve)consent.append(approve);
  $("prooflab-native-attachments")?.append(consent);
  if(!$("prooflab-native-attachments"))$("prooflab-attachment-status").after(consent);
  cloudMounted=true;
  const cloudModel=$("personal-model");if(cloudModel)modelsObserver.observe(cloudModel,{childList:true,subtree:true});
 }
 syncModels();
}
const sidebar=document.querySelector(".prooflab-sidebar");
const mutation=new MutationObserver(()=>{
 const card=document.querySelector(".prooflab-personal-card");
 if(card&&(!cloudMounted||card.parentElement!==settings))mountCloudControls();
});
mutation.observe(sidebar,{childList:true,subtree:false});
if(document.querySelector(".prooflab-personal-card"))mountCloudControls();
send.addEventListener("click",e=>{
 if(provider.value!=="chatgpt")return;
 e.stopImmediatePropagation();e.preventDefault();
 const cloudAsk=$("personal-ask");
 if(!cloudAsk){$("prooflab-attachment-status").textContent="ChatGPT is available only in Axiovo Personal on this laptop. Select Ollama or open the local edition.";return;}
 if(cloudAsk.disabled){
  settings.open=true;
  $("personal-connect")?.focus();
  $("prooflab-attachment-status").textContent="Authorize ChatGPT and select a model before sending.";
  return;
 }
 if(!$("personal-approve")?.checked){
  $("prooflab-cloud-consent")?.classList.add("is-active");
  $("personal-approve")?.focus();
  $("prooflab-attachment-status").textContent="Approve sending the question to ChatGPT before continuing.";
  return;
 }
 cloudAsk.click();
},true);
$("prooflab-prompt").addEventListener("keydown",e=>{
 // Existing Ctrl+Enter handler clicks Send; capture handler above routes correctly.
});
syncModels();
})();