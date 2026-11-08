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
// Discard old Android voice selection that may point to a missing TTS package.
// Prefer the OS default on Android unless the user explicitly selects a new voice.
if(android)prefs.voice="";
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
const pause=make("button","Pause"),skip=make("button","Next paper"),test=make("button","Test voice"),copy=make("button","Copy abstract"),stop=make("button","Stop");
for(const b of [pause,skip,test,copy,stop])b.type="button";
const controls=make("div");controls.append(voiceSelect,speed,pause,skip,test,copy,stop);
toolbar.append(title,status,caption,controls);document.body.append(toolbar);
// Android/Chrome may expose English voices without localService=true.
const available=()=>{
 const voices=synth.getVoices().filter(v=>/^en(?:[-_]|$)/i.test(v.lang));
 return voices.sort((a,b)=>Number(Boolean(b.localService))-Number(Boolean(a.localService)));
};
const voiceScore=v=>Number(female.test(v.name))*4+Number(/natural|premium|enhanced/i.test(v.name))*2;
function refresh(){
 const options=available().sort((a,b)=>voiceScore(b)-voiceScore(a));
 const initial=make("option","System default (recommended)");initial.value="";
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
// Keep the speech engine alive across phrases. In particular, never cancel() an
// idle Android engine before its first speak() call.
let items=[],paper=0,sentence=0,run=0,paused=false,active=null;
let timer=null,watchdog=null,testing=false,lastError="",attempt=0;
let lastPaperText="";
const voiceModes=["selected","default","india","us"];
function clearTimers(){
 if(timer!==null){clearTimeout(timer);timer=null}
 if(watchdog!==null){clearTimeout(watchdog);watchdog=null}
}
function interrupt(){
 run++;clearTimers();
 if(active){
  active.onend=null;active.onerror=null;active.onstart=null;
  active=null;
  try{synth.cancel()}catch(e){console.warn("Axiovo TTS cancellation failed",e)}
 }
}
function message(text){status.textContent=text}
function closePlayer(){
 interrupt();items=[];testing=false;paused=false;
 toolbar.hidden=true;caption.textContent="";title.textContent="Abstract audio";
 pause.disabled=true;skip.disabled=true;
}
function voiceFor(mode){
 if(mode!=="selected")return null;
 return available().find(v=>v.voiceURI===prefs.voice)||null;
}
function makeUtterance(text,mode){
 const utterance=new SpeechSynthesisUtterance(text);
 const voice=voiceFor(mode);
 // Android works differently from Settings: Web Speech must explicitly pass
 // a supported language when no voice is chosen.
 if(voice){utterance.voice=voice;utterance.lang=voice.lang}
 else if(mode==="india")utterance.lang="en-IN";
 else if(mode==="us")utterance.lang="en-US";
 // For "default", leave .voice and .lang unset so Android chooses its
 // installed TTS voice instead of an unsupported Chrome-advertised locale.
 utterance.rate={slow:0.85,steady:1,brisk:1.12}[prefs.rate]||1;
 utterance.pitch=1;utterance.volume=1;
 return utterance;
}
function attemptModes(){
 // Explicit voice can be stale/unavailable even when its label is displayed.
 return prefs.voice?["selected","default","india","us"]:["default","india","us"];
}
function fail(error){
 lastError=error;
 paused=true;pause.disabled=false;pause.textContent="Retry";
 const options=attemptModes(),mode=options[Math.min(attempt>0?attempt-1:0,options.length-1)];
 const advice=error==="not-allowed"?"Tap Retry to grant Chrome permission to start speech.":
  "Chrome speech failed ("+error+", mode: "+mode+"). Tap Retry to try another locale, or Test voice. Copy abstract lets you use Android Select to Speak if Chrome remains unavailable.";
 message(advice);
 console.warn("Axiovo Web Speech failure:",error,{
  android,voices:available().length,lang:navigator.language,
  speaking:synth.speaking,pending:synth.pending,paused:synth.paused
 });
}
function speak(text,onComplete,isTest=false){
 const generation=run;
 const modes=attemptModes();
 let mode=modes[Math.min(attempt,modes.length-1)];
 // The direct button click must call speak() synchronously on Android.
 let utterance;
 try{utterance=makeUtterance(pronounce(text),mode)}
 catch(error){fail(error?.name||"utterance-error");return}
 active=utterance;
 let started=false;
 utterance.onstart=()=>{if(generation===run&&active===utterance){started=true;clearTimers();if(!isTest)message("Reading paper "+(paper+1)+" of "+items.length)}};
 utterance.onend=()=>{
  if(generation!==run||active!==utterance)return;
  active=null;clearTimers();attempt=0;lastError="";
  if(isTest){testing=false;message("Chrome voice test successful. Tap Listen to abstract to play a paper.");return}
  onComplete();
 };
 utterance.onerror=(event)=>{
  if(generation!==run||active!==utterance)return;
  active=null;clearTimers();
  const error=event?.error||"unknown";
  // A browser speech error may require another user gesture. Never silently
  // schedule a second speak() in a timer after an Android synthesis failure.
  attempt=Math.min(attempt+1,modes.length-1);
  if(error==="not-allowed")fail(error);
  else fail(error);
 };
 if(!isTest)message("Starting voice…");
 try{
  synth.speak(utterance);
  // Watchdog covers Android Web Speech calls that never fire any events.
  watchdog=setTimeout(()=>{
   if(generation!==run||active!==utterance)return;
   active=null;fail("no speech event");
  },Math.max(12000,utterance.text.length*200));
 }catch(error){
  if(generation!==run)return;
  active=null;clearTimers();attempt=Math.min(attempt+1,modes.length-1);
  fail(error?.name||error?.message||"speak-exception");
 }
}
function nextPhrase(){
 if(paused||testing||!items.length)return;
 if(paper>=items.length){
  items=[];message("Playback complete.");pause.disabled=true;
  stop.textContent="Close";return
 }
 const {record,parts}=items[paper];
 if(sentence>=parts.length){paper++;sentence=0;nextPhrase();return}
 const phrase=parts[sentence];
 title.textContent=record.title||"Abstract audio";caption.textContent=phrase;
 lastPaperText=[record.title||"",record.abstract||""].filter(Boolean).join("\n\n");
 skip.disabled=paper>=items.length-1;
 speak(phrase,()=>{
  sentence++;
  // This short yield lets Chrome release its completed audio stream.
  const generation=run;
  timer=setTimeout(()=>{timer=null;if(generation===run)nextPhrase()},180);
 });
}
function play(records){
 const newItems=(Array.isArray(records)?records:[]).filter(p=>p?.abstract)
   .map(record=>({record,parts:[...segments(record.title||""),...segments(record.abstract)]}));
 if(!newItems.length)return;
 // Cancel only when there is an actual previous utterance.
 interrupt();
 items=newItems;paper=0;sentence=0;attempt=0;testing=false;paused=false;
 lastPaperText=[newItems[0].record.title||"",newItems[0].record.abstract||""].filter(Boolean).join("\n\n");
 copy.disabled=false;
 pause.disabled=false;pause.textContent="Pause";skip.disabled=newItems.length<2;
 stop.textContent="Stop";toolbar.hidden=false;
 nextPhrase();
}
pause.onclick=()=>{
 if(!items.length)return;
 if(paused){
  paused=false;pause.textContent="Pause";
  // Restart this phrase on a fresh tap. This is more reliable on Android than
  // speechSynthesis.resume() after an error.
  if(synth.speaking||synth.pending){
   // Chromium may retain a stale speaking state after synthesis-failed.
   try{synth.cancel()}catch(e){}
  }
  if(synth.paused){try{synth.resume()}catch(e){}}
  nextPhrase();return;
 }
 paused=true;pause.textContent="Resume";
 interrupt();message("Paused. Resume repeats the current phrase.");
};
skip.onclick=()=>{
 if(paper>=items.length-1)return;
 interrupt();paused=false;testing=false;attempt=0;paper++;sentence=0;
 pause.textContent="Pause";nextPhrase();
};
copy.onclick=()=>{
 if(!lastPaperText)return;
 // This is a manual, privacy-preserving fallback. Do not send abstracts
 // to a third-party TTS endpoint without the user's consent.
 const text=lastPaperText;
 if(navigator.clipboard?.writeText){
  navigator.clipboard.writeText(text)
   .then(()=>message("Abstract copied. Use Android Select to Speak or paste it into a reader."))
   .catch(()=>message("Clipboard blocked by Chrome. Expand Read abstract and select the text."));
 }else message("Expand Read abstract, select the text, and choose Copy.");
};
test.onclick=()=>{
 interrupt();testing=true;paused=false;attempt=0;
 if(synth.speaking||synth.pending){try{synth.cancel()}catch(e){}}
 if(synth.paused){try{synth.resume()}catch(e){}}
 title.textContent="Voice test";caption.textContent="Hello. Axiovo audio is ready.";
 toolbar.hidden=false;stop.textContent="Close";
 speak("Hello. Axiovo audio is ready.",()=>{},true);
};
stop.onclick=closePlayer;
window.AxiovoAbstractAudio={play};
})();
