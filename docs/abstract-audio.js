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
voiceSelect.onchange=()=>{prefs.voice=voiceSelect.value;store()};
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
 return sentences.flatMap(value=>value.trim().match(/.{1,205}(?:\s|$)|\S+/gu)||[]).map(x=>x.trim()).filter(Boolean);
}
let items=[],paper=0,sentence=0,revision=0,paused=false;
let pending=null,activeUtterance=null,failedVoice=null;
const delay=(callback,ms=100)=>{
 if(pending!==null)clearTimeout(pending);
 pending=setTimeout(()=>{pending=null;callback()},ms);
};
function cancelActive(){
 if(pending!==null){clearTimeout(pending);pending=null}
 // Invalidate callbacks BEFORE cancelling; Android fires "interrupted" on cancel.
 revision++;activeUtterance=null;synth.cancel();
}
function finish(message){
 cancelActive();paused=false;items=[];caption.textContent="";
 title.textContent="Abstract audio";status.textContent=message;
 pause.disabled=true;skip.disabled=true;stop.textContent="Close";
}
function say(useDefault=false){
 if(paused||!items.length)return;
 if(paper>=items.length){finish("Playback complete.");return}
 const {record,parts}=items[paper],phrase=parts[sentence];
 if(!phrase){paper++;sentence=0;delay(()=>say(),100);return}
 const voiceList=available();
 const voice=useDefault?null:voiceList.find(v=>v.voiceURI===prefs.voice)||voiceList[0]||null;
 const run=revision,utterance=new SpeechSynthesisUtterance(pronounce(phrase));
 activeUtterance=utterance;
 // Android Chrome may reject an enumerated voice that has not finished loading.
 // When it does, retry once using the OS/browser default without setting .voice.
 if(voice)utterance.voice=voice;
 utterance.lang=voice?.lang||"en-US";
 utterance.rate={slow:.80,steady:.94,brisk:1.17}[prefs.rate]||.94;
 utterance.onend=()=>{
  if(run!==revision||activeUtterance!==utterance)return;
  activeUtterance=null;failedVoice=null;sentence++;
  // Yield to Android's TTS service before scheduling the next utterance.
  delay(()=>{if(run===revision)say()},120);
 };
 utterance.onerror=(event)=>{
  if(run!==revision||activeUtterance!==utterance)return;
  activeUtterance=null;
  const error=event?.error||"unknown";
  // Deliberate cancels were invalidated above; a current-session interruption
  // is a genuine engine failure and should receive the same fallback retry.
  if(!useDefault && failedVoice!==phrase){
   failedVoice=phrase;
   status.textContent="Retrying with the default voice…";
   delay(()=>{if(run===revision)say(true)},180);
   return;
  }
  console.warn("Axiovo abstract audio:",error);
  finish("Speech playback unavailable ("+error+"). Try another device voice or check Android text-to-speech settings.");
 };
 title.textContent=record.title;caption.textContent=phrase;
 status.textContent="Paper "+(paper+1)+" of "+items.length;
 skip.disabled=paper+1>=items.length;
 try{synth.speak(utterance)}
 catch(error){
  utterance.onerror({error:error?.name||"synthesis-failed"});
 }
}
function play(records){
 const newItems=records.filter(p=>p?.abstract).map(record=>({record,parts:[record.title,...segments(record.abstract)]}));
 if(!newItems.length)return;
 cancelActive();synth.resume();items=newItems;paper=0;sentence=0;paused=false;failedVoice=null;
 pause.disabled=false;pause.textContent="Pause";stop.textContent="Stop";toolbar.hidden=false;
 const run=revision;delay(()=>{if(run===revision)say()},150);
}
pause.onclick=()=>{
 if(!items.length)return;
 paused=!paused;
 if(paused)synth.pause();else synth.resume();
 pause.textContent=paused?"Resume":"Pause";
};
skip.onclick=()=>{
 if(!items.length||paper+1>=items.length)return;
 cancelActive();synth.resume();paused=false;failedVoice=null;
 pause.textContent="Pause";paper++;sentence=0;
 const run=revision;delay(()=>{if(run===revision)say()},150);
};
stop.onclick=()=>{finish("");toolbar.hidden=true};
window.AxiovoAbstractAudio={play};
})();
