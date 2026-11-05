/* One author at a time, with provenance and pagination for each archive. */
(function(){
"use strict";
const follow=window.AxiovoAuthorFollow, data=window.AxiovoArchiveData;
const $=id=>document.getElementById(id);
if(!follow||!data||!$("following"))return;
const author=$("following-author"),source=$("following-source"),results=$("following-results");
const names=Object.keys(data.names);
let controller=null, active=false, selected="";
function make(tag,value,cls){
 const node=document.createElement(tag);
 if(value!==undefined)node.textContent=value;
 if(cls)node.className=cls;
 return node;
}
function addButton(label,fn){
 const node=make("button",label,"rd-button rd-secondary");node.type="button";node.onclick=fn;return node;
}
function status(message){$("following-status").textContent=message}
function updateAuthors(preferred=selected){
 const authors=follow.list();
 author.replaceChildren(...authors.map(name=>new Option(name,name)));
 selected=authors.includes(preferred)?preferred:authors[0]||"";
 author.value=selected;
 const empty=!authors.length;
 $("following-empty").hidden=!empty;
 $("following-filters").hidden=empty;
 $("following-count").textContent=authors.length;
}
function paper(p){
 const card=make("article",undefined,"rd-result-card");
 const title=make("h4"),link=make("a",p.title);
 link.href=p.url;link.target="_blank";link.rel="noopener noreferrer";title.append(link);
 card.append(title,make("p",p.authors.slice(0,6).join(", ")+(p.date?" · "+p.date:""),"rd-small"));
 const save=addButton(data.saved(p)?"Saved to Library":"Save to Library",()=>{
  save.disabled=data.save(p);
  save.textContent=save.disabled?"Saved to Library":"Could not save";
 });
 save.disabled=data.saved(p);card.append(save);return card;
}
async function checkLane(archive,criteria,signal){
 const lane=make("section",undefined,"rd-panel");
 const message=make("p","Checking this archive…","rd-small");
 const list=make("div"),actions=make("div",undefined,"rd-actions");
 lane.append(make("h3",data.names[archive]),message,list,actions);results.append(lane);
 let records=[],cursor=null,visible=6;
 function render(){
  list.replaceChildren(...records.slice(0,visible).map(paper));actions.replaceChildren();
  if(records.length>visible)actions.append(addButton("Show more",()=>{visible+=6;render()}));
  if(cursor!=null)actions.append(addButton("Load more from source",()=>load(cursor)));
  const explore=make("a","Open archive search →","rd-text-link");
  explore.href="./"+archive+".html?"+new URLSearchParams({author:criteria.author,sort:"recent"});
  actions.append(explore);
 }
 async function load(next=null){
  const loadButton=actions.querySelector("button:last-of-type");if(loadButton)loadButton.disabled=true;
  try{
   const page=await data.live(archive,criteria,signal,next);
   if(signal.aborted)return;
   records=data.filter(data.merge(records,data.filter(page.papers,criteria)),criteria);
   cursor=page.next===next?null:page.next;
   if(next!=null)visible+=6;
   message.textContent=records.length+" matching record"+(records.length===1?"":"s")+" · "+page.provider+" and available snapshots";
  }catch{
   if(signal.aborted)return;
   message.textContent="Live lookup unavailable · "+records.length+" matching cached record"+(records.length===1?"":"s");
  }
  render();
 }
 const cache=data.snapshot(archive).then(snapshot=>{
  if(signal.aborted)return;
  records=data.filter(data.merge(records,data.filter(snapshot.papers,criteria)),criteria);render();
 });
 await Promise.all([cache,load()]);
}
async function refresh(){
 controller?.abort();results.replaceChildren();
 if(!active||!author.value)return;
 selected=author.value;
 controller=new AbortController();const {signal}=controller;
 const criteria={author:selected,sort:"recent"};
 const archives=names.includes(source.value)?[source.value]:names;
 status("Finding indexed papers by "+selected+"…");
 await Promise.all(archives.map(archive=>checkLane(archive,criteria,signal)));
 if(!signal.aborted)status("Showing available records for "+selected+" · name matches can include namesakes.");
}
function showTab(){
 const next=location.hash==="#following";
 $("following").hidden=!next;$("library-saved").hidden=next;
 $("library-tab-saved").setAttribute("aria-current",next?"false":"true");
 $("library-tab-following").setAttribute("aria-current",next?"true":"false");
 if(next&&!active){active=true;updateAuthors();refresh()}
 else if(!next){active=false;controller?.abort()}
}
$("following-form").onsubmit=e=>{
 e.preventDefault();
 const input=$("following-name"),name=input.value.trim();
 if(!name)return;
 if(follow.setFollowing(name,true)){
  input.value="";updateAuthors(follow.list().find(item=>item.toLowerCase()===name.toLowerCase())||name);refresh();
 }else status("Could not save this follow on this device.");
};
$("following-unfollow").onclick=()=>{
 const name=author.value;
 if(follow.setFollowing(name,false)){updateAuthors();refresh();if(!author.value)status("Unfollowed "+name+".")}
 else status("Could not update the following list.");
};
$("following-refresh").onclick=refresh;author.onchange=refresh;source.onchange=refresh;
window.addEventListener("hashchange",showTab);
window.addEventListener("storage",e=>{if(e.key===follow.KEY){updateAuthors();refresh()}});
updateAuthors();showTab();
})();
