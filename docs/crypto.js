/* IACR ePrint Discover: source-linked local metadata, not fabricated remote search. */
(function(){
 "use strict";
 const data=window.AxiovoArchiveData,$=id=>document.getElementById(id);
 if(!data)return;
 let papers=[],shown=[],page=1,loaded=false,stamp="",complete=false;
 const form=$("crypto-search-form");
 const fields=["query","field","topic","subtopic","author","sort","from","to"];
 function el(tag,text,cls){
  const e=document.createElement(tag);
  if(text!==undefined)e.textContent=text;
  if(cls)e.className=cls;
  return e;
 }
 function link(label,url){const a=el("a",label);a.href=url;return a}

 // Axiovo-curated search hierarchy, not official IACR categories.
 // Refinements match indexed titles/abstracts using the shared source matcher.
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
 const $field=$("crypto-field"),$topic=$("crypto-topic"),$leaf=$("crypto-subtopic");
 const selectors=[];
 function setOptions(node,rows,placeholder){
  node.replaceChildren(new Option(placeholder,""));
  for(const [label,value] of rows)node.add(new Option(label,value));
  node.disabled=!rows.length;
  for(const picker of selectors)picker.sync();
 }
 function populateFields(){
  $field.replaceChildren(new Option("All cryptography research",""));
  for(const name of Object.keys(taxonomy))$field.add(new Option(name,name));
 }
 function updateScope(){
  const field=$field.value,topic=$topic.selectedOptions[0]?.textContent||"";
  const leaf=$leaf.selectedOptions[0]?.textContent||"";
  $("crypto-scope-label").textContent="Scope: "+([field,($topic.value?topic:""),($leaf.value?leaf:"")].filter(Boolean).join(" › ")||"all indexed cryptography research")+".";
 }
 function chooseField(value,topic="",leaf=""){
  $field.value=Object.hasOwn(taxonomy,value)?value:"";
  setOptions($topic,$field.value?Object.keys(taxonomy[$field.value]).map(name=>[name,name]):[],"All research subfields");
  if(topic&&[...$topic.options].some(o=>o.value===topic))$topic.value=topic;
  chooseTopic($topic.value,leaf);updateScope();
 }
 function chooseTopic(value,leaf=""){
  if(value&&[...$topic.options].some(o=>o.value===value))$topic.value=value;
  const rows=taxonomy[$field.value]?.[$topic.value]||[];
  setOptions($leaf,rows,"All sub-subtopics");
  if(leaf&&[...$leaf.options].some(o=>o.value===leaf))$leaf.value=leaf;
  renderChips("crypto-topic-options",Object.keys(taxonomy[$field.value]||{}),label=>{chooseTopic(label);search()});
  renderChips("crypto-subtopic-options",rows.map(row=>row[0]),label=>{
   const found=rows.find(row=>row[0]===label);
   if(found)$leaf.value=found[1];search();
  });
  updateScope();
 }
 function renderChips(id,labels,handler){
  const container=$(id);container.replaceChildren();
  for(const label of labels){
   const b=el("button",label,"ex-choice");b.type="button";
   const active=id==="crypto-topic-options"?label===$topic.value:label===$leaf.selectedOptions[0]?.textContent;
   b.setAttribute("aria-pressed",String(active));b.onclick=()=>handler(label);
   container.append(b);
  }
  container.hidden=!labels.length;
 }
 function findTopics(){
  const q=$("crypto-topic-find").value.trim().toLowerCase(),target=$("crypto-topic-suggestions");
  target.replaceChildren();target.hidden=!q;
  if(!q)return;
  let matches=0;
  for(const [field,topics] of Object.entries(taxonomy)){
   for(const [topic,leaves] of Object.entries(topics)){
    const candidates=[{label:topic,leaf:""},...leaves.map(row=>({label:row[0],leaf:row[1]}))];
    for(const candidate of candidates){
     if(![field,topic,candidate.label].some(s=>s.toLowerCase().includes(q)))continue;
     const b=el("button",undefined);b.type="button";
     b.append(el("strong",candidate.label),el("span",field+" › "+topic));
     b.onclick=()=>{chooseField(field,topic,candidate.leaf);target.hidden=true;$("crypto-topic-find").value="";search()};
     target.append(b);if(++matches>=15)break;
    }if(matches>=15)break;
   }if(matches>=15)break;
  }
  if(!matches)target.append(el("p","No matching research paths.","rd-small"));
 }
 populateFields();
 $field.addEventListener("change",()=>{chooseField($field.value);search()});
 $topic.addEventListener("change",()=>{chooseTopic($topic.value);search()});
 $leaf.addEventListener("change",()=>{updateScope();search()});
 $("crypto-topic-find").addEventListener("input",findTopics);
 $("crypto-show-results").onclick=()=>{
  search();$("crypto-results-title").scrollIntoView({block:"start",behavior:"smooth"});
 };
 $("crypto-clear-path").onclick=()=>{chooseField("");search()};
 if(window.AxiovoSearchableSelect){
  for(const [node,placeholder] of [[$field,"Research subject"],[$topic,"Research subfield"],[$leaf,"Sub-subtopic"]]){
   selectors.push(window.AxiovoSearchableSelect.mount(node,placeholder));
  }
 }
 function filters(){
  return {q:$("crypto-query").value.trim(),author:$("crypto-author").value.trim(),
   topicTerms:$leaf.value?[$leaf.value]:$topic.value?[$topic.value]:[],
   from:$("crypto-from").value,to:$("crypto-to").value,
   sort:$("crypto-sort").value};
 }
 function fromURL(){
  const qs=new URLSearchParams(location.search);
  const field=qs.get("field")||"";const topic=qs.get("topic")||"";const leaf=qs.get("subtopic")||"";
  chooseField(field,topic,leaf);
  for(const key of fields){
   if(["field","topic","subtopic"].includes(key))continue;
   const value=qs.get(key);
   if(value!==null){
    const input=$("crypto-"+key);
    if(input?.tagName==="SELECT"&&![...input.options].some(o=>o.value===value))continue;
    if(input)input.value=value;
   }
  }
 }
 function updateURL(){
  const p=new URLSearchParams();
  for(const k of fields){
   const v=$("crypto-"+k)?.value?.trim();
   if(v&&!(k==="sort"&&v==="relevance"))p.set(k,v);
  }
  history.replaceState(null,"",location.pathname+(p.size?"?"+p:""));
 }
 function render(){
  const target=$("crypto-results");target.replaceChildren();
  const nav=$("crypto-pagination");nav.replaceChildren();
  const status=$("crypto-results-status");
  if(!loaded){
   status.textContent="Checking indexed IACR metadata…";
   target.append(el("p","Loading verified-source snapshot…","rd-small"));return;
  }
  const c=filters();
  $("crypto-result-sort").value=c.sort;
  if(c.from&&c.to&&c.from>c.to){
   status.textContent="Choose an end date on or after the start date.";return;
  }
  // The existing archive matcher is reused for exact-ID, dates and authors.
  // Theme selections are a transparent keyword refinement, NOT provider taxonomy.
  shown=data.filter(papers,c);
  if(c.sort==="title")shown.sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
  const perPage=12;
  const total=shown.length,pages=Math.max(1,Math.ceil(total/perPage));
  page=Math.max(1,Math.min(page,pages));
  const visible=shown.slice((page-1)*perPage,page*perPage);
  status.textContent=total+" of "+papers.length+" indexed IACR records match. "+
   (complete?"Completed all available OAI metadata-date windows. Some source records may not be exposed.":"Coverage is partial; not all historical papers are indexed.");
  if(!total){
   target.append(el("p","No match in Axiovo's available IACR metadata. This does not mean the original archive has no such paper.","rd-small"));
   const official=link("Search IACR ePrint directly ↗","https://eprint.iacr.org/search");
   official.target="_blank";official.rel="noopener";target.append(official);
   return;
  }
  for(const p of visible){
   const article=el("article",undefined,"crypto-paper");
   const head=el("div",undefined,"crypto-paper-heading");
   const id=el("small","IACR ePrint "+p.recordId+" · "+(p.date||"Source date not provided"),"crypto-paper-id");
   const h3=el("h3");
   const a=link(p.title,p.url);a.target="_blank";a.rel="noopener noreferrer";
   h3.append(a);head.append(id,h3);article.append(head);
   article.append(el("p",p.authors.join(", ")||"Authors not provided by source","crypto-paper-authors"));
   if(p.abstract){const abs=el("details");abs.append(el("summary","Read original abstract"),el("p",p.abstract));article.append(abs)}
   const actions=el("div",undefined,"crypto-paper-actions");
   const save=el("button",data.saved(p)?"★ Saved":"☆ Save","rd-button rd-secondary");
   save.type="button";save.setAttribute("aria-pressed",String(data.saved(p)));
   save.onclick=()=>{
    const yes=data.saved(p);const ok=yes?data.unsave(p):data.save(p);
    if(!ok){$("crypto-results-status").textContent="Could not update Library storage.";return}
    save.textContent=yes?"☆ Save":"★ Saved";
    save.setAttribute("aria-pressed",String(!yes));
   };
   const compare=el("button","Add to comparison","rd-button rd-secondary");
   compare.type="button";compare.onclick=()=>{
    const outcome=data.addComparison(p);
    compare.textContent=outcome==="full"?"Comparison full (5 papers)":outcome==="unavailable"?"Storage unavailable":"Added to comparison";
   };
   const assistant=link("Research Assistant","./copilot.html?id="+encodeURIComponent("eprint:"+p.id));
   assistant.className="rd-button rd-secondary";
   if(p.abstract&&window.AxiovoAbstractAudio){
    const listen=el("button","Listen to abstract","rd-button rd-secondary");
    listen.type="button";listen.onclick=()=>window.AxiovoAbstractAudio.play([p]);
    actions.append(listen);
   }
   const original=link("Original record ↗",p.url);original.target="_blank";original.rel="noopener";
   original.className="rd-button rd-secondary";
   actions.append(save,compare,assistant,original);article.append(actions);
   window.AxiovoCitationEvidence?.add(article,p);
   target.append(article);
  }
  if(pages>1){
   const previous=el("button","← Previous","rd-button rd-secondary");
   const next=el("button","Next →","rd-button rd-secondary");
   previous.disabled=page===1;next.disabled=page===pages;
   previous.onclick=()=>{page--;render();target.scrollIntoView({block:"start"})};
   next.onclick=()=>{page++;render();target.scrollIntoView({block:"start"})};
   nav.append(previous,el("span","Page "+page+" of "+pages),next);
  }
 }
 function search(){
  page=1;updateURL();render();
 }
 form.addEventListener("submit",e=>{e.preventDefault();search()});
 for(const key of ["sort","from","to"])
  $("crypto-"+key).addEventListener("change",search);
 $("crypto-result-sort").addEventListener("change",()=>{$("crypto-sort").value=$("crypto-result-sort").value;search()});
 $("crypto-latest").onclick=()=>{$("crypto-from").value="";$("crypto-to").value="";$("crypto-sort").value="recent";search()};
 $("crypto-week").onclick=()=>{const d=new Date();$("crypto-to").value=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()-7);$("crypto-from").value=d.toISOString().slice(0,10);search()};
 $("crypto-date-open").onclick=()=>{$("crypto-advanced").open=true;$("crypto-from").focus()};
 $("crypto-reset").onclick=()=>{
  chooseField("");
  for(const key of ["query","author","sort","from","to"])$("crypto-"+key).value=key==="sort"?"relevance":"";
  search();
 };
 $("crypto-follow").onclick=()=>{
  const term=$leaf.value||$topic.value||$field.value;
  if(!term){$("crypto-results-status").textContent="Choose a research topic to follow.";return}
  const api=window.AxiovoFeedPreferences;
  if(!api||!api.updateTopic(localStorage,term,true)){
   $("crypto-results-status").textContent="Could not save your topic follow.";return
  }
  $("crypto-results-status").textContent="Following "+term+" in My Feed. Current search results remain available.";
 };
 window.addEventListener("storage",e=>{if(e.key==="axiovo-eprint-reading-v1")render()});
 fromURL();
 data.snapshot("eprint").then(value=>{
  papers=Array.isArray(value.papers)?value.papers:[];
  stamp=value.stamp;complete=value.fullOaiTraversal===true;loaded=true;
  $("crypto-coverage-count").textContent=papers.length+" verified-source records indexed"+
   (stamp?" · updated "+stamp.slice(0,10):"")+(complete?" · full available OAI history traversed":" · history incomplete");
  render();
 }).catch(()=>{
  loaded=true;papers=[];
  $("crypto-coverage-count").textContent="IACR metadata unavailable · official archive remains accessible";
  render();
 });
})();
