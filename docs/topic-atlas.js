/* Curated Axiovo research paths layered on top of the archives' subject lists. */
(function(root){
"use strict";
const taxonomy=root.AxiovoArchiveTaxonomy;
const normalize=value=>String(value||"").normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const slug=value=>normalize(value).replaceAll(" ","-");
const options={};

function subjects(source){
 if(options[source])return options[source];
 const leaves=taxonomy.directory(source);
 const families=source==="arxiv"?taxonomy.arxiv.groups.flatMap(group=>group.areas.flatMap(area=>{
  const codes=area.subfields.filter(row=>row.official).map(row=>row.code);
  return codes.length?[{code:area.code,name:"All "+area.name,group:group.label,codes}]:[];
 })):[];
 const rows=[...families,...leaves].sort((a,b)=>a.name.localeCompare(b.name));
 const byCode=new Map(rows.map(row=>[row.code.toLowerCase(),row]));
 const groups=new Map(taxonomy[source].groups.map(group=>[group.label,[]]));
 for(const row of rows)groups.get(row.group).push(row);
 return options[source]={rows,groups,leaves,byCode};
}
function parse(text,source){
 const known=new Set(subjects(source).leaves.map(row=>row.code));
 const map=new Map();
 for(const line of text.split(/\r?\n/)){
  if(!line.trim()||line.startsWith("#"))continue;
  const [code,branches]=line.split("\t");
  if(!known.has(code)||map.has(code)||!branches)throw Error("Invalid topic catalog subject "+code);
  const topics=branches.split("|").map(branch=>{
   const [name,children]=branch.split(">");
   if(!name||!children)throw Error("Invalid topic in "+code);
   const leaves=children.split(";").map(child=>{
    const [label,...aliases]=child.split("~");
    return {id:slug(label),name:label,terms:[label,...aliases]};
   });
   if(leaves.some(leaf=>!leaf.id)||new Set(leaves.map(leaf=>leaf.id)).size!==leaves.length)throw Error("Invalid subtopics in "+code+" / "+name);
   return {id:slug(name),name,leaves};
  });
  if(new Set(topics.map(topic=>topic.id)).size!==topics.length)throw Error("Duplicate topics in "+code);
  map.set(code,topics);
 }
 if(map.size!==known.size)throw Error("Some archive subjects have no topic catalog");
 return map;
}
function catalogFor(catalog,subject,personal=[]){
 if(!subject)return [];
 const branches=new Map();
 for(const code of subject.codes||[subject.code])for(const row of catalog.get(code)||[]){
  const topic=branches.get(row.id)||{...row,leaves:[]};
  const leaves=new Map(topic.leaves.map(leaf=>[leaf.id,leaf]));
  for(const leaf of row.leaves){
   const previous=leaves.get(leaf.id);
   leaves.set(leaf.id,previous?{...leaf,terms:[...new Set([...previous.terms,...leaf.terms])]}:leaf);
  }
  topic.leaves=[...leaves.values()];branches.set(row.id,topic);
 }
 for(const row of personal.filter(entry=>entry.category===subject.code)){
  const id=slug(row.topic);
  const topic=branches.get(id)||{id,name:row.topic,leaves:[],personal:true};
  if(row.leaf&&!topic.leaves.some(leaf=>leaf.id===slug(row.leaf))){
   topic.leaves=[...topic.leaves,{id:slug(row.leaf),name:row.leaf,terms:[row.leaf],personal:true}];
  }
  branches.set(id,topic);
 }
 return [...branches.values()];
}
function makeIndex(source,catalog,personal=[]){
 const result=[];
 const make=(category,topic,leaf)=>{
  const label=leaf?.name||topic?.name||category.name;
  const detail=[category.name,topic?.name,leaf?.name].filter(Boolean).slice(0,-1).join(" › ");
  return {category:category.code,topic:topic?.id||"",subtopic:leaf?.id||"",label,detail,
   words:normalize([label,category.code,category.group,detail,...(leaf?.terms||[])].join(" ")),
   name:normalize(label),code:!topic?normalize(category.code):""};
 };
 for(const category of subjects(source).rows){
  result.push(make(category));
  for(const topic of catalogFor(catalog,category,personal)){
   // Official leaves are indexed under their own category. Broad families
   // retain a browsable merged tree without repeating every search suggestion.
   if(category.codes&&!topic.personal)continue;
   result.push(make(category,topic));
   for(const leaf of topic.leaves)result.push(make(category,topic,leaf));
  }
 }
 return result;
}
function find(index,query,limit=8){
 const q=normalize(query);
 if(!q)return [];
 const words=q.split(" ");
 return index.filter(row=>words.every(word=>row.words.includes(word))).map(row=>({
  row,score:(row.code===q?150:0)+(row.name===q?100:row.name.startsWith(q)?60:row.name.includes(q)?40:0)
   +words.filter(word=>row.name.includes(word)).length*4
 })).sort((a,b)=>b.score-a.score||a.row.label.localeCompare(b.row.label)).slice(0,limit).map(result=>result.row);
}
function terms(topic,leaf){
 if(leaf)return leaf.terms;
 if(!topic)return [];
 return [...new Set([topic.name,...topic.leaves.flatMap(child=>child.terms)])].slice(0,18);
}
root.AxiovoTopicAtlas={subjects,parse,catalogFor,makeIndex,find,slug,terms};
})(window);
