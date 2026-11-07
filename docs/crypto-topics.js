/* Cryptology ePrint topic explorer. Works independently of paper metadata and search. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
function init(){
 if(window.AxiovoCryptoTopics?.ready)return;
 const field=$("crypto-field"),topic=$("crypto-topic"),leaf=$("crypto-subtopic");
 if(!field||!topic||!leaf)return;
 const taxonomy={
  "Quantum and post-quantum security":{
   "Quantum cryptography":[["Quantum key distribution","quantum key distribution"],["Device-independent QKD","device independent"],["Quantum authentication","quantum authentication"],["Quantum random number generation","quantum random"]],
   "Post-quantum cryptography":[["Lattice-based cryptography","lattice"],["Code-based cryptography","code based"],["Hash-based signatures","hash based"],["Isogeny-based cryptography","isogeny"]],
   "Quantum cryptanalysis":[["Quantum attacks","quantum attack"],["Grover's algorithm","Grover"],["Shor's algorithm","Shor"]]
  },
  "Foundations and primitives":{
   "Zero-knowledge proofs":[["SNARKs","SNARK"],["STARKs","STARK"],["Proof systems","proof system"]],
   "Digital signatures":[["Threshold signatures","threshold signature"],["Aggregate signatures","aggregate signature"],["Ring signatures","ring signature"]],
   "Encryption":[["Fully homomorphic encryption","homomorphic encryption"],["Attribute-based encryption","attribute based encryption"],["Functional encryption","functional encryption"]],
   "Hash functions":[["Collision resistance","collision"],["Hash-based commitments","commitment"],["Hash constructions","hash function"]]
  },
  "Secure computation and protocols":{
   "Secure multiparty computation":[["Two-party computation","two party computation"],["Secret sharing","secret sharing"],["Private set intersection","private set intersection"]],
   "Threshold cryptography":[["Threshold encryption","threshold encryption"],["Distributed key generation","distributed key generation"]],
   "Privacy and anonymous systems":[["Differential privacy","differential privacy"],["Anonymous credentials","anonymous credential"],["Private information retrieval","private information retrieval"]],
   "Blockchain and protocols":[["Consensus protocols","consensus"],["Smart contracts","smart contract"],["Zero-knowledge rollups","rollup"]]
  },
  "Cryptanalysis and implementation":{
   "Cryptanalysis":[["Side-channel attacks","side channel"],["Differential cryptanalysis","differential cryptanalysis"],["Fault attacks","fault attack"],["Algebraic attacks","algebraic attack"]],
   "Security proofs":[["Provable security","provable security"],["Reduction techniques","reduction"],["Random oracle model","random oracle"]],
   "Applied cryptography":[["Authenticated encryption","authenticated encryption"],["Key exchange","key exchange"],["Transport security","TLS"]]
  }
 };

 const storageKey="axiovo-eprint-topic-paths-v1";
 const clean=x=>String(x||"").trim().slice(0,90);
 const norm=x=>clean(x).normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const pickers=[];
 let saved=[],custom=[];
 try{
  const data=JSON.parse(localStorage.getItem(storageKey)||"{}");
  if(Array.isArray(data.saved))saved=data.saved.slice(0,30);
  if(Array.isArray(data.custom))custom=data.custom.slice(0,60);
 }catch{}
 function persist(){try{localStorage.setItem(storageKey,JSON.stringify({saved,custom}))}catch{report("Local storage is unavailable.")}}
 function report(text){const target=$("crypto-personal-status");if(target)target.textContent=text}
 function ensureCustom(){
  for(const row of custom){
   if(!row||!row.name)continue;
   if(row.kind==="subject"){
    if(!Object.hasOwn(taxonomy,row.name))taxonomy[row.name]={};
    continue;
   }
   if(!Object.hasOwn(taxonomy,row.field))continue;
   if(row.kind==="topic"){
    if(!Object.hasOwn(taxonomy[row.field],row.name))taxonomy[row.field][row.name]=[];
   }else if(row.kind==="subtopic"&&Object.hasOwn(taxonomy[row.field],row.topic)){
    const leaves=taxonomy[row.field][row.topic];
    if(!leaves.some(item=>item[1]===row.name))leaves.push([row.name,row.name]);
   }
  }
 }
 ensureCustom();
 function option(label,value){return new Option(label,value)}
 function sync(){for(const picker of pickers)picker.sync()}
 function fill(select,items,placeholder){
  select.replaceChildren(option(placeholder,""));
  for(const [label,value] of items)select.add(option(label,value));
  select.disabled=items.length===0;
  sync();
 }
 const path=()=>({field:field.value,topic:topic.value,subtopic:leaf.value});
 const pathKey=storageKey+"-current";
 function rememberPath(){try{localStorage.setItem(pathKey,JSON.stringify(path()))}catch{}}
 function restorePath(){try{return JSON.parse(localStorage.getItem(pathKey)||"null")||{}}catch{return {}}}
 function redrawChips(id,items,chosen,select){
  const target=$(id);if(!target)return;
  target.replaceChildren();
  for(const [label,value] of items){
   const button=document.createElement("button");button.type="button";button.className="ex-choice";
   button.textContent=label;button.setAttribute("aria-pressed",String(value===chosen));
   button.addEventListener("click",()=>select(value));
   target.append(button);
  }
  target.hidden=items.length===0;
 }
 function applyTopic(value="",subtopic=""){
  topic.value=Object.hasOwn(taxonomy[field.value]||{},value)?value:"";
  const items=taxonomy[field.value]?.[topic.value]||[];
  fill(leaf,items,"All sub-subtopics");
  if(items.some(row=>row[1]===subtopic))leaf.value=subtopic;
  redrawChips("crypto-topic-options",Object.keys(taxonomy[field.value]||{}).map(name=>[name,name]),topic.value,
   value=>{applyTopic(value);notify()});
  redrawChips("crypto-subtopic-options",items,leaf.value,
   value=>{leaf.value=value;sync();redrawChips("crypto-subtopic-options",items,leaf.value,v=>{leaf.value=v;sync();notify()});notify()});
  sync();
 }
 function applyField(value="",subfield="",subtopic=""){
  field.value=Object.hasOwn(taxonomy,value)?value:"";
  const names=Object.keys(taxonomy[field.value]||{});
  fill(topic,names.map(name=>[name,name]),field.value?"All research subfields":"Choose a subject first");
  applyTopic(subfield,subtopic);
  sync();
 }
 function notify(){
  const selected=leaf.selectedOptions[0]?.label||"";
  const pieces=[field.value,topic.value,leaf.value?selected:""].filter(Boolean);
  const scope=$("crypto-scope-label");
  if(scope)scope.textContent="Scope: "+(pieces.join(" › ")||"all indexed cryptography research")+".";
  rememberPath();
  renderSaved();
  document.dispatchEvent(new CustomEvent("axiovo:crypto-path-change",{detail:path()}));
 }
 function renderSaved(){
  const target=$("crypto-saved-paths");
  if(target){
   target.replaceChildren();
   for(const item of saved){
    if(!item?.field)continue;
    const row=document.createElement("div");row.className="ex-personal-row";
    const jump=document.createElement("button");jump.type="button";jump.className="rd-button rd-secondary";
    jump.textContent=[item.field,item.topic,item.label||item.subtopic].filter(Boolean).join(" › ");
    jump.onclick=()=>{applyField(item.field,item.topic,item.subtopic);notify()};
    const remove=document.createElement("button");remove.type="button";remove.className="rd-button rd-secondary";remove.textContent="Remove";
    remove.setAttribute("aria-label","Remove saved research path");
    remove.onclick=()=>{saved=saved.filter(p=>p!==item);persist();renderSaved()};
    row.append(jump,remove);target.append(row);
   }
  }
  const save=$("crypto-save-path");if(save)save.disabled=!field.value;
  const kind=$("crypto-custom-kind")?.value||"subject";
  const required=kind==="subject"||kind==="topic"&&!!field.value||kind==="subtopic"&&!!field.value&&!!topic.value;
  const button=$("crypto-custom-add");
  if(button){
   button.disabled=!required;
   button.textContent=kind==="subject"?"Add research subject":kind==="topic"?"Add research subfield":"Add sub-subtopic";
  }
  const hint=$("crypto-custom-hint");
  if(hint)hint.textContent=kind==="subject"
    ?"Create a personal research subject. It is not an official IACR category."
    :kind==="topic"
    ?field.value?"Add a subfield under "+field.value+".":"Select a research subject above before adding a subfield."
    :topic.value?"Add a sub-subtopic under "+topic.value+".":"Select a research subject and subfield above first.";
  const list=$("crypto-custom-list");
  if(list){
   list.replaceChildren();
   for(const entry of custom){
    const row=document.createElement("div");row.className="ex-personal-row";
    const label=document.createElement("span");
    label.textContent=[entry.field,entry.topic,entry.name].filter(Boolean).filter((x,i,arr)=>arr.indexOf(x)===i).join(" › ");
    const remove=document.createElement("button");remove.type="button";remove.className="rd-button rd-secondary";remove.textContent="Remove";
    remove.setAttribute("aria-label","Remove "+entry.name);
    remove.onclick=()=>{
     const current=path();custom=custom.filter(item=>item!==entry);persist();
     // Rebuild from the original curated taxonomy, deleting only user-added entries.
     if(entry.kind==="subject")delete taxonomy[entry.name];
     else if(entry.kind==="topic")delete taxonomy[entry.field]?.[entry.name];
     else if(taxonomy[entry.field]?.[entry.topic])
      taxonomy[entry.field][entry.topic]=taxonomy[entry.field][entry.topic].filter(x=>x[1]!==entry.name);
     applyField(current.field,current.topic,current.subtopic);notify();report("Personal research path removed.");
    };
    row.append(label,remove);list.append(row);
   }
  }
 }
 $("crypto-custom-kind")?.addEventListener("change",renderSaved);
 field.addEventListener("change",()=>{applyField(field.value);notify()});
 topic.addEventListener("change",()=>{applyTopic(topic.value);notify()});
 leaf.addEventListener("change",()=>{notify(); const rows=taxonomy[field.value]?.[topic.value]||[];
  redrawChips("crypto-subtopic-options",rows,leaf.value,v=>{leaf.value=v;sync();notify()})});
 const find=$("crypto-topic-find"),results=$("crypto-topic-suggestions");
 if(find&&results){
  find.addEventListener("input",()=>{
   const q=norm(find.value);results.replaceChildren();results.hidden=!q;if(!q)return;
   let count=0;
   for(const [subject,topics] of Object.entries(taxonomy)){
    for(const [subfield,items] of Object.entries(topics)){
     for(const [label,term] of [[subfield,""],...items]){
      if(![subject,subfield,label].some(x=>norm(x).includes(q)))continue;
      const b=document.createElement("button");b.type="button";
      const strong=document.createElement("strong");strong.textContent=label;
      const span=document.createElement("span");span.textContent=subject+" › "+subfield;
      b.append(strong,span);
      b.onclick=()=>{applyField(subject,subfield,term);find.value="";results.hidden=true;notify()};
      results.append(b);if(++count>=15)break;
     }if(count>=15)break;
    }if(count>=15)break;
   }
   if(!count){const p=document.createElement("p");p.textContent="No matching research paths.";results.append(p)}
  });
 }
 $("crypto-clear-path")?.addEventListener("click",()=>{applyField();notify()});
 $("crypto-show-results")?.addEventListener("click",()=>{notify();$("crypto-results-title")?.scrollIntoView({block:"start",behavior:"smooth"})});
 $("crypto-save-path")?.addEventListener("click",()=>{
  if(!field.value){report("Select a research subject first.");return}
  const selected=leaf.selectedOptions[0]?.label||"";
  const next={...path(),label:leaf.value?selected:""};
  if(!saved.some(p=>JSON.stringify(p)===JSON.stringify(next)))saved.unshift(next);
  saved=saved.slice(0,30);persist();renderSaved();report("Research path saved on this device.");
 });
 $("crypto-custom-form")?.addEventListener("submit",event=>{
  event.preventDefault();
  const name=clean($("crypto-custom").value),kind=$("crypto-custom-kind").value;
  if(!name){report("Enter a name for the new research path.");return}
  if(kind==="topic"&&!field.value){report("Select a research subject first.");return}
  if(kind==="subtopic"&&(!field.value||!topic.value)){report("Select a subject and subfield first.");return}
  if(kind==="subject"&&Object.keys(taxonomy).some(x=>norm(x)===norm(name))){report("Research subject already exists.");return}
  if(kind==="topic"&&Object.keys(taxonomy[field.value]).some(x=>norm(x)===norm(name))){report("Research subfield already exists.");return}
  if(kind==="subtopic"&&taxonomy[field.value][topic.value]?.some(row=>norm(row[0])===norm(name))){report("Sub-subtopic already exists.");return}
  const entry={field:kind==="subject"?name:field.value,topic:kind==="subtopic"?topic.value:"",kind,name};
  custom.push(entry);custom=custom.slice(-60);
  ensureCustom();
  const current=path();
  fill(field,Object.keys(taxonomy).map(label=>[label,label]),"All cryptography research");
  if(kind==="subject")applyField(name);
  else if(kind==="topic")applyField(current.field,name);
  else applyField(current.field,current.topic,name);
  $("crypto-custom").value="";
  persist();notify();
  report((kind==="subject"?"Research subject":kind==="topic"?"Research subfield":"Sub-subtopic")+" added. This is a personal keyword search path, not an official IACR classification.");
 });
 fill(field,Object.keys(taxonomy).map(name=>[name,name]),"All cryptography research");
 const params=new URLSearchParams(location.search);
 const previous=restorePath();
 applyField(params.get("field")||previous.field||"",params.get("topic")||previous.topic||"",params.get("subtopic")||previous.subtopic||"");
 if(window.AxiovoSearchableSelect?.mount){
  for(const [node,label] of [[field,"Research subject"],[topic,"Research subfield"],[leaf,"Sub-subtopic"]]){
   try{pickers.push(window.AxiovoSearchableSelect.mount(node,label))}catch(error){console.error("ePrint searchable chooser",error)}
  }
  sync();
 }
 window.AxiovoCryptoTopics={ready:true,select:applyField,clear:()=>{applyField();notify()},path,refresh:notify};
 notify();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();