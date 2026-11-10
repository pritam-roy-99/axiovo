/* Private ChatGPT controls: rendered ONLY when Axiovo is served by the local companion.
 * The public GitHub Pages website never reaches this endpoint.
 */
(function(){
"use strict";
if(location.hostname!=="127.0.0.1"||location.protocol!=="http:")return;
const $=id=>document.getElementById(id);
let csrf="",connected=false,models=[],history=[],pending=null,active=false;
const api=async(path,options={})=>{
 const res=await fetch("/api/"+path,{cache:"no-store",headers:csrf?{"X-Axiovo-Local":csrf}:undefined,...options});
 const data=await res.json();
 if(!res.ok)throw Error(data.error||"Local companion request failed");
 return data;
};
const post=(path,payload={})=>api(path,{method:"POST",headers:{"Content-Type":"application/json","X-Axiovo-Local":csrf},body:JSON.stringify(payload)});
function status(text){$("personal-chatgpt-status").textContent=text}
function append(role,content){const thread=$("prooflab-thread");thread.querySelector(".prooflab-welcome")?.remove();const item=document.createElement("article");item.className="prooflab-message "+role;const title=document.createElement("strong");title.textContent=role==="user"?"You · ChatGPT request":"ChatGPT · cloud response (unverified)";const body=document.createElement("div");body.textContent=content;item.append(title,body);thread.append(item);thread.scrollTop=thread.scrollHeight;return body}
function sessionLabel(session){
 connected=!!(session?.status==="connected"&&session?.sharing);
 const name=session?.identity?.email||session?.identity?.name||session?.profileLabel||"ChatGPT";
 $("personal-connect").hidden=connected;
 $("personal-disconnect").hidden=!connected;
 $("personal-ask").disabled=!connected||!models.length||active;
 status(connected?"Connected: "+name+" · Using ChatGPT plan. Only approved requests are sent.":session?.status==="connected"?"Signed in, but ChatGPT plan use is not authorized. Reconnect and approve plan usage.":"Not connected. Continue with ChatGPT to authorize this laptop-only app.");
}
async function refresh(){
 const data=await api("status");sessionLabel(data.session);
 if(!connected)return;
 try{
  const result=await api("models");models=result.models||[];
  const select=$("personal-model");select.replaceChildren();
  for(const model of models){const o=document.createElement("option");o.value=model.slug;o.textContent=model.displayName||model.slug;select.append(o)}
  $("personal-ask").disabled=!models.length;
  if(!models.length)status("Connected, but no eligible model was returned for this account.");
 }catch(e){models=[];$("personal-ask").disabled=true;status(e.message)}
}
function build(){
 const wrap=document.createElement("section");wrap.className="rd-panel prooflab-card prooflab-personal-card";
 wrap.setAttribute("aria-label","Private local ChatGPT controls");
 wrap.innerHTML=`<div class="prooflab-card-title"><span class="prooflab-glyph" aria-hidden="true">✦</span><h2>ChatGPT · personal</h2></div>
 <p class="prooflab-card-caption">Private localhost companion. ChatGPT inference runs in OpenAI's cloud, not offline.</p>
 <button class="rd-button rd-primary prooflab-wide-button" id="personal-connect" type="button">Continue with ChatGPT</button>
 <button class="rd-button rd-secondary prooflab-wide-button" id="personal-disconnect" type="button" hidden>Disconnect ChatGPT</button>
 <p class="rd-small prooflab-connection" id="personal-chatgpt-status" role="status">Checking local companion…</p>
 <label class="rd-label" for="personal-model">ChatGPT model</label>
 <select id="personal-model" aria-label="Available ChatGPT models"><option value="">Connect first</option></select>
 <fieldset class="prooflab-personal-privacy"><legend>What can this request send?</legend>
 <label><input id="personal-include-statement" type="checkbox"> Theorem statement</label>
 <label><input id="personal-include-assumptions" type="checkbox"> Assumptions</label>
 <label><input id="personal-include-lean" type="checkbox"> Lean editor contents</label>
 <label><input id="personal-history" type="checkbox"> Previous ChatGPT messages in this tab</label>
 </fieldset>
 <label class="prooflab-approve"><input type="checkbox" id="personal-approve"> I approve sending this question and selected context to ChatGPT.</label>
 <button class="rd-button rd-primary prooflab-wide-button" id="personal-ask" type="button" disabled>Ask ChatGPT</button>
 <button class="rd-button rd-secondary prooflab-wide-button" id="personal-cancel" type="button" hidden>Cancel generation</button>
 <button class="rd-button rd-secondary prooflab-wide-button" id="personal-clear" type="button">Clear ChatGPT context</button>
 <p class="rd-small"><a href="https://chatgpt.com/settings/usage" target="_blank" rel="noopener noreferrer">Manage ChatGPT usage & access</a>. Your ChatGPT account does not expose existing conversations or memories to this app.</p>`;
 document.querySelector(".prooflab-sidebar")?.append(wrap);
 $("personal-connect").addEventListener("click",async()=>{
  const b=$("personal-connect");b.disabled=true;status("Opening ChatGPT authorization in your browser. Review the permissions there.");
  try{await post("signin");await refresh()}catch(e){status(e.message)}
  finally{b.disabled=false}
 });
 $("personal-disconnect").addEventListener("click",async()=>{
  try{await post("disconnect");models=[];$("personal-model").replaceChildren();$("personal-model").add(new Option("Connect first",""));await refresh();status("Disconnected. The DevKit revoked the active renewable session where supported.")}catch(e){status(e.message)}
 });
 $("personal-clear").addEventListener("click",()=>{history=[];status("ChatGPT conversation context cleared from this tab. Local project and Lean drafts remain unchanged.")});
 $("personal-cancel").addEventListener("click",async()=>{pending?.abort();try{await post("cancel")}catch{}});
 $("personal-ask").addEventListener("click",send);
 return refresh();
}
async function send(){
 if(active||!connected||!$("personal-model").value)return;
 if(!$("personal-approve").checked){status("Check the request approval box before sending anything to ChatGPT.");return}
 const question=$("prooflab-prompt").value.trim();
 if(!question){status("Enter your question in the Proof conversation message box first.");return}
 const payload={approved:true,model:$("personal-model").value,question,
 includeStatement:$("personal-include-statement").checked,
 includeAssumptions:$("personal-include-assumptions").checked,
 includeLean:$("personal-include-lean").checked,
 statement:$("personal-include-statement").checked?$("statement").value:"",
 assumptions:$("personal-include-assumptions").checked?$("assumptions").value:"",
 lean:$("personal-include-lean").checked?$("lean").value:"",
 history:$("personal-history").checked?history:[],
 includeAttachment:!!window.AxiovoProofLabAttachments?.approvedText?.(),
 attachmentText:window.AxiovoProofLabAttachments?.approvedText?.()||""};
 $("personal-approve").checked=false;if(payload.includeAttachment)$("prooflab-send-files").checked=false;active=true;pending=new AbortController();
 $("personal-ask").disabled=true;$("personal-cancel").hidden=false;
 append("user",question);
 const output=append("assistant","Generating with ChatGPT…");let answer="",finished=false;
 status("Using ChatGPT plan · Sending approved text through the local companion.");
 try{
  const res=await fetch("/api/chat",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json","X-Axiovo-Local":csrf},body:JSON.stringify(payload),signal:pending.signal});
  if(!res.ok){const json=await res.json();throw Error(json.error||"ChatGPT request failed");}
  if(!res.body)throw Error("The local response stream is unavailable.");
  const reader=res.body.getReader(),decoder=new TextDecoder();let buffer="";
  while(true){
   const {value,done}=await reader.read();if(done)break;
   buffer+=decoder.decode(value,{stream:true});
   const events=buffer.split("\n\n");buffer=events.pop();
   for(const event of events){
    const line=event.split("\n").find(x=>x.startsWith("data: "));if(!line)continue;
    const data=JSON.parse(line.slice(6));
    if(data.type==="delta"){answer+=String(data.text||"");output.textContent=answer; $("prooflab-thread").scrollTop=$("prooflab-thread").scrollHeight;}
    if(data.type==="done")finished=true;
    if(data.type==="error")throw Error(data.message||"The request did not complete.");
   }
  }
  if(!finished)throw Error("The stream ended without a completion confirmation.");
  if(answer.trim()&&window.AxiovoProofLabMath)window.AxiovoProofLabMath.render(output,answer);
  if(!answer.trim())output.textContent="ChatGPT returned no text.";
  history.push({role:"user",content:question},{role:"assistant",content:answer});history=history.slice(-8);
  $("prooflab-prompt").value="";
  status("ChatGPT answered. The result is unverified until checked independently or by Lean.");
 }catch(e){output.textContent=answer||("ChatGPT could not complete: "+e.message);status("Request not completed: "+e.message)}
 finally{active=false;pending=null;$("personal-ask").disabled=false;$("personal-cancel").hidden=true}
}
api("bootstrap").then(data=>{if(!data.local||!data.token)return;csrf=data.token;return build()}).catch(()=>{/* No compatible private companion on this origin. */});
})();