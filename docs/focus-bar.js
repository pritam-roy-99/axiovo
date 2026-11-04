/* Single Discover hierarchy: main field -> research area -> specific interest.
 * Shared across latest arXiv announcements and arXiv-hosted scholarly discovery.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.ResearchLensFocusBar=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const KEY="researchlens-field-explorer-v1";
 const normalize=(state,fields,subtopics)=>{
  const field=fields.fieldKey(state?.field),spec=fields.FIELDS[field];
  const topic=spec.topics.includes(state?.topic)?state.topic:spec.topics[0];
  const available=fields.fieldTopics(field,topic);
  const subtopic=state?.subtopic&&(available.includes(state.subtopic)||state.customSubtopic)?state.subtopic:"";
  return {field,topic,subtopic};
 };
 function mount(){
  const Fields=window.ResearchLensFields,Interest=window.ResearchLensInterests,Custom=window.ResearchLensCustomTaxonomy;
  const root=document.getElementById("rl-focus-bar");
  if(!root||!Fields)return;
  const byId=id=>document.getElementById("rl-focus-"+id);
  const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  let prefs=load(KEY,{});
  let current=normalize(prefs,Fields);
  const fieldDetails=byId("field-details"),fieldTitle=byId("field-title");
  const fieldChoices=byId("fields"),areas=byId("areas"),subs=byId("subtopics");
  const headline=byId("headline"),hint=byId("hint"),trail=byId("trail"),custom=byId("custom"),apply=byId("apply");
  const followed=()=>Interest?.get(load(Interest.KEY,{}),current.field,current.topic)||[];
  function inform(message){
   let status=document.getElementById("rl-focus-editor-status");
   if(!status){status=document.createElement("p");status.id="rl-focus-editor-status";status.setAttribute("role","status");status.className="rl-focus-editor-status";root.append(status)}
   status.textContent=message;
  }
  function refreshTaxonomy(reason){
   current=normalize(current,Fields);
   render();emit(reason);
   window.dispatchEvent(new Event("axiovo:taxonomy-changed"));
  }
  function removeButton(label,act){
   const b=document.createElement("button");
   b.type="button";b.className="rl-focus-remove";b.textContent="×";
   b.setAttribute("aria-label",label);b.title=label;b.onclick=act;
   return b;
  }
  function inputRow(label,placeholder,act){
   const form=document.createElement("form");form.className="rl-focus-editor";
   const input=document.createElement("input");input.type="text";input.maxLength=100;
   input.placeholder=placeholder;input.setAttribute("aria-label",label);
   const b=document.createElement("button");b.type="submit";b.textContent="+ Add";
   form.append(input,b);
   form.onsubmit=e=>{e.preventDefault();const result=act(input.value);
     if(result?.ok)input.value="";else inform(result?.reason||"Unable to add item")};
   return form;
  }
  const emit=reason=>{
   const old=load(KEY,{});
   const query=current.subtopic||current.topic;
   write(KEY,{...old,...current,query,customSubtopic:!!current.subtopic&&!Fields.fieldTopics(current.field,current.topic).includes(current.subtopic)});
   window.dispatchEvent(new CustomEvent("researchlens:focus-change",{detail:{...current,query,reason}}));
  };
  function chooseField(id){
   const valid=Fields.fieldKey(id);
   if(valid===current.field){fieldDetails.open=false;return}
   current={field:valid,topic:Fields.FIELDS[valid].topics[0],subtopic:""};
   fieldDetails.open=false;render();emit("field")
  }
  function chooseTopic(topic){
   if(current.topic===topic&&current.subtopic===""){emit("topic");return}
   current={...current,topic,subtopic:""};render();emit("topic")
  }
  function chooseSubtopic(subtopic){
   current={...current,subtopic};render();emit("subtopic")
  }
  function toggleFollow(name){
   if(!Interest)return;
   const data=Interest.toggle(load(Interest.KEY,{}),current.field,current.topic,name);
   write(Interest.KEY,data);render();
   window.dispatchEvent(new Event("researchlens:interests-changed"));
  }
  function render(){
   const spec=Fields.FIELDS[current.field];
   fieldTitle.textContent=spec.name;
   fieldChoices.replaceChildren();
   for(const [key,definition] of Object.entries(Fields.FIELDS)){
    const button=document.createElement("button");button.type="button";button.className="rl-focus-choice";
    button.textContent=definition.name;button.setAttribute("aria-pressed",String(key===current.field));
    button.onclick=()=>chooseField(key);fieldChoices.append(button)
   }
   areas.replaceChildren();
   const followingTopics=Fields.FIELDS[current.field].topics.slice();
   for(const topic of followingTopics){
    const wrap=document.createElement("span");wrap.className="rl-focus-interest";
    const button=document.createElement("button");button.type="button";button.className="rl-focus-chip"+(topic===current.topic?" active":"");
    button.textContent=topic;button.setAttribute("aria-pressed",String(topic===current.topic));
    button.onclick=()=>chooseTopic(topic);wrap.append(button);
    if(Custom&&followingTopics.length>1)wrap.append(removeButton("Remove research area "+topic,()=>{
      if(!window.confirm("Remove "+topic+" from your research areas on this device? You can restore default suggestions."))return;
      if(Custom.removeArea(current.field,topic,localStorage)){
       inform("Removed research area: "+topic);
       refreshTaxonomy("area-removed");
      }
    }));
    areas.append(wrap);
   }
   if(Custom){
    areas.append(inputRow("New research area","Add your research area",name=>{
      const r=Custom.addArea(current.field,name,localStorage);
      if(r.ok){current={...current,topic:r.value,subtopic:""};
        inform("Added research area: "+r.value);refreshTaxonomy("area-added")}
      return r;
    }));
    const reset=document.createElement("button");reset.type="button";reset.className="rl-focus-restore";
    reset.textContent="Restore default areas and subtopics";
    reset.onclick=()=>{
      if(!window.confirm("Restore this field's default research topics? Your personal additions will be cleared."))return;
      Custom.restore(current.field,localStorage);
      inform("Default research areas and subtopics restored");refreshTaxonomy("restore");
    };
    areas.append(reset);
   }
   subs.replaceChildren();
   const picked=followed();
   const curated=Fields.fieldTopics(current.field,current.topic);
   const subtopics=Interest?Interest.order([...new Set([...curated,...picked])],picked):curated;
   const any=document.createElement("button");any.type="button";
   any.className="rl-focus-chip"+(!current.subtopic?" active":"");any.textContent="All "+current.topic;
   any.setAttribute("aria-pressed",String(!current.subtopic));any.onclick=()=>chooseSubtopic("");subs.append(any);
   for(const topic of subtopics){
    const wrap=document.createElement("span");wrap.className="rl-focus-interest";
    const btn=document.createElement("button");btn.type="button";btn.className="rl-focus-chip"+(topic===current.subtopic?" active":"");
    btn.textContent=topic;btn.setAttribute("aria-pressed",String(topic===current.subtopic));
    btn.onclick=()=>chooseSubtopic(topic);wrap.append(btn);
    const star=document.createElement("button");star.type="button";const isFollowing=picked.some(x=>x.toLowerCase()===topic.toLowerCase());
    star.className="rl-focus-star"+(isFollowing?" followed":"");
    star.textContent=isFollowing?"★":"☆";
    star.title=(isFollowing?"Unfollow ":"Follow ")+topic;
    star.setAttribute("aria-label",(isFollowing?"Unfollow ":"Follow ")+topic);
    star.setAttribute("aria-pressed",String(isFollowing));star.onclick=()=>toggleFollow(topic);
    wrap.append(star);
    if(Custom)wrap.append(removeButton("Remove subtopic "+topic,()=>{
      if(!window.confirm("Remove "+topic+" from this research area on your device?"))return;
      if(Custom.removeInterest(current.field,current.topic,topic,localStorage)){
       if(current.subtopic===topic)current={...current,subtopic:""};
       inform("Removed subtopic: "+topic);refreshTaxonomy("subtopic-removed");
      }
    }));
    subs.append(wrap);
   }
   headline.textContent="Explore "+spec.name;
   hint.textContent="Choose an area, then a subtopic. Search arXiv-hosted papers across historical records without the local feed's category limits.";
   trail.textContent=spec.name+"  ›  "+current.topic+(current.subtopic?"  ›  "+current.subtopic:"");
   const source=document.getElementById("rl-source-scholarly");
   if(source&&source.firstChild?.nodeType===Node.TEXT_NODE)source.firstChild.textContent="Explore "+spec.name+" ";
  }
  apply.textContent="Add subtopic";
  apply.onclick=()=>{
   const val=Interest?.clean(custom.value)||custom.value.trim().slice(0,100);
   if(val.length<3){custom.setCustomValidity("Enter at least three characters.");custom.reportValidity();return}
   const result=Custom?.addInterest(current.field,current.topic,val,localStorage);
   if(!result?.ok){custom.setCustomValidity(result?.reason||"Unable to add subtopic");custom.reportValidity();return}
   custom.setCustomValidity("");
   current={...current,subtopic:result.value};
   const existing=followed();
   if(Interest&&!existing.some(x=>x.toLowerCase()===result.value.toLowerCase())){
    write(Interest.KEY,Interest.toggle(load(Interest.KEY,{}),current.field,current.topic,result.value));
   }
   custom.value="";inform("Added subtopic: "+result.value);refreshTaxonomy("subtopic-added");
   window.dispatchEvent(new Event("researchlens:interests-changed"));
  };
  custom.addEventListener("input",()=>custom.setCustomValidity(""));
  custom.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();apply.click()}});
  document.addEventListener("pointerdown",e=>{if(!fieldDetails.contains(e.target))fieldDetails.open=false});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&fieldDetails.open)fieldDetails.open=false});
  window.addEventListener("researchlens:field-changed",e=>{
   const next=normalize({field:e.detail?.field,topic:e.detail?.topic},Fields);
   if(next.field===current.field&&next.topic===current.topic)return;
   current=next;render();emit("external");
  });
  window.addEventListener("axiovo:taxonomy-changed",()=>{
   const normalized=normalize(current,Fields);
   if(normalized.topic!==current.topic||normalized.subtopic!==current.subtopic){
    current=normalized;render();emit("taxonomy-updated");
   }else render();
  });
  window.addEventListener("storage",e=>{if(e.key===KEY||e.key===Interest?.KEY){current=normalize(load(KEY,{}),Fields);render()}});
  render();
  window.ResearchLensCurrentFocus=()=>({...current});
 }
 if(typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);
  else mount();
 }
 return {normalize};
});
