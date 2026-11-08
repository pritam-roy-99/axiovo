'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 const elements=[],timers=new Map();let id=0;
 const document={createElement(tag){const e={tag,textContent:'',children:[],setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(...v){this.children=v}};elements.push(e);return e},body:{append(){}}};
 const spoken=[];const synth={getVoices:()=>[{name:'English India',lang:'en-IN',voiceURI:'india'}],addEventListener(){},cancel(){spoken.at(-1)?.onerror({error:'interrupted'})},resume(){},pause(){throw Error('Do not use native Android pause')},speak(u){spoken.push(u)}};
 const context={document,window:{speechSynthesis:synth,SpeechSynthesisUtterance:class{}},SpeechSynthesisUtterance:class{constructor(text){this.text=text}},localStorage:{getItem(){return null},setItem(){}},Intl,console:{warn(){}},setTimeout(fn,ms){timers.set(++id,{fn,ms});return id},clearTimeout(i){timers.delete(i)}};
 vm.runInNewContext(fs.readFileSync('docs/abstract-audio.js','utf8'),context);
 return {play:context.window.AxiovoAbstractAudio.play,spoken,elements,tick(){const [id,t]=[...timers].sort((a,b)=>a[1].ms-b[1].ms)[0];timers.delete(id);t.fn()},button(label){return elements.find(e=>e.tag==='button'&&e.textContent===label)}};
}
const record={title:'Quantum paper',abstract:'First sentence. Second sentence.'};
{
 const h=setup();h.play([record]);assert.equal(h.spoken.length,1,'starts synchronously');
 const old=h.spoken[0];h.button('Pause').onclick();assert.ok(h.button('Resume'));
 old.onend();h.button('Resume').onclick();assert.equal(h.spoken.length,2);assert.equal(h.spoken[1].text,old.text);
 h.button('Stop').onclick();old.onend();assert.equal(h.spoken.length,2);
}
{
 const h=setup();h.play([record]);h.spoken[0].onerror({error:'voice-unavailable'});h.tick();
 assert.equal(h.spoken.length,2);assert.equal(h.spoken[1].voice,undefined);
 h.spoken[1].onend();h.tick();assert.equal(h.spoken[2].voice,undefined,'keep successful default for following phrases');
 h.spoken[2].onerror({error:'synthesis-failed'});assert.ok(h.button('Retry'));h.button('Retry').onclick();assert.equal(h.spoken[3].text,h.spoken[2].text);
}
{
 const h=setup();h.play([record]);h.spoken[0].onerror({error:'not-allowed'});assert.ok(h.button('Retry'));assert.equal(h.spoken.length,1);h.button('Retry').onclick();assert.equal(h.spoken.length,2);
}
{
 const h=setup();h.play([record]);h.tick();assert.ok(h.button('Retry'),'silent engine gets retry');h.button('Retry').onclick();assert.equal(h.spoken.length,2);
}
{
 const h=setup();h.play([record,record]);const old=h.spoken[0];h.button('Next paper').onclick();assert.equal(h.spoken.length,2);old.onend();assert.equal(h.spoken.length,2);
}
console.log('Abstract audio: 5 regression scenarios passed');
