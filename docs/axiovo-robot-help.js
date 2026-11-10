(()=>{
"use strict";
if(window.__axiovoRobotHelp)return;window.__axiovoRobotHelp=true;
const base=new URL("./",document.currentScript?.src||location.href);
const pages={"Home":"index.html","arXiv":"arxiv.html","bioRxiv":"biorxiv.html","ChemRxiv":"chemrxiv.html","Cryptology ePrint":"crypto.html","Research Desk":"desk.html","My Feed":"feed.html","Library":"workspace.html","Research Assistant":"copilot.html","ProofLab":"prooflab.html","Research Tools":"lab.html","Settings":"profiles.html","Methodology":"methodology.html"};
const style=document.createElement("style");style.textContent="#axiovo-robot{position:fixed;right:16px;bottom:16px;z-index:2147480000;font:14px/1.4 system-ui,sans-serif;color:#17324a}#axiovo-robot *{box-sizing:border-box}#axiovo-robot button,#axiovo-robot input{font:inherit}#axiovo-robot .robot-fab{touch-action:none;display:grid;place-items:center;width:56px;height:56px;border:2px solid #b2dced;border-radius:18px;background:#123e5d;color:white;box-shadow:0 9px 30px #081e3866;cursor:grab}#axiovo-robot .robot-panel{position:fixed;right:16px;bottom:83px;width:min(375px,calc(100vw - 24px));height:min(510px,calc(100dvh - 105px));display:flex;flex-direction:column;border:1px solid #a2c8de;border-radius:18px;background:#f8fbfe;color:#17324a;box-shadow:0 18px 50px #071c3666;overflow:hidden}#axiovo-robot .robot-panel[hidden]{display:none}#axiovo-robot .robot-head{display:flex;justify-content:space-between;align-items:center;background:#123e5d;color:white;padding:12px}#axiovo-robot .robot-head small{display:block;font-size:11px;color:#c4e6f5}#axiovo-robot .robot-close{background:transparent;color:white;border:0;font-size:24px;cursor:pointer}#axiovo-robot .robot-log{overflow:auto;flex:1;display:flex;flex-direction:column;gap:9px;padding:12px}#axiovo-robot .robot-msg{align-self:flex-start;max-width:94%;background:#e5f0f8;border-radius:12px;padding:10px;white-space:pre-wrap;overflow-wrap:anywhere}#axiovo-robot .robot-msg.user{align-self:flex-end;background:#d3eafb}#axiovo-robot .robot-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}#axiovo-robot .robot-links a{background:white;color:#075780;border:1px solid #9dc2d4;border-radius:8px;padding:5px 8px;text-decoration:none}#axiovo-robot .robot-actions{display:flex;flex-wrap:wrap;gap:6px;padding:0 10px 9px}#axiovo-robot .robot-actions button{border:1px solid #a0c5d6;color:#17425c;background:white;border-radius:7px;padding:6px;cursor:pointer;font-size:12px}#axiovo-robot .robot-form{display:flex;gap:5px;padding:9px;border-top:1px solid #cedfea}#axiovo-robot .robot-form input{flex:1;min-width:0;border:1px solid #a5c1d1;border-radius:8px;padding:9px;background:white;color:#18394e}#axiovo-robot .robot-form button{min-width:37px;border:1px solid #9bc3d5;border-radius:8px;background:#e8f3f9;color:#17415a;cursor:pointer}#axiovo-robot .robot-note{font-size:10px;color:#5b7185;padding:0 10px 9px}#axiovo-robot button:focus-visible,#axiovo-robot input:focus-visible{outline:3px solid #2ba9d6;outline-offset:2px}";document.head.append(style);
style.textContent+="\n#axiovo-robot .robot-launcher{display:flex;align-items:center;gap:8px;max-width:calc(100vw - 18px)}\n#axiovo-robot .robot-help-label{pointer-events:none;color:#fff;background:#123e5d;border:1px solid #88b8d2;box-shadow:0 6px 20px #081e3833;border-radius:15px;padding:9px 13px;font-size:14px;font-weight:750;white-space:nowrap}\n#axiovo-robot .robot-voice-settings{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:8px 11px;border-bottom:1px solid #cfdeea;font-size:12px}\n#axiovo-robot .robot-voice-settings select{flex:1;min-width:100px;max-width:230px;height:32px;padding:3px;border:1px solid #abc6d7;border-radius:7px;background:white;color:#17324a}\n#axiovo-robot .robot-voice-settings button{padding:4px 8px;border-radius:7px;background:#e8f3f9;color:#17425a;border:1px solid #abc6d7;cursor:pointer}\n#axiovo-robot .robot-voice-settings label{display:flex;align-items:center;gap:5px;cursor:pointer}\n@media(max-width:600px){#axiovo-robot .robot-help-label{font-size:12px;padding:7px 9px}#axiovo-robot .robot-panel{width:calc(100vw - 20px);max-height:calc(100dvh - 90px)}#axiovo-robot .robot-launcher{gap:5px}}\n@media(max-width:760px){#axiovo-robot{position:fixed!important;right:12px!important;left:auto!important;top:auto!important;bottom:max(16px,env(safe-area-inset-bottom,0px))!important;display:block!important;visibility:visible!important;opacity:1!important;z-index:2147483646!important}#axiovo-robot .robot-launcher{display:flex!important;visibility:visible!important;opacity:1!important}#axiovo-robot .robot-panel{position:fixed!important;left:10px!important;right:10px!important;top:auto!important;bottom:max(85px,calc(env(safe-area-inset-bottom,0px) + 78px))!important;width:auto!important;height:min(490px,calc(100dvh - 120px))!important;z-index:2147483647!important}#axiovo-robot .robot-panel[hidden]{display:none!important}}\n@media(prefers-reduced-motion:reduce){#axiovo-robot *{scroll-behavior:auto!important}}\n";
style.textContent+="\n#axiovo-robot .robot-launcher{display:flex!important;align-items:center!important;gap:8px!important;overflow:visible!important;max-width:calc(100vw - 12px)!important}\n#axiovo-robot .robot-help-label{display:inline-flex!important;visibility:visible!important;opacity:1!important;position:relative!important;align-items:center!important;justify-content:center!important;flex:none!important;min-height:38px!important;white-space:nowrap!important;z-index:2147483646!important;background:#123e5d!important;color:#fff!important;font-weight:800!important}\n#axiovo-robot .robot-speak-reply{display:block!important;margin-top:7px!important;padding:7px 10px!important;border-radius:8px!important;background:#fff!important;border:1px solid #8db4c9!important;color:#114a70!important;cursor:pointer!important;font-weight:650!important}\n#axiovo-robot .robot-voice-status{width:100%;font-size:11px;line-height:1.4;color:#385975}\n@media(max-width:760px){#axiovo-robot .robot-help-label{font-size:13px!important;padding:8px 12px!important;max-width:none!important}#axiovo-robot .robot-launcher{display:flex!important;flex-direction:row!important}#axiovo-robot .robot-fab{display:grid!important;visibility:visible!important;opacity:1!important;flex:none!important}}\n";
const make=(tag,cl,txt)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=txt;return n};
function setup(){
if(document.getElementById("axiovo-robot"))return;
const root=make("aside");root.id="axiovo-robot";root.setAttribute("aria-label","Movable Axiovo help robot");
const panel=make("section","robot-panel");panel.hidden=true;panel.setAttribute("aria-label","Robot help conversation");
const head=make("div","robot-head"),heading=make("div"),close=make("button","robot-close","×");
heading.append(make("strong",null,"Axiovo Robot Help"),make("small",null,"Page-aware guide · optional voice"));close.type="button";close.setAttribute("aria-label","Close robot help");head.append(heading,close);
const log=make("div","robot-log");log.setAttribute("role","log");log.setAttribute("aria-live","polite");
const voiceSettings=make("div","robot-voice-settings");
const voiceLabel=make("label",null,"Spoken replies"),voiceEnabled=make("input");
voiceEnabled.type="checkbox";voiceEnabled.checked=true;voiceEnabled.setAttribute("aria-label","Enable spoken help replies");
voiceLabel.prepend(voiceEnabled);
const voiceSelect=make("select");voiceSelect.setAttribute("aria-label","Choose speaking voice");
const testVoice=make("button",null,"Test");testVoice.type="button";
const stopVoice=make("button",null,"Stop");stopVoice.type="button";
const voiceStatus=make("div","robot-voice-status","Tap Speak reply once to enable audio on this device.");
voiceSettings.append(voiceLabel,voiceSelect,testVoice,stopVoice,voiceStatus);
const suggestions=make("div","robot-actions"),form=make("form","robot-form"),input=make("input"),mic=make("button",null,"🎙"),send=make("button",null,"➤");
input.type="text";input.maxLength=600;input.placeholder="Ask about Axiovo";input.setAttribute("aria-label","Ask Axiovo");
mic.type="button";mic.setAttribute("aria-label","Voice question");send.type="submit";send.setAttribute("aria-label","Submit question");
form.append(input,mic,send);
panel.append(head,voiceSettings,log,suggestions,form,make("div","robot-note","Voice uses voices installed in your browser or device. Speech input may use your browser provider; Axiovo stores no audio."));
const fab=make("button","robot-fab");fab.type="button";fab.title="Need help? Click to ask or drag the robot";fab.setAttribute("aria-label","Need help? Open the movable Axiovo voice assistant");
fab.innerHTML='<svg width="37" height="37" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 4v7" stroke="#8ae4ff" stroke-width="3"/><circle cx="24" cy="4" r="3" fill="#8ae4ff"/><rect x="6" y="12" width="36" height="29" rx="10" fill="#f5fbff"/><rect x="10" y="18" width="28" height="17" rx="7" fill="#164567"/><circle cx="18" cy="27" r="3" fill="#66deff"/><circle cx="30" cy="27" r="3" fill="#66deff"/><path d="M20 36h8" stroke="#164567" stroke-width="2.5" stroke-linecap="round"/></svg>';
const launcher=make("div","robot-launcher"),helpLabel=make("span","robot-help-label","Need help?");
launcher.append(helpLabel,fab);root.append(panel,launcher);document.body.append(root);
let speechVoices=[];let speechUnlocked=false;let lastAssistantReply="";let speechTimer=null;
function voiceScore(v){
 const n=(v.name+" "+v.lang).toLowerCase();
 return (/en-in/.test(n)?40:0)+(/female|woman|zira|heera|samantha|aria|jenny|neerja|swara|susan|victoria|karen|moira/.test(n)?105:0)+(/natural|neural|enhanced|premium/.test(n)?20:0)+(/^en/.test(v.lang.toLowerCase())?15:0);
}
function refreshVoices(){
 if(!("speechSynthesis" in window)){voiceSelect.replaceChildren();voiceSelect.add(new Option("Text only: voice not supported",""));voiceSelect.disabled=true;voiceEnabled.checked=false;voiceEnabled.disabled=true;return}
 speechVoices=window.speechSynthesis.getVoices().filter(v=>v.lang?.toLowerCase().startsWith("en")).sort((a,b)=>voiceScore(b)-voiceScore(a));
 const previous=voiceSelect.value;voiceSelect.replaceChildren();
 speechVoices.forEach((v,i)=>voiceSelect.add(new Option(v.name+" ("+v.lang+")",String(i))));
 if(!speechVoices.length){voiceSelect.add(new Option("Use device default voice",""))}
 let saved="";try{saved=localStorage.getItem("axiovo-robot-voice-v1")||""}catch{}
 const found=speechVoices.findIndex(v=>v.voiceURI===saved);
 voiceSelect.value=found>=0?String(found):(previous && [...voiceSelect.options].some(o=>o.value===previous)?previous:voiceSelect.options[0]?.value||"");
}
function speak(text,gesture=false){
 if(!("speechSynthesis" in window)||!window.SpeechSynthesisUtterance){
  voiceStatus.textContent="Speech output is not supported in this browser. Please use a browser with text-to-speech support.";return;
 }
 if(!voiceEnabled.checked){voiceStatus.textContent="Turn on Spoken replies above to hear the answer.";return}
 if(gesture)speechUnlocked=true;
 if(!speechUnlocked){voiceStatus.textContent="Tap Speak reply to enable audio on this device.";return}
 try{
  if(speechTimer){clearTimeout(speechTimer);speechTimer=null}
  const synth=window.speechSynthesis;
  synth.cancel();
  const spoken=String(text||"").replace(/https?:\/\/\S+/g," link ").replace(/\s+/g," ").trim().slice(0,950);
  if(!spoken)return;
  const utterance=new SpeechSynthesisUtterance(spoken);
  utterance.lang="en-IN";utterance.rate=.93;utterance.pitch=1.02;utterance.volume=1;
  const selected=speechVoices[Number(voiceSelect.value)];
  if(selected){utterance.voice=selected;utterance.lang=selected.lang}
  utterance.onstart=()=>{voiceStatus.textContent="Speaking now · "+(selected?.name||"device voice")};
  utterance.onend=()=>{voiceStatus.textContent="Finished speaking. Tap Speak reply to listen again."};
  utterance.onerror=e=>{voiceStatus.textContent="Speech failed ("+(e.error||"device error")+"). Try another voice or tap Test.";};
  synth.speak(utterance);
  if(synth.paused)synth.resume();
  speechTimer=setTimeout(()=>{if(synth.pending&&!synth.speaking){voiceStatus.textContent="Voice is waiting for browser permission. Tap Speak reply again."}},1100);
 }catch(e){voiceStatus.textContent="Unable to play speech. Please choose another device voice.";console.warn("Axiovo speech error",e)}
}
refreshVoices();
if("speechSynthesis" in window){speechSynthesis.addEventListener?.("voiceschanged",refreshVoices)}
voiceSelect.addEventListener("change",()=>{const v=speechVoices[Number(voiceSelect.value)];try{if(v)localStorage.setItem("axiovo-robot-voice-v1",v.voiceURI)}catch{}});
testVoice.addEventListener("click",()=>speak("Hello! I am your Axiovo help assistant. How can I help you today?",true));
stopVoice.addEventListener("click",()=>{if("speechSynthesis" in window)speechSynthesis.cancel()});
voiceEnabled.addEventListener("change",()=>{if(!voiceEnabled.checked&&"speechSynthesis" in window)speechSynthesis.cancel()});
function message(s,user=false,links=[]){const n=make("div","robot-msg"+(user?" user":""),s);if(links.length){const wrap=make("div","robot-links");links.forEach(([label,url])=>{const a=make("a",null,label);a.href=new URL(url,base).href;wrap.append(a)});n.append(wrap)}if(!user){lastAssistantReply=s;const play=make("button","robot-speak-reply","🔊 Speak reply");play.type="button";play.setAttribute("aria-label","Speak this answer aloud");play.addEventListener("click",()=>speak(s,true));n.append(play)}log.append(n);log.scrollTop=log.scrollHeight;if(!user&&speechUnlocked)speak(s)}
function clean(s){return String(s||"").replace(/\s+/g," ").trim().slice(0,170)}
function visible(n){return n.getClientRects().length>0&&!n.closest("#axiovo-robot,[aria-hidden=true]")}
function snapshot(){
const headings=[...document.querySelectorAll("main h1,main h2,main h3,[role=main] h1,[role=main] h2")].filter(visible).map(n=>clean(n.textContent)).filter(Boolean).slice(0,35);
const controls=[...document.querySelectorAll("main button,main a,main input,main select,[role=main] button")].filter(visible).map(n=>clean(n.getAttribute("aria-label")||n.textContent||n.placeholder||n.title)).filter(Boolean).slice(0,100);
return {name:document.title.split("|")[0].trim(),desc:clean(document.querySelector('meta[name="description"]')?.content),headings,controls};
}
const aliases=[["ProofLab",/\bproof\s*lab\b/],["Research Assistant",/\b(copilot|research assistant)\b/],["Research Desk",/\b(research desk|desk)\b/],["Library",/\b(library|workspace)\b/],["Settings",/\bsettings\b/],["My Feed",/\b(my feed|feed)\b/],["Research Tools",/\b(research tools|pdf reader)\b/],["Home",/\b(home|homepage)\b/],["ChemRxiv",/\bchemrxiv\b/],["bioRxiv",/\bbiorxiv\b/],["Cryptology ePrint",/\b(cryptology|crypto|eprint|iacr)\b/],["arXiv",/\barxiv\b/]];
function ask(raw){
const question=clean(raw);if(!question)return;message(question,true);
const q=question.toLowerCase(),state=snapshot();
if(/\b(open|go to|navigate|take me|visit|switch to)\b/.test(q)){const target=aliases.find(([k,re])=>re.test(q));if(target){message("Opening "+target[0]+".");location.assign(new URL(pages[target[0]],base).href);return}}
if(/\b(sort|order)\b/.test(q)&&/\b(newest|oldest|recent|relevance|title)\b/.test(q)){
const key=/oldest/.test(q)?"oldest":/relevance/.test(q)?"relevance":/title/.test(q)?"title":"newest";
const selects=[...document.querySelectorAll("main select")].filter(visible);
for(const select of selects){const option=[...select.options].find(o=>new RegExp(key==="newest"?"newest|recent":key,"i").test(o.textContent+" "+o.value));if(option){select.value=option.value;select.dispatchEvent(new Event("change",{bubbles:true}));message("Applied "+clean(option.textContent)+" sorting on this page.");return}}
}
if(/^(search|find|look for)\b/.test(q)){
const term=question.replace(/^(search for|find|look for|search)\s*/i,"").replace(/[?.!]+$/,"").trim();
const field=[...document.querySelectorAll('main input[type=search],main input[placeholder*="search" i]')].find(visible);
if(field&&term.length>2){field.value=term;field.dispatchEvent(new Event("input",{bubbles:true}));field.dispatchEvent(new Event("change",{bubbles:true}));field.focus();message("Entered your query in the search field. Review the results or submit the search if needed.");return}
message("Use Research Desk to search across archives.",false,[["Open Research Desk","desk.html"]]);return;
}
if(/(what|about|explain|purpose|understand|how).*(this page|here|current page)|(this page|here).*(do|work|for)/.test(q)){
message("This is "+state.name+". "+(state.desc||"Part of Axiovo.")+(state.headings.length?"\n\nCurrent sections: "+state.headings.slice(0,9).join("; ")+".":"")+"\n\nI read the live page, including new headings after updates.");return}
if(/^(hi|hello|hey)[!. ]*$/.test(q)){message("Hello! Ask what this page does, or tell me to open Research Desk, ProofLab, or another section.");return}
const ignored=new Set("what where which when why how does can please tell show about this that there here with from page axiovo help the and are for you your use using open my want need".split(" "));
const tokens=s=>[...new Set((s.toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(x=>!ignored.has(x)))];
const terms=tokens(question),candidates=[...state.headings.map(x=>({text:x,type:"section"})),...state.controls.map(x=>({text:x,type:"control"})),...Object.keys(pages).map(x=>({text:x,type:"page"}))];
for(const c of candidates)c.score=terms.filter(t=>tokens(c.text).some(w=>w===t||w.startsWith(t)||t.startsWith(w))).length;
const hits=candidates.filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
if(hits.length){message("Related items I found: "+hits.map(x=>x.text+" ("+x.type+")").join("; ")+".\n\nThese are verified page labels, not an AI-generated explanation.",false,hits.filter(x=>x.type==="page").map(x=>[x.text,pages[x.text]]));return}
message("I can't verify that answer from this page. Try a specific visible feature, or open Research Assistant for deeper questions.",false,[["Research Assistant","copilot.html"]]);
}
message("Hello! I'm Axiovo Robot Help. I can inspect current page headings, guide navigation, and use supported search and sort controls. Deeper AI questions require a configured AI model.");
for(const name of ["What does this page do?","Open Research Desk","Open ProofLab"]){const b=make("button",null,name);b.type="button";b.addEventListener("click",()=>ask(name));suggestions.append(b)}
let drag=null,wasDragged=false,lastPos=null;
function move(x,y){const w=launcher.offsetWidth,h=launcher.offsetHeight;x=Math.max(5,Math.min(innerWidth-w-5,x));y=Math.max(5,Math.min(innerHeight-h-5,y));lastPos={x,y};root.style.right="auto";root.style.bottom="auto";root.style.left=x+"px";root.style.top=y+"px";panel.style.right="auto";panel.style.bottom="auto";panel.style.left=Math.max(8,Math.min(innerWidth-panel.offsetWidth-8,x<innerWidth/2?x:x+w-panel.offsetWidth))+"px";panel.style.top=Math.max(8,Math.min(innerHeight-panel.offsetHeight-8,y-panel.offsetHeight-12))+"px"}
if(innerWidth>760){try{const pos=JSON.parse(localStorage.getItem("axiovo-robot-position-v1"));if(Number.isFinite(pos.x)&&Number.isFinite(pos.y))move(pos.x*innerWidth,pos.y*innerHeight)}catch{}}
fab.addEventListener("pointerdown",e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:root.getBoundingClientRect().left,top:root.getBoundingClientRect().top};wasDragged=false;fab.setPointerCapture(e.pointerId)});
fab.addEventListener("pointermove",e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)wasDragged=true;if(wasDragged)move(drag.left+dx,drag.top+dy)});
fab.addEventListener("pointerup",e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;if(wasDragged){try{localStorage.setItem("axiovo-robot-position-v1",JSON.stringify({x:lastPos.x/innerWidth,y:lastPos.y/innerHeight}))}catch{}return}panel.hidden=!panel.hidden;if(!panel.hidden){if(lastPos&&innerWidth>760)move(lastPos.x,lastPos.y);input.focus()}});
fab.addEventListener("click",e=>{if(e.detail===0){panel.hidden=!panel.hidden;if(!panel.hidden)input.focus()}});
close.addEventListener("click",()=>{panel.hidden=true;if("speechSynthesis" in window)speechSynthesis.cancel();fab.focus()});
form.addEventListener("submit",e=>{e.preventDefault();const q=input.value;input.value="";ask(q)});
mic.addEventListener("click",()=>{const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){message("Voice recognition isn't supported in this browser. Please type.");return}if(!confirm("Your browser's speech provider may process audio remotely. Axiovo does not store recordings. Continue?"))return;const rec=new Speech();rec.lang=document.documentElement.lang||navigator.language||"en-US";mic.disabled=true;mic.textContent="●";rec.onresult=e=>ask(e.results?.[0]?.[0]?.transcript||"");rec.onerror=e=>message("Microphone unavailable: "+(e.error||"unknown"));rec.onend=()=>{mic.disabled=false;mic.textContent="🎙"};try{rec.start()}catch{rec.onend();message("Could not start voice input.")}});
window.addEventListener("resize",()=>{if(innerWidth>760&&lastPos)move(lastPos.x,lastPos.y)});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})();