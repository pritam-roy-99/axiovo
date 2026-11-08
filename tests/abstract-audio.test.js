"use strict";
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
function setup(options={}){
 const elements=[],timers=new Map(),spoken=[],events={};
 let id=0,cancellations=0;
 const document={
  createElement(tag){
   const e={tag,textContent:"",children:[],setAttribute(){},
    append(...v){this.children.push(...v)},replaceChildren(...v){this.children=v}};
   elements.push(e);return e;
  },
  body:{append(){}}
 };
 const voice={name:"English India",lang:"en-IN",voiceURI:"india"};
 const synth={
  getVoices:()=>[voice],addEventListener(){},
  cancel(){cancellations++;spoken.at(-1)?.onerror?.({error:"interrupted"})},
  resume(){},pause(){throw Error("Do not use native Android pause")},
  speak(utterance){spoken.push(utterance);if(options.startImmediately)utterance.onstart()}
 };
 const Utterance=class{constructor(text){this.text=text}};
 const window={speechSynthesis:synth,SpeechSynthesisUtterance:Utterance,
  addEventListener(name,callback){events[name]=callback}};
 const context={document,window,SpeechSynthesisUtterance:Utterance,
  navigator:{userAgent:"Android Chrome",language:"en-IN"},
  localStorage:{getItem(){return options.voice?JSON.stringify({voice:options.voice}):null},setItem(){}},
  Intl,console:{warn(){}},setTimeout(fn,ms){timers.set(++id,{fn,ms});return id},clearTimeout(i){timers.delete(i)}};
 vm.runInNewContext(fs.readFileSync("docs/abstract-audio.js","utf8"),context);
 return {play:window.AxiovoAbstractAudio.play,spoken,events,voice,
  cancelCount:()=>cancellations,
  tick(){const [id,t]=[...timers].sort((a,b)=>a[1].ms-b[1].ms)[0];timers.delete(id);t.fn()},
  button(label){return elements.find(e=>e.tag==="button"&&e.textContent===label)},
  status:()=>elements.find(e=>e.tag==="span").textContent};
}
const record={title:"Quantum paper",abstract:"First sentence. Second sentence."};
{
 const h=setup();h.play([record]);assert.equal(h.spoken.length,1,"starts inside the tap");
 assert.equal(h.cancelCount(),0,"initial playback must not cancel an idle Android engine");
 const finishOld=h.spoken[0].onend;
 h.button("Pause").onclick();assert.ok(h.button("Resume"));finishOld();
 h.button("Resume").onclick();assert.equal(h.spoken.length,2);
 assert.equal(h.spoken[1].text,h.spoken[0].text);
 h.button("Stop").onclick();finishOld();assert.equal(h.spoken.length,2);
}
{
 const h=setup({voice:"india"});h.play([record]);assert.equal(h.spoken[0].voice,h.voice);
 h.spoken[0].onerror({error:"voice-unavailable"});
 assert.equal(h.spoken.length,1,"failure requires a fresh tap");
 h.button("Retry").onclick();assert.equal(h.spoken[1].voice,undefined);
 h.spoken[1].onerror({error:"synthesis-failed"});h.button("Retry").onclick();
 assert.equal(h.spoken[2].lang,"en-IN");
 h.spoken[2].onend();h.tick();
 assert.equal(h.spoken[3].lang,"en-IN","keep a working fallback across phrases");
}
{
 const h=setup({voice:"missing"});h.play([record]);assert.equal(h.spoken[0].lang,undefined);
 h.spoken[0].onerror({error:"not-allowed"});
 assert.ok(h.button("Retry"));h.button("Retry").onclick();
 assert.equal(h.spoken[1].lang,undefined,"permission errors keep the voice mode");
}
{
 const h=setup();h.play([record]);const old=h.spoken[0];h.tick();
 assert.match(h.status(),/did not start/);
 h.button("Retry").onclick();assert.equal(h.spoken.length,2);
 assert.equal(h.cancelCount(),1,"cancel a silent stale queue even if browser flags are clear");
 assert.equal(h.spoken[1].lang,"en-IN");
 old.onend();assert.equal(h.spoken.length,2);
}
{
 const h=setup({startImmediately:true});h.play([record]);h.tick();
 assert.match(h.status(),/speech stalled/,"a missing end event also times out");
 h.button("Retry").onclick();assert.equal(h.cancelCount(),1);
 assert.equal(h.spoken[1].text,h.spoken[0].text);
}
{
 const h=setup();h.play([record]);h.button("Test voice").onclick();
 h.spoken[1].onerror({error:"synthesis-failed"});h.button("Retry").onclick();
 assert.equal(h.spoken[2].text,h.spoken[1].text,"retry the test before resuming a paper");
 h.spoken[2].onend();assert.match(h.status(),/Voice test successful/);
 h.button("Resume").onclick();assert.equal(h.spoken[3].text,h.spoken[0].text);
}
{
 const h=setup();h.play([record,record]);const finishOld=h.spoken[0].onend;
 h.button("Next paper").onclick();finishOld();assert.equal(h.spoken.length,2);
 const finishNew=h.spoken[1].onend;
 h.events.pagehide();finishNew();assert.equal(h.spoken.length,2);
}
console.log("Abstract audio: 7 Android playback and recovery scenarios passed");
