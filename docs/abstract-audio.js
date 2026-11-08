/* Read source abstracts aloud with on-device voices and a scientific lexicon. */
(function(){
"use strict";
const synth=window.speechSynthesis;
if(!synth||!window.SpeechSynthesisUtterance)return;
const key="axiovo-abstract-audio-v1";
const lexicon={
 "arXiv":"archive","bioRxiv":"bio archive","ChemRxiv":"chem archive","Cryptology ePrint":"cryptology ee print","Axiovo":"ax-ee-OH-voh",
 "CRISPR":"crisper","Cas9":"cass nine","qubit":"cue bit","qubits":"cue bits","POVM":"P O V M",
 "CHSH":"C H S H","DNA":"D N A","RNA":"R N A","mRNA":"messenger R N A","PCR":"P C R",
 "DFT":"D F T","NMR":"N M R","GPU":"G P U","LLM":"L L M","CO₂":"carbon dioxide","CO2":"carbon dioxide",
 "TiO2":"titanium dioxide","eV":"electron volts","ppm":"parts per million","μm":"micrometers","μs":"microseconds",
 "Schrödinger":"shruh-ding-er","eigenvalue":"eye gen value","ħ":"h bar"
};
const symbols={"α":" alpha ","β":" beta ","γ":" gamma ","δ":" delta ","λ":" lambda ","μ":" mu ","σ":" sigma ","ψ":" psi ","π":" pi ","≈":" approximately ","±":" plus or minus ","≤":" at most ","≥":" at least ","×":" times ","%":" percent ","°C":" degrees Celsius "};
let prefs={voice:"",rate:"steady"};
const android=/Android/i.test(navigator.userAgent||"");
try{prefs={...prefs,...JSON.parse(localStorage.getItem(key)||"{}")}}catch{}
const female=/female|samantha|victoria|karen|moira|tessa|fiona|serena|zira|hazel|jenny|aria|sonia|libby|veena|swara|ava|allison|joanna|emma|sara|aditi|raveena/i;
const make=(tag,label)=>{
 const el=document.createElement(tag);if(label)el.textContent=label;return el;
};
const toolbar=make("section");toolbar.className="axiovo-audio-player";toolbar.hidden=true;
toolbar.setAttribute("aria-label","Abstract audio player");
const title=make("strong"),status=make("span");status.setAttribute("role","status");
const caption=make("p");caption.className="axiovo-audio-caption";
const voiceSelect=make("select"),speed=make("select");
voiceSelect.setAttribute("aria-label","On-device voice");speed.setAttribute("aria-label","Reading speed");
for(const [value,label] of [["steady","Steady"],["slow","Slow"],["brisk","Brisk"]]){
 const option=make("option",label);option.value=value;speed.append(option);
}
speed.value=["steady","slow","brisk"].includes(prefs.rate)?prefs.rate:"steady";
const pause=make("button","Pause"),skip=make("button","Next paper"),stop=make("button","Stop");
for(const b of [pause,skip,stop])b.type="button";
const controls=make("div");controls.append(voiceSelect,speed,pause,skip,stop);
toolbar.append(title,status,caption,controls);document.body.append(toolbar);
// Android/Chrome may expose English voices without localService=true.
const available=()=>{
 const voices=synth.getVoices().filter(v=>/^en(?:[-_]|$)/i.test(v.lang));
 return voices.sort((a,b)=>Number(Boolean(b.localService))-Number(Boolean(a.localService)));
};
const voiceScore=v=>Number(female.test(v.name))*4+Number(/natural|premium|enhanced/i.test(v.name))*2;
function refresh(){
 const options=available().sort((a,b)=>voiceScore(b)-voiceScore(a));
 const initial=make("option","Auto-select voice");initial.value="";
 voiceSelect.replaceChildren(initial,...options.map(v=>{const option=make("option",v.name);option.value=v.voiceURI;return option}));
 voiceSelect.value=options.some(v=>v.voiceURI===prefs.voice)?prefs.voice:"";
 return options;
}
function store(){try{localStorage.setItem(key,JSON.stringify(prefs))}catch{}}
voiceSelect.onchange=()=>{prefs.voice=voiceSelect.value;defaultVoice=false;store()};
speed.onchange=()=>{prefs.rate=speed.value;store()};
if(typeof synth.addEventListener==="function")synth.addEventListener("voiceschanged",refresh);
else synth.onvoiceschanged=refresh;
refresh();
const replacement=new RegExp("(?<![\\p{L}\\p{N}])("+Object.keys(lexicon).sort((a,b)=>b.length-a.length).join("|")+")(?![\\p{L}\\p{N}])","gu");
function pronounce(text){
 return text.replace(replacement,term=>lexicon[term]).replace(/°C|[αβγδλμσψπ≈±≤≥×%]/gu,term=>symbols[term]).replace(/\s+/g," ").trim();
}
function segments(text){
 const sentences=typeof Intl.Segmenter==="function"?[...new Intl.Segmenter("en",{granularity:"sentence"}).segment(text)].map(x=>x.segment):[text];
 // Short chunks protect Android's speech engine against long technical abstracts.
 const limit=android?110:205;
 const chunks=[];
 for(const sentence of sentences){
  const words=sentence.trim().split(/\s+/u);
  let chunk="";
  for(const word of words){
   if(chunk && (chunk.length+word.length+1)>limit){chunks.push(chunk);chunk=""}
   if(word.length>limit){
    if(chunk){chunks.push(chunk);chunk=""}
    for(let i=0;i<word.length;i+=limit)chunks.push(word.slice(i,i+limit));
   }else{chunk+=(chunk?" ":"")+word}
  }
  if(chunk)chunks.push(chunk);
 }
 return chunks.filter(Boolean);
}
let items=[],paper=0,sentence=0,revision=0,paused=false;
let pending=null,activeUtterance=null,failedVoice=null,defaultVoice=android,watchdog=null;
let engineRunning=false;
function clearWatchdog(){if(watchdog!==null){clearTimeout(watchdog);watchdog=null}}
function recover(message){
 cancelActive();paused=true;pause.disabled=false;pause.textContent="Retry";
 status.textContent=message;
}
const delay=(callback,ms=100)=>{
 if(pending!==null)clearTimeout(pending);
 pending=setTimeout(()=>{pending=null;callback()},ms);
};
function cancelActive(){
 if(pending!==null){clearTimeout(pending);pending=null}
 // Invalidate callbacks BEFORE cancelling; Android fires "interrupted" on cancel.
 clearWatchdog();revision++;activeUtterance=null;
 // A cancel() on an idle Android engine can invalidate the next speech request.
 if(engineRunning||synth.speaking||synth.pending||synth.paused){
  try{synth.cancel()}catch(error){console.warn("Axiovo speech cancel:",error)}
 }
 engineRunning=false;
}
function finish(message){
 cancelActive();paused=false;items=[];caption.textContent="";
 title.textContent="Abstract audio";status.textContent=message;
 pause.disabled=true;skip.disabled=true;stop.textContent="Close";
}
function say(useDefault=defaultVoice){
 if(paused||!items.length)return;
 if(paper>=items.length){finish("Playback complete.");return}
 const {record,parts}=items[paper],phrase=parts[sentence];
 if(!phrase){paper++;sentence=0;delay(()=>say(),100);return}
 const voiceList=available();
 const voice=useDefault?null:voiceList.find(v=>v.voiceURI===prefs.voice)||(android?null:voiceList[0])||null;
 const run=revision,utterance=new SpeechSynthesisUtterance(pronounce(phrase));
 activeUtterance=utterance;
 // Android Chrome may reject an enumerated voice that has not finished loading.
 // When it does, retry once using the OS/browser default without setting .voice.
 if(voice)utterance.voice=voice;
 // Without an explicit voice Android should negotiate its configured TTS locale.
 if(voice)utterance.lang=voice.lang;
 else if(!android)utterance.lang="en-US";
 utterance.rate={slow:.85,steady:1,brisk:1.12}[prefs.rate]||1;
 utterance.onend=()=>{
  if(run!==revision||activeUtterance!==utterance)return;
  clearWatchdog();activeUtterance=null;engineRunning=false;failedVoice=null;sentence++;
  // Yield to Android's TTS service before scheduling the next utterance.
  delay(()=>{if(run===revision)say()},120);
 };
 utterance.onerror=(event)=>{
  if(run!==revision||activeUtterance!==utterance)return;
  clearWatchdog();activeUtterance=null;engineRunning=false;
  const error=event?.error||"unknown";
  // Deliberate cancels were invalidated above; a current-session interruption
  // is a genuine engine failure and should receive the same fallback retry.
  if(!useDefault && failedVoice!==phrase && error!=="not-allowed" && error!=="audio-busy"){
   failedVoice=phrase;defaultVoice=true;
   status.textContent="Retrying with the default voice…";
   delay(()=>{if(run===revision)say(true)},180);
   return;
  }
  console.warn("Axiovo abstract audio:",error);
  const noEngine=["synthesis-failed","synthesis-unavailable","voice-unavailable","language-unavailable"].includes(error);
  recover(error==="not-allowed"?"Tap Retry to allow speech playback.":noEngine?
   "Android speech engine failed ("+error+"). Tap Retry, or open Android Settings > Text-to-speech output and install or select a working speech engine.":
   "Speech unavailable ("+error+"). Check audio output, then tap Retry.");
 };
 title.textContent=record.title;caption.textContent=phrase;
 status.textContent="Paper "+(paper+1)+" of "+items.length;
 skip.disabled=paper+1>=items.length;
 // Recover even when the device engine never sends start/end/error events.
 watchdog=setTimeout(()=>{
  if(run===revision&&activeUtterance===utterance)recover("The voice did not respond. Tap Retry or select another voice.");
 },Math.max(15000,utterance.text.length*160));
 try{
  synth.speak(utterance);
  engineRunning=true;
 }catch(error){
  console.error("Axiovo speechSynthesis.speak threw:",error);
  utterance.onerror({error:error?.name||"synthesis-failed"});
 }
}
function play(records){
 const newItems=records.filter(p=>p?.abstract).map(record=>({record,parts:[...segments(record.title||""),...segments(record.abstract)]}));
 if(!newItems.length)return;
 cancelActive();
 if(synth.paused){try{synth.resume()}catch(error){console.warn("Axiovo speech resume:",error)}}
 items=newItems;paper=0;sentence=0;paused=false;failedVoice=null;
 // Prefer Android's OS default, rather than forcing a fragile enumerated voice.
 defaultVoice=android&&!prefs.voice;
 pause.disabled=false;pause.textContent="Pause";stop.textContent="Stop";toolbar.hidden=false;
 // Keep the first speak call inside the user gesture.
 say();
}
pause.onclick=()=>{
 if(!items.length)return;
 paused=!paused;pause.textContent=paused?"Resume":"Pause";
 // Android pause() can cancel speech without resumable state. Keep the
 // current short phrase and replay it on Resume instead.
 if(paused){cancelActive();status.textContent="Paused. Resume repeats the current phrase."}
 else{cancelActive();if(synth.paused)synth.resume();say()}

};
skip.onclick=()=>{
 if(!items.length||paper+1>=items.length)return;
 cancelActive();if(synth.paused)synth.resume();paused=false;failedVoice=null;
 pause.textContent="Pause";paper++;sentence=0;
 // Keep the first speak call inside the user gesture.
 say();
};
stop.onclick=()=>{finish("");toolbar.hidden=true};
window.AxiovoAbstractAudio={play};
})();
