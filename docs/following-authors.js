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
async function openAlexAuthorPapers(name,signal){
 const endpoint="https://api.openalex.org";
 const authorQuery=new URLSearchParams({search:follow.searchName(name),per_page:"15",
  select:"id,display_name,works_count,last_known_institutions"});
 const response=await fetch(endpoint+"/authors?"+authorQuery,{
  headers:{Accept:"application/json"},signal});
 if(!response.ok)throw Error("OpenAlex author lookup HTTP "+response.status);
 const people=(await response.json()).results||[];
 const candidates=people.filter(p=>p.id&&follow.matchesName(name,p.display_name)).slice(0,3);
 if(!candidates.length)return {papers:[],identity:"No confirmed matching OpenAlex author name"};
 const papers=[];
 for(const person of candidates){
  if(signal.aborted)break;
  const identifier=String(person.id).split("/").at(-1);
  if(!/^A\d+$/.test(identifier))continue;
  for(let page=1;page<=3&&!signal.aborted;page++){
   const query=new URLSearchParams({
    filter:"authorships.author.id:"+identifier,per_page:"100",page:String(page),
    sort:"publication_date:desc",
    select:"id,display_name,publication_date,authorships,locations,primary_location,best_oa_location,abstract_inverted_index"});
   const works=await fetch(endpoint+"/works?"+query,{headers:{Accept:"application/json"},signal});
   if(!works.ok)break;
   const published=(await works.json()).results||[];
   for(const work of published){
    const arxiv=window.AxiovoArxiv?.candidates(work)?.[0];
    if(!arxiv||!work.display_name)continue;
    const authorNames=(work.authorships||[]).map(a=>a.author?.display_name).filter(Boolean);
    if(!authorNames.some(a=>follow.matchesName(name,a)))continue;
    const index=work.abstract_inverted_index||{},positioned=[];
    for(const [word,positions] of Object.entries(index)){
     if(!Array.isArray(positions))continue;
     for(const pos of positions)if(Number.isInteger(pos)&&pos>=0&&pos<1500)positioned[pos]=word;
    }
    // Publication dates reported by OpenAlex are not necessarily arXiv v1 dates.
    const paper=data.normalize("arxiv",{
     id:arxiv.requested,title:work.display_name,authors:authorNames,
     date:work.publication_date,
     abstract:positioned.filter(Boolean).join(" ").slice(0,5000),
     provenance:"OpenAlex author identity, arXiv-linked work"});
    if(paper)papers.push(paper);
   }
   if(published.length<100||papers.length>=30)break;
  }
 }
 return {papers,identity:candidates.map(p=>p.display_name).join(" / ")};
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
   let current=next,provider="",checked=0;
   const seen=new Set();
   // Avoid false emptiness when a broad provider returns only namesakes
   // or unrelated papers on the first page. Constrain the request budget.
   while(!signal.aborted&&checked<3){
    if(seen.has(String(current??"initial")))break;
    seen.add(String(current??"initial"));
    const page=await data.live(archive,criteria,signal,current);
    if(signal.aborted)return;
    records=data.filter(data.merge(records,data.filter(page.papers,criteria)),criteria);
    const after=page.next===current?null:page.next;
    cursor=after;provider=page.provider;checked++;
    if(records.length>=6||after==null)break;
    current=after;
   }
   if(next!=null)visible+=6;
   message.textContent=records.length+" matching record"+(records.length===1?"":"s")+" · "+provider+
    " · "+checked+" source page"+(checked===1?"":"s")+" checked (name matches may include namesakes)";
  }catch{
   if(signal.aborted)return;
   message.textContent="Live lookup unavailable · "+records.length+" matching cached record"+(records.length===1?"":"s");
  }
  render();
 }
 const cache=data.snapshot(archive).then(snapshot=>{
  if(signal.aborted)return;
  records=data.filter(data.merge(records,data.filter(snapshot.papers,criteria)),criteria);render();
 }).catch(()=>{if(!signal.aborted)render()});
 await Promise.all([cache,load()]);
 if(archive==="arxiv"&&!signal.aborted&&records.length<6){
  try{
   message.textContent="Checking verified author identities and arXiv-linked works…";
   const expanded=await openAlexAuthorPapers(criteria.author,signal);
   if(signal.aborted)return;
   records=data.filter(data.merge(records,expanded.papers),criteria);
   message.textContent=records.length+" arXiv-linked matching papers. Author search checked "+
    expanded.identity+". OpenAlex records may have incomplete arXiv coverage and publication dates.";
   render();
  }catch(error){
   if(!signal.aborted)message.textContent=records.length+
    " matching cached/DataCite papers. OpenAlex identity lookup unavailable. Try again or use archive search.";
  }
 }
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
