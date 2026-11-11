(()=>{
"use strict";
if(window.__axiovoRobotHelp)return;window.__axiovoRobotHelp=true;
const base=new URL("./",document.currentScript?.src||location.href);
const pages={"Home":"index.html","arXiv":"arxiv.html","bioRxiv":"biorxiv.html","ChemRxiv":"chemrxiv.html","Cryptology ePrint":"crypto.html","Research Desk":"desk.html","My Feed":"feed.html","Library":"workspace.html","Research Assistant":"copilot.html","ProofLab":"prooflab.html","Research Tools":"lab.html","Settings":"profiles.html","Methodology":"methodology.html","Research Hub":"research-hub.html"};
const style=document.createElement("style");style.textContent="#axiovo-robot{position:fixed;right:16px;bottom:16px;z-index:2147480000;font:14px/1.4 system-ui,sans-serif;color:#17324a}#axiovo-robot *{box-sizing:border-box}#axiovo-robot button,#axiovo-robot input{font:inherit}#axiovo-robot .robot-fab{touch-action:none;display:grid;place-items:center;width:56px;height:56px;border:2px solid #b2dced;border-radius:18px;background:#123e5d;color:white;box-shadow:0 9px 30px #081e3866;cursor:grab}#axiovo-robot .robot-panel{position:fixed;right:16px;bottom:83px;width:min(375px,calc(100vw - 24px));height:min(510px,calc(100dvh - 105px));display:flex;flex-direction:column;border:1px solid #a2c8de;border-radius:18px;background:#f8fbfe;color:#17324a;box-shadow:0 18px 50px #071c3666;overflow:hidden}#axiovo-robot .robot-panel[hidden]{display:none}#axiovo-robot .robot-head{display:flex;justify-content:space-between;align-items:center;background:#123e5d;color:white;padding:12px}#axiovo-robot .robot-head small{display:block;font-size:11px;color:#c4e6f5}#axiovo-robot .robot-close{background:transparent;color:white;border:0;font-size:24px;cursor:pointer}#axiovo-robot .robot-log{overflow:auto;flex:1;display:flex;flex-direction:column;gap:9px;padding:12px}#axiovo-robot .robot-msg{align-self:flex-start;max-width:94%;background:#e5f0f8;border-radius:12px;padding:10px;white-space:pre-wrap;overflow-wrap:anywhere}#axiovo-robot .robot-msg.user{align-self:flex-end;background:#d3eafb}#axiovo-robot .robot-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}#axiovo-robot .robot-links a{background:white;color:#075780;border:1px solid #9dc2d4;border-radius:8px;padding:5px 8px;text-decoration:none}#axiovo-robot .robot-actions{display:flex;flex-wrap:wrap;gap:6px;padding:0 10px 9px}#axiovo-robot .robot-actions button{border:1px solid #a0c5d6;color:#17425c;background:white;border-radius:7px;padding:6px;cursor:pointer;font-size:12px}#axiovo-robot .robot-form{display:flex;gap:5px;padding:9px;border-top:1px solid #cedfea}#axiovo-robot .robot-form input{flex:1;min-width:0;border:1px solid #a5c1d1;border-radius:8px;padding:9px;background:white;color:#18394e}#axiovo-robot .robot-form button{min-width:37px;border:1px solid #9bc3d5;border-radius:8px;background:#e8f3f9;color:#17415a;cursor:pointer}#axiovo-robot .robot-note{font-size:10px;color:#5b7185;padding:0 10px 9px}#axiovo-robot button:focus-visible,#axiovo-robot input:focus-visible{outline:3px solid #2ba9d6;outline-offset:2px}";document.head.append(style);
style.textContent+="\n#axiovo-robot .robot-launcher{display:flex;align-items:center;gap:8px;max-width:calc(100vw - 18px)}\n#axiovo-robot .robot-help-label{pointer-events:none;color:#fff;background:#123e5d;border:1px solid #88b8d2;box-shadow:0 6px 20px #081e3833;border-radius:15px;padding:9px 13px;font-size:14px;font-weight:750;white-space:nowrap}\n#axiovo-robot .robot-voice-settings{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:8px 11px;border-bottom:1px solid #cfdeea;font-size:12px}\n#axiovo-robot .robot-voice-settings select{flex:1;min-width:100px;max-width:230px;height:32px;padding:3px;border:1px solid #abc6d7;border-radius:7px;background:white;color:#17324a}\n#axiovo-robot .robot-voice-settings button{padding:4px 8px;border-radius:7px;background:#e8f3f9;color:#17425a;border:1px solid #abc6d7;cursor:pointer}\n#axiovo-robot .robot-voice-settings label{display:flex;align-items:center;gap:5px;cursor:pointer}\n@media(max-width:600px){#axiovo-robot .robot-help-label{font-size:12px;padding:7px 9px}#axiovo-robot .robot-panel{width:calc(100vw - 20px);max-height:calc(100dvh - 90px)}#axiovo-robot .robot-launcher{gap:5px}}\n@media(max-width:760px){#axiovo-robot{position:fixed!important;right:12px!important;left:auto!important;top:auto!important;bottom:max(16px,env(safe-area-inset-bottom,0px))!important;display:block!important;visibility:visible!important;opacity:1!important;z-index:2147483646!important}#axiovo-robot .robot-launcher{display:flex!important;visibility:visible!important;opacity:1!important}#axiovo-robot .robot-panel{position:fixed!important;left:10px!important;right:10px!important;top:auto!important;bottom:max(85px,calc(env(safe-area-inset-bottom,0px) + 78px))!important;width:auto!important;height:min(490px,calc(100dvh - 120px))!important;z-index:2147483647!important}#axiovo-robot .robot-panel[hidden]{display:none!important}}\n@media(prefers-reduced-motion:reduce){#axiovo-robot *{scroll-behavior:auto!important}}\n";
style.textContent+="\n#axiovo-robot .robot-launcher{display:flex!important;align-items:center!important;gap:8px!important;overflow:visible!important;max-width:calc(100vw - 12px)!important}\n#axiovo-robot .robot-help-label{display:inline-flex!important;visibility:visible!important;opacity:1!important;position:relative!important;align-items:center!important;justify-content:center!important;flex:none!important;min-height:38px!important;white-space:nowrap!important;z-index:2147483646!important;background:#123e5d!important;color:#fff!important;font-weight:800!important}\n#axiovo-robot .robot-speak-reply{display:block!important;margin-top:7px!important;padding:7px 10px!important;border-radius:8px!important;background:#fff!important;border:1px solid #8db4c9!important;color:#114a70!important;cursor:pointer!important;font-weight:650!important}\n#axiovo-robot .robot-voice-status{width:100%;font-size:11px;line-height:1.4;color:#385975}\n@media(max-width:760px){#axiovo-robot .robot-help-label{font-size:13px!important;padding:8px 12px!important;max-width:none!important}#axiovo-robot .robot-launcher{display:flex!important;flex-direction:row!important}#axiovo-robot .robot-fab{display:grid!important;visibility:visible!important;opacity:1!important;flex:none!important}}\n";
style.textContent+="\n/* Fixed viewport launcher: independent of page layout, including mobile keyboard and open chat. */\n#axiovo-robot{--robot-panel:#f8fbfe;--robot-ink:#17324a;--robot-head:#123e5d;--robot-bubble:#e5f0f8;--robot-user:#d3eafb;--robot-border:#a2c8de;--robot-control:#ffffff;--robot-control-ink:#17425c;--robot-muted:#47647a;position:fixed!important;left:auto!important;right:16px!important;top:auto!important;bottom:calc(16px + env(safe-area-inset-bottom,0px))!important;z-index:2147483000!important;overflow:visible!important;display:block!important;visibility:visible!important;opacity:1!important}\n#axiovo-robot .robot-launcher{position:relative!important;display:flex!important;flex-flow:row nowrap!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;width:max-content!important;max-width:calc(100vw - 16px)!important;min-height:56px!important;visibility:visible!important;opacity:1!important;transform:none!important}\n#axiovo-robot .robot-help-label{display:inline-flex!important;align-items:center!important;visibility:visible!important;opacity:1!important;max-width:none!important;background:var(--robot-head)!important;color:#fff!important;box-shadow:0 5px 16px #081e3833!important;border:1px solid #88b8d2!important;border-radius:13px!important;padding:9px 12px!important;font-size:14px!important;font-weight:800!important;white-space:nowrap!important}\n#axiovo-robot .robot-fab{position:relative!important;flex:none!important;visibility:visible!important;opacity:1!important;background:var(--robot-head)!important;color:#fff!important;z-index:2!important}\n#axiovo-robot .robot-panel{position:fixed!important;left:auto!important;right:16px!important;top:auto!important;bottom:calc(84px + env(safe-area-inset-bottom,0px))!important;width:min(375px,calc(100vw - 20px))!important;max-width:calc(100vw - 20px)!important;height:min(510px,calc(100dvh - 125px))!important;max-height:calc(100dvh - 125px)!important;background:var(--robot-panel)!important;color:var(--robot-ink)!important;border-color:var(--robot-border)!important;z-index:2147483001!important}\n#axiovo-robot .robot-panel[hidden]{display:none!important}\n#axiovo-robot .robot-head{background:var(--robot-head)!important;color:#fff!important}\n#axiovo-robot .robot-msg{background:var(--robot-bubble)!important;color:var(--robot-ink)!important}\n#axiovo-robot .robot-msg.user{background:var(--robot-user)!important}\n#axiovo-robot .robot-voice-settings,#axiovo-robot .robot-note,#axiovo-robot .robot-voice-status{color:var(--robot-muted)!important}\n#axiovo-robot .robot-actions button,#axiovo-robot .robot-speak-reply,#axiovo-robot .robot-form button,#axiovo-robot .robot-voice-settings button,#axiovo-robot .robot-voice-settings select{background:var(--robot-control)!important;color:var(--robot-control-ink)!important;border-color:var(--robot-border)!important}\n#axiovo-robot .robot-form input{background:var(--robot-control)!important;color:var(--robot-ink)!important;border-color:var(--robot-border)!important}\nhtml[data-theme=\"dark\"] #axiovo-robot{--robot-panel:#122638;--robot-ink:#eaf5fd;--robot-head:#061b2d;--robot-bubble:#223c51;--robot-user:#174c68;--robot-border:#4a6d83;--robot-control:#1c364b;--robot-control-ink:#e9f5fd;--robot-muted:#c1d8e6}\n@media(max-width:760px){#axiovo-robot{left:auto!important;right:10px!important;top:auto!important;bottom:calc(12px + env(safe-area-inset-bottom,0px))!important}#axiovo-robot .robot-panel{left:10px!important;right:10px!important;top:auto!important;bottom:calc(83px + env(safe-area-inset-bottom,0px))!important;width:auto!important;height:min(480px,calc(100dvh - 116px))!important;max-height:calc(100dvh - 116px)!important}#axiovo-robot .robot-launcher{min-height:54px!important}#axiovo-robot .robot-help-label{font-size:13px!important}}\n";
style.textContent+="\n/* Guided tour places the launcher beside the highlighted feature, never over it. */\n#axiovo-robot.axiovo-guiding{transition:left .35s ease,top .35s ease}\n#axiovo-robot.axiovo-guiding .robot-launcher{pointer-events:auto!important}\n.axiovo-robot-target{outline:3px solid #22b5dd!important;outline-offset:5px!important;box-shadow:0 0 0 8px rgba(34,181,221,.15)!important;scroll-margin-top:112px!important;position:relative;z-index:1}\n@media(prefers-reduced-motion:reduce){#axiovo-robot.axiovo-guiding{transition:none!important}}\n";
style.textContent+="\n#axiovo-robot .robot-paper-card{padding:9px 0;border-bottom:1px solid var(--robot-border);display:grid;gap:4px}\n#axiovo-robot .robot-paper-title{display:block;color:var(--robot-control-ink);font-weight:750;text-decoration:underline;overflow-wrap:anywhere}\n#axiovo-robot .robot-paper-meta{color:var(--robot-muted);font-size:11px}\n#axiovo-robot .robot-paper-snippet{margin:4px 0;font-size:12px;line-height:1.5}\n#axiovo-robot .robot-paper-save{justify-self:start;border:1px solid var(--robot-border);background:var(--robot-control);color:var(--robot-control-ink);border-radius:7px;padding:6px 9px;cursor:pointer}\n";
style.textContent+="\n/* User-approved animated mascot: the original help operations remain intact. */\n#axiovo-robot .robot-fab{\n width:82px!important;height:82px!important;min-width:68px!important;\n position:relative;display:grid!important;place-items:center!important;\n border:2px solid #42a9c5!important;border-radius:24px!important;\n background:#fff!important;box-shadow:0 9px 24px #052a4966!important;\n overflow:visible!important;isolation:isolate;\n}\n#axiovo-robot .robot-mascot{\n width:100%!important;height:100%!important;display:block!important;\n object-fit:contain!important;object-position:center!important;\n border-radius:20px;pointer-events:none;user-select:none;\n animation:axiovo-mascot-float 3.1s ease-in-out infinite;\n}\n#axiovo-robot .robot-fab:hover .robot-mascot,\n#axiovo-robot .robot-fab:focus-visible .robot-mascot{\n animation:axiovo-mascot-wave .65s ease-in-out 2;\n}\n#axiovo-robot.robot-speaking .robot-mascot{\n animation:axiovo-mascot-talk .55s ease-in-out infinite;\n}\n#axiovo-robot.robot-listening .robot-fab{\n box-shadow:0 0 0 5px #25b3d244,0 9px 24px #052a4966!important;\n border-color:#18c4d8!important;\n}\n#axiovo-robot .robot-speaking-bars{\n pointer-events:none;display:none;position:absolute;bottom:-5px;right:-5px;\n align-items:flex-end;gap:2px;padding:4px 5px;\n background:#073752;border:2px solid #fff;border-radius:9px;height:22px;\n}\n#axiovo-robot.robot-speaking .robot-speaking-bars,\n#axiovo-robot.robot-listening .robot-speaking-bars{display:flex}\n#axiovo-robot .robot-speaking-bars i{\n display:block;width:3px;background:#78f3fb;border-radius:2px;\n animation:axiovo-mascot-audio .65s ease-in-out infinite alternate;\n}\n#axiovo-robot .robot-speaking-bars i:nth-child(2){animation-delay:.16s}\n#axiovo-robot .robot-speaking-bars i:nth-child(3){animation-delay:.32s}\n#axiovo-robot .robot-language-select{\n flex:1 1 100%!important;width:100%!important;max-width:none!important;\n min-height:38px!important;border:1px solid var(--robot-border)!important;\n background:var(--robot-control)!important;color:var(--robot-control-ink)!important;\n}\n#axiovo-robot .robot-voice-settings select:not(.robot-language-select){\n flex:1 1 145px!important;max-width:100%!important;\n}\n#axiovo-robot .robot-help-label{font-size:13px!important}\n@keyframes axiovo-mascot-float{\n 0%,100%{transform:translateY(0) rotate(-2deg)}\n 50%{transform:translateY(-4px) rotate(2deg)}\n}\n@keyframes axiovo-mascot-wave{\n 0%,100%{transform:rotate(-4deg) translateY(0)}\n 50%{transform:rotate(9deg) translateY(-5px)}\n}\n@keyframes axiovo-mascot-talk{\n 0%,100%{transform:translateY(0) scale(1)}\n 50%{transform:translateY(-2px) scale(1.035)}\n}\n@keyframes axiovo-mascot-audio{\n 0%{height:5px}100%{height:15px}\n}\n@media(max-width:760px){\n #axiovo-robot .robot-fab{width:68px!important;height:68px!important;border-radius:19px!important}\n #axiovo-robot .robot-mascot{border-radius:16px}\n #axiovo-robot .robot-launcher{min-height:68px!important}\n #axiovo-robot .robot-help-label{font-size:12px!important}\n}\n@media(prefers-reduced-motion:reduce){\n #axiovo-robot .robot-mascot,#axiovo-robot .robot-speaking-bars i{animation:none!important}\n}\n";

// Enhanced animated robot presentation, preserving the existing multilingual,
// navigation, paper search, voice, and privacy logic.
style.textContent += `
#axiovo-robot .robot-fab{background:linear-gradient(145deg,#ffffff,#eafaff)!important;border-color:#66d8ef!important;box-shadow:0 8px 24px #062f5050,0 0 0 3px #8deaff22!important}
#axiovo-robot .robot-aura{position:absolute;inset:-7px;border-radius:30px;border:2px solid #20c4df55;pointer-events:none;animation:axiovo-aura-breathe 3.2s ease-in-out infinite}
#axiovo-robot .robot-mascot{position:relative;z-index:1;filter:drop-shadow(0 3px 5px #073e5626);transform-origin:50% 75%}
#axiovo-robot.robot-speaking .robot-aura{border-color:#00b7de;animation:axiovo-aura-talk .8s ease-in-out infinite}
#axiovo-robot.robot-listening .robot-aura{border-color:#16d4a9;animation:axiovo-aura-talk 1s ease-in-out infinite}
#axiovo-robot .robot-fab:active .robot-mascot{transform:scale(.95)}
#axiovo-robot .robot-help-label{background:linear-gradient(120deg,#0a405d,#096b85)!important;border-color:#57d8e6!important}
#axiovo-robot .robot-head{background:linear-gradient(110deg,#092d48,#075f77)!important}
#axiovo-robot .robot-fab:focus-visible{outline:3px solid #10d9e8!important;outline-offset:5px!important}
@keyframes axiovo-aura-breathe{0%,100%{opacity:.35;transform:scale(.97)}50%{opacity:.85;transform:scale(1.06)}}
@keyframes axiovo-aura-talk{0%,100%{opacity:.35;transform:scale(.98)}50%{opacity:1;transform:scale(1.12)}}
@media(prefers-reduced-motion:reduce){#axiovo-robot .robot-aura{animation:none!important}}
`;
style.textContent += `
#axiovo-robot .robot-fab[data-mascot-fallback]::after{content:attr(data-mascot-fallback);font-size:38px;position:absolute;inset:0;display:grid;place-items:center}
@media(max-width:760px){
 #axiovo-robot:not(.axiovo-guiding){bottom:calc(104px + env(safe-area-inset-bottom,0px))!important}
 #axiovo-robot .robot-panel{bottom:calc(185px + env(safe-area-inset-bottom,0px))!important;height:min(460px,calc(100dvh - 210px))!important}
 #axiovo-robot .robot-help-label{max-width:112px!important;white-space:normal!important;text-align:center!important;line-height:1.2!important}
}
`;
style.textContent += `
#axiovo-robot .robot-mascot{display:grid!important;place-items:center!important;width:100%!important;height:100%!important;overflow:visible!important}
#axiovo-robot .robot-mascot svg{display:block;width:100%;height:100%;pointer-events:none}
#axiovo-robot .robot-fab{overflow:visible!important}
@media(max-width:760px){
 #axiovo-robot:not(.axiovo-guiding){bottom:calc(110px + env(safe-area-inset-bottom,0px))!important}
 #axiovo-robot .robot-panel{bottom:calc(200px + env(safe-area-inset-bottom,0px))!important}
}
`;
const make=(tag,cl,txt)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=txt;return n};
function setup(){
if(document.getElementById("axiovo-robot"))return;
const root=make("aside");root.id="axiovo-robot";root.setAttribute("aria-label","Movable Axiovo help robot");
const panel=make("section","robot-panel");panel.hidden=true;panel.setAttribute("aria-label","Robot help conversation");
const head=make("div","robot-head"),heading=make("div"),close=make("button","robot-close","×");
heading.append(make("strong",null,"Axiovo Robot Help · Need help?"),make("small",null,"Page-aware guide · optional voice"));close.type="button";close.setAttribute("aria-label","Close robot help");head.append(heading,close);
const log=make("div","robot-log");log.setAttribute("role","log");log.setAttribute("aria-live","polite");
const voiceSettings=make("div","robot-voice-settings");
const languageSelect=make("select","robot-language-select");
languageSelect.id="axiovo-robot-language";
languageSelect.setAttribute("aria-label","English speech and replies");
const languageOptions=[["en-IN","English (India)"]];
for(const [value,label] of languageOptions)languageSelect.add(new Option(label,value));
try{const saved=localStorage.getItem("axiovo-robot-language-v1");if(saved==="en-IN")languageSelect.value=saved}catch{}
const voiceLabel=make("label",null,"Spoken replies"),voiceEnabled=make("input");
voiceEnabled.type="checkbox";voiceEnabled.checked=true;voiceEnabled.setAttribute("aria-label","Enable spoken help replies");
voiceLabel.prepend(voiceEnabled);
const voiceSelect=make("select");voiceSelect.setAttribute("aria-label","Choose speaking voice");
const testVoice=make("button",null,"Test");testVoice.type="button";
const stopVoice=make("button",null,"Stop");stopVoice.type="button";
const voiceStatus=make("div","robot-voice-status","Tap Speak reply once to enable audio on this device.");
voiceSettings.append(languageSelect,voiceLabel,voiceSelect,testVoice,stopVoice,voiceStatus);
const suggestions=make("div","robot-actions"),form=make("form","robot-form"),input=make("input"),mic=make("button",null,"🎙"),send=make("button",null,"➤");
input.type="text";input.maxLength=600;input.placeholder="Ask about Axiovo";input.setAttribute("aria-label","Ask Axiovo");
mic.type="button";mic.setAttribute("aria-label","Voice question");send.type="submit";send.setAttribute("aria-label","Submit question");
form.append(input,mic,send);
panel.append(head,voiceSettings,log,suggestions,form,make("div","robot-note","Voice uses voices installed in your browser or device. Speech input may use your browser provider; Axiovo stores no audio."));
const fab=make("button","robot-fab");fab.type="button";fab.title="Need help? Click to ask or drag the robot";fab.setAttribute("aria-label","Need help? Open the movable Axiovo voice assistant");
const mascot=make("span","robot-mascot");mascot.setAttribute("aria-hidden","true");mascot.innerHTML="<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\" role=\"img\" aria-label=\"Smiling Axiovo robot waving with a research tablet\">\n<defs><linearGradient id=\"shell\" x2=\".8\" y2=\"1\"><stop stop-color=\"#fff\"/><stop offset=\"1\" stop-color=\"#b8d5e9\"/></linearGradient><linearGradient id=\"blue\" x2=\"1\" y2=\"1\"><stop stop-color=\"#5ce9ff\"/><stop offset=\"1\" stop-color=\"#0067aa\"/></linearGradient></defs>\n<ellipse cx=\"100\" cy=\"180\" rx=\"75\" ry=\"9\" fill=\"#50cfe8\" opacity=\".22\"/>\n<path d=\"M99 39V23\" stroke=\"#265b94\" stroke-width=\"7\" stroke-linecap=\"round\"/><circle cx=\"99\" cy=\"20\" r=\"12\" fill=\"url(#blue)\"/>\n<path d=\"M68 132Q48 137 39 119\" fill=\"none\" stroke=\"#244e78\" stroke-width=\"13\" stroke-linecap=\"round\"/><path d=\"M40 119L28 102M40 119L20 115M40 119L37 97\" fill=\"none\" stroke=\"#204a78\" stroke-width=\"9\" stroke-linecap=\"round\"/>\n<path d=\"M130 131q19 4 27-11\" fill=\"none\" stroke=\"#244e78\" stroke-width=\"13\" stroke-linecap=\"round\"/>\n<ellipse cx=\"100\" cy=\"145\" rx=\"45\" ry=\"40\" fill=\"url(#shell)\" stroke=\"#66b8dc\" stroke-width=\"3\"/>\n<path d=\"M100 145l-11 21h7l4-9 4 9h7z\" fill=\"#086b9d\"/><path d=\"M84 169q20 7 33-1\" fill=\"none\" stroke=\"#29cce3\" stroke-width=\"3\"/>\n<rect x=\"34\" y=\"44\" width=\"132\" height=\"94\" rx=\"42\" fill=\"url(#shell)\" stroke=\"#238ac0\" stroke-width=\"4\"/>\n<rect x=\"44\" y=\"55\" width=\"112\" height=\"70\" rx=\"31\" fill=\"#101f38\"/>\n<path d=\"M66 89q10-17 21 0M113 89q10-17 21 0\" fill=\"none\" stroke=\"#79edff\" stroke-width=\"7\" stroke-linecap=\"round\"/>\n<path d=\"M87 104q13 17 26 0z\" fill=\"#e8ffff\"/>\n<ellipse cx=\"33\" cy=\"91\" rx=\"11\" ry=\"23\" fill=\"url(#blue)\"/><ellipse cx=\"167\" cy=\"91\" rx=\"11\" ry=\"23\" fill=\"url(#blue)\"/>\n<g transform=\"rotate(13 147 151)\"><rect x=\"125\" y=\"122\" width=\"54\" height=\"58\" rx=\"7\" fill=\"#173a61\" stroke=\"#20c8e9\" stroke-width=\"3\"/><text x=\"152\" y=\"153\" font-size=\"23\" text-anchor=\"middle\" font-weight=\"bold\" font-family=\"Arial,sans-serif\" fill=\"white\">A</text><path d=\"M139 162h27\" stroke=\"#58e5fa\" stroke-width=\"3\"/></g>\n</svg>";
const voiceBars=make("span","robot-speaking-bars");voiceBars.setAttribute("aria-hidden","true");
voiceBars.append(make("i"),make("i"),make("i"));
fab.replaceChildren(mascot,voiceBars);

const launcher=make("div","robot-launcher"),helpLabel=make("span","robot-help-label","Need help?");
const robotAura=make("span","robot-aura");robotAura.setAttribute("aria-hidden","true");fab.prepend(robotAura);
launcher.append(helpLabel,fab);root.append(panel,launcher);document.body.append(root);
let speechVoices=[];let speechUnlocked=false;let lastAssistantReply="";let speechTimer=null;
let detectedLanguage="";
const localeFromText=text=>{
 const value=String(text||"");
 if(/[\u0980-\u09ff]/.test(value))return "bn-IN";
 if(/[\u0900-\u097f]/.test(value))return "hi-IN";
 if(/[\u0b80-\u0bff]/.test(value))return "ta-IN";
 if(/[\u0c00-\u0c7f]/.test(value))return "te-IN";
 if(/[\u0d00-\u0d7f]/.test(value))return "ml-IN";
 if(/[\u0600-\u06ff]/.test(value))return "ar-SA";
 if(/[\u4e00-\u9fff]/.test(value))return "zh-CN";
 if(/[\u3040-\u30ff]/.test(value))return "ja-JP";
 if(/[\uac00-\ud7af]/.test(value))return "ko-KR";
 if(/[\u0400-\u04ff]/.test(value))return "ru-RU";
 return "";
};
const currentLanguage=()=>"en-IN";
const sayLabel={
 en:"Need help?",bn:"সাহায্য লাগবে?",hi:"मदद चाहिए?",ta:"உதவி வேண்டுமா?",
 te:"సహాయం కావాలా?",ml:"സഹായം വേണോ?",ur:"مدد چاہیے؟",
 es:"¿Necesitas ayuda?",fr:"Besoin d’aide ?",de:"Brauchen Sie Hilfe?",
 pt:"Precisa de ajuda?",ar:"هل تحتاج مساعدة؟",zh:"需要帮助吗？",ja:"お困りですか？",
 ko:"도움이 필요하신가요?",ru:"Нужна помощь?"
};
const welcome={
 en:"Hello! I am your Axiovo assistant. How can I help?",
 bn:"নমস্কার! আমি অ্যাক্সিওভোর সহকারী। কীভাবে সাহায্য করতে পারি?",
 hi:"नमस्ते! मैं Axiovo का सहायक हूँ। मैं आपकी कैसे मदद कर सकता हूँ?",
 ta:"வணக்கம்! நான் Axiovo உதவியாளர். உங்களுக்கு எப்படி உதவலாம்?",
 te:"నమస్కారం! నేను Axiovo సహాయకుడిని. మీకు ఎలా సహాయపడగలను?",
 ml:"നമസ്കാരം! ഞാൻ Axiovo സഹായിയാണ്. എന്താണ് സഹായം വേണ്ടത്?",
 es:"¡Hola! Soy el asistente de Axiovo. ¿Cómo puedo ayudarte?",
 fr:"Bonjour ! Je suis l’assistant Axiovo. Comment puis-je vous aider ?",
 de:"Hallo! Ich bin der Axiovo-Assistent. Wie kann ich helfen?",
 pt:"Olá! Sou o assistente Axiovo. Como posso ajudar?",
 ar:"مرحبًا! أنا مساعد Axiovo. كيف يمكنني المساعدة؟",
 zh:"你好！我是 Axiovo 助手。有什么可以帮你？",
 ja:"こんにちは！Axiovoアシスタントです。どのようにお手伝いできますか？",
 ko:"안녕하세요! Axiovo 도우미입니다. 무엇을 도와드릴까요?",
 ru:"Здравствуйте! Я помощник Axiovo. Чем могу помочь?"
};
const baseLanguage=()=>currentLanguage().split("-")[0].toLowerCase();
function updateLanguageLabel(){
 helpLabel.textContent=sayLabel[baseLanguage()]||sayLabel.en;
 input.placeholder=baseLanguage()==="en"?"Ask about Axiovo":(welcome[baseLanguage()]||"Ask about Axiovo");
 root.lang=currentLanguage();
}
function voiceScore(v){
 const n=(v.name+" "+v.lang).toLowerCase(),target=currentLanguage().toLowerCase();
 const matching=v.lang.toLowerCase().split("-")[0]===target.split("-")[0];
 return (matching?250:0)+(v.lang.toLowerCase()===target?80:0)+
  (/female|woman|zira|heera|samantha|aria|jenny|neerja|swara|susan|victoria|karen|moira/.test(n)?35:0)+
  (/natural|neural|enhanced|premium/.test(n)?20:0);
}
function refreshVoices(){
 if(!("speechSynthesis" in window)){
  voiceSelect.replaceChildren(new Option("Text only: device speech unsupported",""));
  voiceSelect.disabled=true;voiceEnabled.checked=false;voiceEnabled.disabled=true;
  return;
 }
 const prev=speechVoices[Number(voiceSelect.value)]?.voiceURI;
 speechVoices=window.speechSynthesis.getVoices().filter(v=>/^en(?:-|$)/i.test(v.lang)).sort((a,b)=>voiceScore(b)-voiceScore(a));
 voiceSelect.replaceChildren();
 speechVoices.forEach((v,i)=>voiceSelect.add(new Option(v.name+" ("+v.lang+")",String(i))));
 if(!speechVoices.length)voiceSelect.add(new Option("Use device default voice",""));
 let saved="";try{saved=localStorage.getItem("axiovo-robot-voice-v1")||""}catch{}
 const preferred=speechVoices.findIndex(v=>v.voiceURI===saved&&v.lang.toLowerCase().split("-")[0]===baseLanguage());
 const previous=speechVoices.findIndex(v=>v.voiceURI===prev&&v.lang.toLowerCase().split("-")[0]===baseLanguage());
 voiceSelect.value=String(preferred>=0?preferred:previous>=0?previous:0);
 const available=speechVoices.some(v=>v.lang.toLowerCase().split("-")[0]===baseLanguage());
 voiceStatus.textContent=available?"Available browser/device voices for "+currentLanguage()+". Tap Test to hear one.":
  "No matching installed voice for "+currentLanguage()+". Text help remains available; install a voice in your device settings.";
}
function speak(text,gesture=false){
 if(!("speechSynthesis" in window)||!window.SpeechSynthesisUtterance){
  voiceStatus.textContent="Speech output unavailable in this browser.";return;
 }
 if(!voiceEnabled.checked){voiceStatus.textContent="Enable Spoken replies to hear the answer.";return}
 if(gesture)speechUnlocked=true;
 if(!speechUnlocked){voiceStatus.textContent="Tap Speak reply or Test to enable audio.";return}
 try{
  if(speechTimer){clearTimeout(speechTimer);speechTimer=null}
  const synth=window.speechSynthesis;
  synth.cancel();root.classList.remove("robot-speaking");
  const spoken=String(text||"").replace(/https?:\/\/\S+/g," link ").replace(/\s+/g," ").trim().slice(0,950);
  if(!spoken)return;
  const utterance=new SpeechSynthesisUtterance(spoken);
  const target=currentLanguage(),selected=speechVoices[Number(voiceSelect.value)];
  const matching=speechVoices.some(v=>v.lang.toLowerCase().split("-")[0]===target.toLowerCase().split("-")[0]);
  utterance.lang=target;utterance.rate=.94;utterance.pitch=1.02;utterance.volume=1;
  if(selected&&selected.lang.toLowerCase().split("-")[0]===target.toLowerCase().split("-")[0]){
   utterance.voice=selected;utterance.lang=selected.lang;
  }else if(!matching){
   voiceStatus.textContent="A spoken voice for "+target+" is not installed on this device. The answer remains readable.";
   return;
  }
  utterance.onstart=()=>{root.classList.add("robot-speaking");voiceStatus.textContent="Speaking · "+(selected?.name||target)};
  const done=()=>root.classList.remove("robot-speaking");
  utterance.onend=()=>{done();voiceStatus.textContent="Finished. Tap Speak reply to listen again."};
  utterance.onerror=e=>{done();voiceStatus.textContent="Speech unavailable ("+(e.error||"device error")+"). Try another voice."};
  synth.speak(utterance);
  if(synth.paused)synth.resume();
  speechTimer=setTimeout(()=>{if(synth.pending&&!synth.speaking){voiceStatus.textContent="Browser speech may require another tap on Speak reply."}},1100);
 }catch(e){
  root.classList.remove("robot-speaking");
  voiceStatus.textContent="Could not play speech with this device voice.";
  console.warn("Axiovo speech error",e);
 }
}
updateLanguageLabel();refreshVoices();
languageSelect.addEventListener("change",()=>{
 detectedLanguage="";
 try{localStorage.setItem("axiovo-robot-language-v1",languageSelect.value)}catch{}
 if("speechSynthesis" in window)speechSynthesis.cancel();
 root.classList.remove("robot-speaking");
 updateLanguageLabel();refreshVoices();
});
if("speechSynthesis" in window)speechSynthesis.addEventListener?.("voiceschanged",refreshVoices);
voiceSelect.addEventListener("change",()=>{
 const v=speechVoices[Number(voiceSelect.value)];
 try{if(v)localStorage.setItem("axiovo-robot-voice-v1",v.voiceURI)}catch{}
});
testVoice.addEventListener("click",()=>speak(welcome[baseLanguage()]||welcome.en,true));
stopVoice.addEventListener("click",()=>{
 if("speechSynthesis" in window)speechSynthesis.cancel();
 root.classList.remove("robot-speaking");
});
voiceEnabled.addEventListener("change",()=>{
 if(!voiceEnabled.checked&&"speechSynthesis" in window)speechSynthesis.cancel();
 if(!voiceEnabled.checked)root.classList.remove("robot-speaking");
});
const translators=new Map();
async function translateReply(text,language){
 const target=language.split("-")[0].toLowerCase();
 if(target==="en")return text;
 if(!window.Translator?.create)return null;
 try{
  if(!translators.has(target))
   translators.set(target,window.Translator.create({sourceLanguage:"en",targetLanguage:target}));
  const translator=await translators.get(target);
  return await translator.translate(text);
 }catch{
  translators.delete(target);return null;
 }
}
function message(s,user=false,links=[],alreadyLocalized=false){
 const text=String(s||"");
 const n=make("div","robot-msg"+(user?" user":""));
 const content=document.createTextNode(text);n.append(content);
 if(links.length){
  const wrap=make("div","robot-links");
  links.forEach(([label,url])=>{
   const a=make("a",null,label);a.href=new URL(url,base).href;wrap.append(a);
  });
  n.append(wrap);
 }
 let spokenText=text;
 if(!user){
  lastAssistantReply=text;
  const play=make("button","robot-speak-reply","🔊 Speak reply");
  play.type="button";play.setAttribute("aria-label","Speak this answer aloud");
  play.addEventListener("click",()=>speak(spokenText,true));
  n.append(play);
 }
 log.append(n);log.scrollTop=log.scrollHeight;
 if(user)return;
 const locale=currentLanguage(),baseLang=baseLanguage();
 const nativeScript=localeFromText(text);
 const isNative=alreadyLocalized||baseLang==="en"||nativeScript?.split("-")[0]===baseLang;
 if(isNative){if(speechUnlocked)speak(text);return}
 // Local on-device translation is optional: do not claim broad translation
 // support in browsers that lack the Translator API.
 void translateReply(text,locale).then(translated=>{
  if(translated){
   content.textContent=translated;spokenText=translated;lastAssistantReply=translated;
   if(speechUnlocked)speak(translated);
  }else{
   voiceStatus.textContent="No translation engine for "+locale+" is available here. Use Axiovo Research Assistant for an answer in that language.";
  }
 }).catch(()=>{voiceStatus.textContent="Translation unavailable. The original response is still shown."});
}
function clean(s){return String(s||"").replace(/\s+/g," ").trim().slice(0,170)}
function visible(n){return n.getClientRects().length>0&&!n.closest("#axiovo-robot,[aria-hidden=true]")}
function snapshot(){
const headings=[...document.querySelectorAll("main h1,main h2,main h3,[role=main] h1,[role=main] h2")].filter(visible).map(n=>clean(n.textContent)).filter(Boolean).slice(0,35);
const controls=[...document.querySelectorAll("main button,main a,main input,main select,[role=main] button")].filter(visible).map(n=>clean(n.getAttribute("aria-label")||n.textContent||n.placeholder||n.title)).filter(Boolean).slice(0,100);
return {name:document.title.split("|")[0].trim(),desc:clean(document.querySelector('meta[name="description"]')?.content),headings,controls};
}

let guideTarget=null,guideTimer=null,guideOpen=false,guidePrevious=null;
function targetNodes(){
 return [...document.querySelectorAll('main h1,main h2,main h3,main a,main button,main input,main select,main summary,header a,header button,[role="main"] h1,[role="main"] h2,[role="main"] button')]
  .filter(n=>n.isConnected&&!n.closest("#axiovo-robot,[hidden],[aria-hidden='true']")&&n.getClientRects().length);
}
function positionGuide(){
 if(!guideTarget||!guideTarget.isConnected)return;
 const target=guideTarget.getBoundingClientRect(),size=launcher.getBoundingClientRect();
 const w=size.width||160,h=size.height||56,margin=12;
 // Place above or below the feature. On narrow screens keep the label and face on screen.
 const x=Math.max(margin,Math.min(innerWidth-w-margin,
   target.right+w+margin<innerWidth?target.right+margin:target.left-w-margin));
 let y=target.bottom+margin;
 if(y+h>innerHeight-margin)y=target.top-h-margin;
 y=Math.max(margin,Math.min(innerHeight-h-margin,y));
 root.classList.add("axiovo-guiding");
 root.style.setProperty("left",x+"px","important");
 root.style.setProperty("top",y+"px","important");
 root.style.setProperty("right","auto","important");
 root.style.setProperty("bottom","auto","important");
 // Chat remains available in its normal dock, away from the highlighted target.
 if(innerWidth>760){
  panel.style.setProperty("left",target.left>innerWidth/2?"12px":"auto","important");
  panel.style.setProperty("right",target.left>innerWidth/2?"auto":"12px","important");
  panel.style.setProperty("top","auto","important");
  panel.style.setProperty("bottom","86px","important");
 }
}
function stopGuide(){
 if(guideTimer){clearTimeout(guideTimer);guideTimer=null}
 if(guideTarget){guideTarget.classList.remove("axiovo-robot-target");guideTarget=null}
 root.classList.remove("axiovo-guiding");
 for(const prop of ["left","top","right","bottom"])root.style.removeProperty(prop);
 for(const prop of ["left","top","right","bottom"])panel.style.removeProperty(prop);
 if(innerWidth>760&&guidePrevious){move(guidePrevious.x,guidePrevious.y)}
 guidePrevious=null;
}
function showTarget(node,label){
 if(!node||!node.isConnected||node.closest("#axiovo-robot"))return false;
 stopGuide();
 guidePrevious=innerWidth>760&&lastPos?{...lastPos}:null;
 guideTarget=node;
 node.classList.add("axiovo-robot-target");
 const reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 node.scrollIntoView({behavior:reduce?"instant":"smooth",block:"center",inline:"nearest"});
 panel.hidden=false;
 const place=()=>{if(guideTarget===node)positionGuide()};
 place();
 guideTimer=setTimeout(place,reduce?30:450);
 // Avoid leaving old highlights active forever; user can also stop manually.
 const explain=label||String(node.getAttribute("aria-label")||node.textContent||"").replace(/\s+/g," ").trim().slice(0,85);
 message("I highlighted "+(explain?"“"+explain+"”":"that feature")+". The robot is pointing to it; you can use that control directly.");
 return true;
}
function findGuideTarget(query){
 const ignored=new Set("please show where is the a an me how do i use explain find this that on in my to go highlight point at located button section feature option".split(" "));
 const word=s=>[...new Set((String(s||"").toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(t=>!ignored.has(t)))];
 const terms=word(query);
 if(!terms.length)return null;
 const scored=targetNodes().map(node=>{
  const name=[node.getAttribute("aria-label"),node.getAttribute("title"),node.placeholder,node.textContent].filter(Boolean).join(" ").replace(/\s+/g," ").trim().slice(0,250);
  const tokens=word(name);
  const matches=terms.filter(t=>tokens.some(w=>w===t||w.startsWith(t)||t.startsWith(w))).length;
  return {node,name,score:matches+((name.toLowerCase()===query.toLowerCase())?3:0)};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.name.length-b.name.length);
 return scored[0]||null;
}


/* One assistant entry point. Reuse Axiovo's existing archive connectors,
   source IDs, and Library storage. No fabricated answers or paper records. */
let archiveBridge=null,searchSerial=0;
function loadScriptOnce(name){
 return new Promise((resolve,reject)=>{
  if(name==="archive-data.js"&&window.AxiovoArchiveData){resolve();return}
  if(name==="arxiv-versions.js"&&window.AxiovoArxiv){resolve();return}
  if(name==="eprint-source.js"&&window.AxiovoEprintSource){resolve();return}
  let node=document.querySelector('script[data-robot-source="'+name+'"]');
  if(node){node.addEventListener("load",resolve,{once:true});node.addEventListener("error",reject,{once:true});return}
  node=document.createElement("script");node.src=new URL(name,base).href;
  node.dataset.robotSource=name;node.onload=resolve;node.onerror=()=>reject(new Error("Unable to load "+name));
  document.head.append(node);
 });
}
async function archiveAPI(){
 if(window.AxiovoArchiveData)return window.AxiovoArchiveData;
 if(!archiveBridge)archiveBridge=(async()=>{
  await loadScriptOnce("arxiv-versions.js");
  // Data scripts must follow the archive identity helper.
  await loadScriptOnce("eprint-source.js");
  await loadScriptOnce("archive-data.js");
  return window.AxiovoArchiveData;
 })().catch(e=>{archiveBridge=null;throw e});
 return archiveBridge;
}
function researchLink(question){return new URL("copilot.html?q="+encodeURIComponent(question.slice(0,500)),base).href}
function paperIntent(q){
 return /\b(find|search|look for|show|list|discover|locate|fetch|get|papers?|preprints?|articles?|publications?|literature|arxiv|biorxiv|chemrxiv|eprint|doi)\b/i.test(q);
}
function paperQuery(question){
 return question
  .replace(/^(?:please\s+)?(?:could you\s+|can you\s+)?(?:find|search for|search|look for|show me|list|discover|locate|fetch|get)\s+/i,"")
  .replace(/^(?:recent|latest|new|published|research|scientific)\s+(?:papers?|preprints?|articles?|literature)\s+(?:on|about|related to|in|by)\s+/i,"")
  .replace(/^(?:papers?|preprints?|articles?|literature)\s+(?:on|about|related to|in|by)\s+/i,"")
  .replace(/\s+(?:papers?|preprints?|articles?)\s*$/i,"")
  .replace(/[?.!]+\s*$/,"").trim();
}
function resultCard(p,api){
 const wrap=make("div","robot-paper-card");
 const a=make("a","robot-paper-title",p.title);a.href=p.url;
 a.target="_blank";a.rel="noopener noreferrer";
 wrap.append(a);
 const about=make("div","robot-paper-meta",(api.names[p.source]||p.source)+" · "+(p.date||"date not provided")+" · "+(p.authors||[]).slice(0,3).join(", "));
 wrap.append(about);
 if(p.abstract){const snippet=make("p","robot-paper-snippet",p.abstract.slice(0,235)+(p.abstract.length>235?"…":""));wrap.append(snippet)}
 const save=make("button","robot-paper-save","Save to Library");
 save.type="button";save.addEventListener("click",()=>{
  try{if(api.save(p)){save.textContent="Saved ✓";save.disabled=true}else save.textContent="Unable to save"}
  catch{save.textContent="Unable to save"}
 });
 wrap.append(save);return wrap;
}
async function searchPapers(question){
 const query=paperQuery(question);
 if(query.length<2){message("Tell me the research topic, author, title or paper identifier to search.");return}
 const serial=++searchSerial;
 const status=make("div","robot-msg","Searching Axiovo's four research archives for “"+query+"”…");
 log.append(status);log.scrollTop=log.scrollHeight;
 const go=make("a","robot-paper-title","Open the full cross-archive search");
 go.href=new URL("desk.html?q="+encodeURIComponent(query),base).href;
 try{
  const api=await archiveAPI();
  if(serial!==searchSerial)return;
  const sources=["arxiv","biorxiv","chemrxiv","eprint"];
  const criteria={q:query,sort:/\b(latest|newest|recent)\b/i.test(question)?"recent":"relevance"};
  // Existing source clients perform actual fetches and retain original identifiers.
  // Limit the mini-view to initial results; Research Desk offers full pagination.
  const fetched=await Promise.allSettled(sources.map(async source=>{
   try{
    const live=await api.live(source,criteria,undefined,null);
    return {source,papers:(live.papers||[]).slice(0,12),provider:live.provider||"live source"};
   }catch(error){
    const snap=await api.snapshot(source);
    return {source,papers:api.filter(snap.papers,criteria).slice(0,12),provider:"indexed snapshot",partial:true};
   }
  }));
  if(serial!==searchSerial)return;
  const records=fetched.filter(x=>x.status==="fulfilled").flatMap(x=>x.value.papers);
  const found=new Set(),unique=records.filter(p=>{const k=p.source+":"+(p.recordId||p.url);if(found.has(k))return false;found.add(k);return true});
  status.replaceChildren();
  status.append(make("div",null,unique.length?"Found "+unique.length+" matching indexed/source records (showing up to five).":"No matching records returned by the available source searches. This does not prove no such paper exists."));
  if(unique.length){
   const sort=window.AxiovoPaperSort;
   const result=criteria.sort==="recent"?unique.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||""))):unique;
   result.slice(0,5).forEach(p=>status.append(resultCard(p,api)));
  }
  status.append(go);
  if(fetched.some(x=>x.status==="rejected"||x.value.partial))status.append(make("small",null,"Some sources used partial indexes or were unavailable. Open Research Desk for coverage details."));
  log.scrollTop=log.scrollHeight;
 }catch(error){
  if(serial!==searchSerial)return;
  status.replaceChildren(make("div",null,"Axiovo's research search could not load here. Open the full Research Desk to run your search."),go);
 }
}
function routeToCopilot(question){
 const msgText={
 bn:"আপনার প্রশ্নটি মূল ভাষাতেই Axiovo Research Assistant-এ পাঠানো হবে। উত্তর উপলব্ধ তথ্য ও AI সেটিংসের উপর নির্ভর করে।",
 hi:"आपका प्रश्न उसी भाषा में Axiovo Research Assistant को भेजा जाएगा। उत्तर उपलब्ध स्रोतों और AI सेटिंग पर निर्भर करता है।",
 es:"Enviaré tu pregunta original al asistente de investigación de Axiovo. La respuesta depende de las fuentes disponibles.",
 fr:"Votre question sera transmise telle quelle à l’assistant de recherche Axiovo. La réponse dépend des sources disponibles.",
 ar:"سأرسل سؤالك بلغته الأصلية إلى مساعد البحث في Axiovo. تعتمد الإجابة على المصادر المتاحة."
 }[baseLanguage()]||"I'll pass your exact question to Axiovo Research Assistant in the same language. Its response depends on available evidence and configured AI; I cannot promise an answer in every language.";
 message(msgText,false,[["Open Research Assistant", "copilot.html?q="+encodeURIComponent(question.slice(0,500))]],baseLanguage()!=="en"&&Boolean({bn:1,hi:1,es:1,fr:1,ar:1}[baseLanguage()]));
}

const aliases=[["Research Hub",/\b(research hub|research map|connection graph|knowledge graph|paper graph)\b/],["ProofLab",/\bproof\s*lab\b/],["Research Assistant",/\b(copilot|research assistant)\b/],["Research Desk",/\b(research desk|desk)\b/],["Library",/\b(library|workspace)\b/],["Settings",/\bsettings\b/],["My Feed",/\b(my feed|feed)\b/],["Research Tools",/\b(research tools|pdf reader)\b/],["Home",/\b(home|homepage)\b/],["ChemRxiv",/\bchemrxiv\b/],["bioRxiv",/\bbiorxiv\b/],["Cryptology ePrint",/\b(cryptology|crypto|eprint|iacr)\b/],["arXiv",/\barxiv\b/]];
function ask(raw){
const question=clean(raw);if(!question)return;

message(question,true);
const q=question.toLowerCase(),state=snapshot();
const shortcuts=[
 {test:/\b(graph|connections|research map|knowledge map)\b/,file:"research-hub.html#relationships",label:"Research connections"},
 {test:/\b(version history|paper versions|paper evolution|revisions)\b/,file:"research-hub.html#versions",label:"Paper evolution"},
 {test:/\b(pdf reader|read a pdf|annotate pdf|pdf annotations)\b/,file:"lab.html#reader",label:"PDF reader"},
 {test:/\b(research alerts|paper alerts|alert settings)\b/,file:"lab.html#alerts",label:"Research alerts"},
 {test:/\b(project notebook|research projects|my projects|research questions)\b/,file:"workspace.html#research-questions",label:"Research projects"}
];
const shortcut=shortcuts.find(item=>item.test.test(q));
if(shortcut&&/\b(open|go to|take me|show me|navigate|where|find|use|view)\b/.test(q)){
 const url=new URL(shortcut.file,base);message("Opening "+shortcut.label+".");location.assign(url.href);return;
}
if(/\b(stop guiding|stop pointing|cancel guide|stop tour)\b/.test(q)){stopGuide();message("I stopped pointing. Ask me to show another control.");return}
if(paperIntent(question)&&!/\b(open|go to|navigate|take me|visit|switch to)\b/.test(q)){void searchPapers(question);return}
if(/\b(show me|where is|where are|point to|highlight|guide me|how do i use)\b/.test(q)){const hit=findGuideTarget(question);if(hit&&showTarget(hit.node,hit.name.slice(0,75)))return}
if(/\b(open|go to|navigate|take me|visit|switch to)\b/.test(q)){const target=aliases.find(([k,re])=>re.test(q));if(target){message("Opening "+target[0]+".");location.assign(new URL(pages[target[0]],base).href);return}}
if(/\b(sort|order)\b/.test(q)&&/\b(newest|oldest|recent|relevance|title)\b/.test(q)){
const key=/oldest/.test(q)?"oldest":/relevance/.test(q)?"relevance":/title/.test(q)?"title":"newest";
const selects=[...document.querySelectorAll("main select")].filter(visible);
for(const select of selects){const option=[...select.options].find(o=>new RegExp(key==="newest"?"newest|recent":key,"i").test(o.textContent+" "+o.value));if(option){select.value=option.value;select.dispatchEvent(new Event("change",{bubbles:true}));showTarget(select,"sort control");message("Applied "+clean(option.textContent)+" sorting on this page.");return}}
}
if(/^(search|find|look for)\b/.test(q)){
const term=question.replace(/^(search for|find|look for|search)\s*/i,"").replace(/[?.!]+$/,"").trim();
const field=[...document.querySelectorAll('main input[type=search],main input[placeholder*="search" i]')].find(visible);
if(field&&term.length>2){field.value=term;field.dispatchEvent(new Event("input",{bubbles:true}));field.dispatchEvent(new Event("change",{bubbles:true}));field.focus();showTarget(field,"search field");message("Entered your query in the search field. Review the results or submit the search if needed.");return}
message("Use Research Desk to search across archives.",false,[["Open Research Desk","desk.html"]]);return;
}
if(/(what|about|explain|purpose|understand|how).*(this page|here|current page)|(this page|here).*(do|work|for)/.test(q)){
const intro=document.querySelector("main h1,[role=main] h1");if(intro)showTarget(intro,"page introduction");
message("This is "+state.name+". "+(state.desc||"Part of Axiovo.")+(state.headings.length?"\n\nCurrent sections: "+state.headings.slice(0,9).join("; ")+".":"")+"\n\nI read the live page, including new headings after updates.");return}
if(/^(hi|hello|hey)[!. ]*$/.test(q)||/^(नमस्ते|नमस्कार|হ্যালো|নমস্কার|வணக்கம்|నమస్కారం|مرحبا|hola|bonjour|hallo|olá|你好|こんにちは|안녕하세요)[!.,。 ]*$/iu.test(q)){
 message(welcome[baseLanguage()]||welcome.en,false,[],true);return;
}
if(baseLanguage()!=="en"){
 // Do not pretend that fixed English-only keyword rules understand every
 // language. Delegate intact native-language questions to Research Assistant.
 routeToCopilot(question);return;
}
const ignored=new Set("what where which when why how does can please tell show about this that there here with from page axiovo help the and are for you your use using open my want need".split(" "));
const tokens=s=>[...new Set((s.toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(x=>!ignored.has(x)))];
const terms=tokens(question),candidates=[...state.headings.map(x=>({text:x,type:"section"})),...state.controls.map(x=>({text:x,type:"control"})),...Object.keys(pages).map(x=>({text:x,type:"page"}))];
for(const c of candidates)c.score=terms.filter(t=>tokens(c.text).some(w=>w===t||w.startsWith(t)||t.startsWith(w))).length;
const hits=candidates.filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
if(hits.length){const best=findGuideTarget(question);if(best)showTarget(best.node,best.name.slice(0,75));message("Related items I found: "+hits.map(x=>x.text+" ("+x.type+")").join("; ")+".\n\nThese are verified page labels, not an AI-generated explanation.",false,hits.filter(x=>x.type==="page").map(x=>[x.text,pages[x.text]]));return}
routeToCopilot(question);
}
message(welcome[baseLanguage()]||"Hi! Ask me to find papers across Axiovo's four archives, explain a page, or guide you to a feature.",false,[],Boolean(welcome[baseLanguage()]));
for(const name of ["Find papers on quantum information","Open Research Hub","What does this page do?"]){const b=make("button",null,name);b.type="button";b.addEventListener("click",()=>ask(name));suggestions.append(b)}
let drag=null,wasDragged=false,lastPos=null;
function move(x,y){const w=launcher.offsetWidth,h=launcher.offsetHeight;x=Math.max(5,Math.min(innerWidth-w-5,x));y=Math.max(5,Math.min(innerHeight-h-5,y));lastPos={x,y};root.style.setProperty("right","auto","important");root.style.setProperty("bottom","auto","important");root.style.setProperty("left",x+"px","important");root.style.setProperty("top",y+"px","important");if(innerWidth>760){panel.style.setProperty("right","auto","important");panel.style.setProperty("bottom","auto","important");panel.style.setProperty("left",Math.max(8,Math.min(innerWidth-panel.offsetWidth-8,x<innerWidth/2?x:x+w-panel.offsetWidth))+"px","important");panel.style.setProperty("top",Math.max(8,Math.min(innerHeight-panel.offsetHeight-8,y-panel.offsetHeight-12))+"px","important")}}
if(innerWidth>760){try{const pos=JSON.parse(localStorage.getItem("axiovo-robot-position-v1"));if(Number.isFinite(pos.x)&&Number.isFinite(pos.y))move(pos.x*innerWidth,pos.y*innerHeight)}catch{}}
fab.addEventListener("pointerdown",e=>{if(e.button!==0)return;if(guideTarget)stopGuide();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:root.getBoundingClientRect().left,top:root.getBoundingClientRect().top};wasDragged=false;fab.setPointerCapture(e.pointerId)});
fab.addEventListener("pointermove",e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)wasDragged=true;if(wasDragged)move(drag.left+dx,drag.top+dy)});
fab.addEventListener("pointerup",e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;if(wasDragged){try{localStorage.setItem("axiovo-robot-position-v1",JSON.stringify({x:lastPos.x/innerWidth,y:lastPos.y/innerHeight}))}catch{}return}panel.hidden=!panel.hidden;if(!panel.hidden){if(lastPos&&innerWidth>760)move(lastPos.x,lastPos.y);input.focus()}});
fab.addEventListener("click",e=>{if(e.detail===0){panel.hidden=!panel.hidden;if(!panel.hidden)input.focus()}});
close.addEventListener("click",()=>{stopGuide();panel.hidden=true;if("speechSynthesis" in window)speechSynthesis.cancel();fab.focus()});
form.addEventListener("submit",e=>{e.preventDefault();const q=input.value;input.value="";ask(q)});
mic.addEventListener("click",()=>{
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech){message("Voice recognition is not supported by this browser. You can still type in your language.");return}
 if(!confirm("Your browser's speech service may send audio to its provider. Axiovo does not store recordings. Continue?"))return;
 const rec=new Speech();
 rec.lang=currentLanguage();rec.interimResults=false;rec.maxAlternatives=1;
 mic.disabled=true;mic.textContent="●";root.classList.add("robot-listening");
 rec.onresult=e=>{
  const words=e.results?.[0]?.[0]?.transcript||"";
  if(words){
   updateLanguageLabel();refreshVoices();ask(words)}
 };
 rec.onerror=e=>message("Microphone unavailable for "+rec.lang+": "+(e.error||"unknown")+". You can type instead.");
 rec.onend=()=>{mic.disabled=false;mic.textContent="🎙";root.classList.remove("robot-listening")};
 try{rec.start()}catch{rec.onend();message("Could not start voice input for "+rec.lang+". Try another language or type.");}
});
window.addEventListener("resize",()=>{if(guideTarget)positionGuide();else if(innerWidth>760&&lastPos)move(lastPos.x,lastPos.y)});
window.addEventListener("scroll",()=>{if(guideTarget)positionGuide()},{passive:true});
window.AxiovoRobotGuide={show:(selector)=>{const node=document.querySelector(selector);return showTarget(node,selector)},stop:stopGuide};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})();