/* Editable chooser for the existing options of a native select. */
(function(){
"use strict";
const fold=value=>value.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
function element(tag,cls){
 const node=document.createElement(tag);node.className=cls;return node;
}
function mount(select,placeholder){
 const label=select.labels[0],name=label?.textContent.replace(/^\s*\d+\s*/,"").trim()||placeholder;
 const picker=element("div","ex-picker");
 const input=element("input","ex-picker-input"),toggle=element("button","ex-picker-toggle");
 const popup=element("div","ex-picker-popup"),list=element("div","ex-picker-list");
 const status=element("p","ex-picker-status");
 input.id=select.id+"-input";
 input.type="text";input.autocomplete="off";input.spellcheck=false;
 input.setAttribute("role","combobox");input.setAttribute("aria-autocomplete","list");
 input.setAttribute("aria-controls",select.id+"-listbox");
 input.setAttribute("aria-expanded","false");
 if(label)label.htmlFor=input.id;
 else input.setAttribute("aria-label",name);
 toggle.type="button";toggle.tabIndex=-1;
 toggle.setAttribute("aria-label","Show "+name+" choices");
 list.id=select.id+"-listbox";list.setAttribute("role","listbox");list.setAttribute("aria-label",name);
 status.setAttribute("role","status");
 popup.append(list,status);popup.hidden=true;
 picker.append(input,toggle,popup);
 select.insertAdjacentElement("afterend",picker);
 select.hidden=true;

 let opened=false,options=[],matches=[],rows=[],active=-1;
 function showSelection(){
  input.value=select.selectedOptions[0]?.label||"";
 }
 function highlight(index,scroll=false){
  rows[active]?.removeAttribute("data-active");
  active=index;
  const row=rows[active];
  if(!row){input.removeAttribute("aria-activedescendant");return}
  row.setAttribute("data-active","");
  input.setAttribute("aria-activedescendant",row.id);
  if(scroll){
   const visible=list.getBoundingClientRect(),target=row.getBoundingClientRect();
   if(target.top<visible.top)list.scrollTop+=target.top-visible.top;
   if(target.bottom>visible.bottom)list.scrollTop+=target.bottom-visible.bottom;
  }
 }
 function render(){
  const query=fold(input.value),terms=query.split(" ").filter(Boolean);
  matches=query?options.filter(option=>terms.every(term=>option.words.some(word=>
   word.startsWith(term)||(term.length>=3&&word.includes(term))))).sort((a,b)=>
    Number(b.code===query)-Number(a.code===query)||
    Number(b.title.startsWith(query))-Number(a.title.startsWith(query))):options;
  const fragment=document.createDocumentFragment();
  let group="",container=fragment;
  rows=matches.map((option,i)=>{
   if(!query&&option.group!==group){
    group=option.group;
    container=group?element("div","ex-picker-group"):fragment;
    if(group){
     container.setAttribute("role","group");container.setAttribute("aria-label",group);
     const heading=element("span","ex-picker-group-label");
     heading.textContent=group;heading.setAttribute("aria-hidden","true");
     container.append(heading);fragment.append(container);
    }
   }
   const row=element("div","ex-picker-option");
   row.id=list.id+"-"+i;row.dataset.index=i;row.setAttribute("role","option");
   row.setAttribute("aria-selected",String(option.value===select.value));
   row.textContent=option.label;container.append(row);return row;
  });
  list.replaceChildren(fragment);list.scrollTop=0;active=-1;
  status.classList.toggle("rd-sr-only",matches.length>0);
  status.textContent=matches.length?matches.length+" choices available":"No matching choices.";
  const selected=matches.findIndex(option=>option.value===select.value);
  highlight(matches.length?(query?0:Math.max(0,selected)):-1,true);
 }
 function open(query=""){
  if(opened||select.disabled)return;
  opened=true;popup.hidden=false;input.setAttribute("aria-expanded","true");
  toggle.setAttribute("aria-label","Hide "+name+" choices");
  input.value=query;input.placeholder=placeholder;render();
 }
 function close(){
  if(!opened)return;
  opened=false;popup.hidden=true;input.setAttribute("aria-expanded","false");
  input.removeAttribute("aria-activedescendant");
  toggle.setAttribute("aria-label","Show "+name+" choices");
  input.placeholder="";showSelection();
 }
 function sync(){
  input.disabled=toggle.disabled=select.disabled;
  options=Array.from(select.options).filter(option=>!option.disabled&&!option.parentElement.disabled).map(option=>({
   label:option.label,value:option.value,code:fold(option.value),title:fold(option.label),
   words:fold(option.label+" "+option.value).split(" "),
   group:option.parentElement.tagName==="OPTGROUP"?option.parentElement.label:""
  }));
  if(select.disabled)close();
  if(opened)render();else showSelection();
 }
 function choose(index){
  const option=matches[index];
  if(!option)return;
  const changed=select.value!==option.value;
  select.value=option.value;close();
  if(changed)select.dispatchEvent(new Event("change",{bubbles:true}));
 }
 input.addEventListener("click",()=>open());
 input.addEventListener("input",event=>{
  if(event.isComposing)return;
  if(opened)render();else open(input.value);
 });
 input.addEventListener("compositionstart",()=>open());
 input.addEventListener("compositionend",()=>{if(opened)render();else open(input.value)});
 input.addEventListener("keydown",event=>{
  if(event.isComposing)return;
  if(event.key==="ArrowDown"||event.key==="ArrowUp"){
   event.preventDefault();
   if(!opened)open();
   else if(matches.length)highlight(Math.max(0,Math.min(matches.length-1,active+(event.key==="ArrowDown"?1:-1))),true);
  }else if(event.key==="Enter"&&opened){event.preventDefault();choose(active)}
  else if(event.key==="Escape"&&opened){event.preventDefault();close();input.select()}
  else if(event.key==="Tab")close();
  else if(!opened&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&
   (event.key.length===1||event.key==="Backspace"||event.key==="Delete"))open();
 });
 picker.addEventListener("mousedown",event=>{
  if(event.target===toggle||event.target.closest("[role=option]"))event.preventDefault();
 });
 toggle.addEventListener("click",()=>{if(opened){close();input.select()}else{input.focus();open()}});
 list.addEventListener("click",event=>{
  const row=event.target.closest("[role=option]");
  if(row)choose(Number(row.dataset.index));
 });
 document.addEventListener("click",event=>{if(!picker.contains(event.target))close()},true);
 sync();
 return {sync,focus:()=>input.focus()};
}
window.AxiovoSearchableSelect={mount};
})();
