(function(){
"use strict";
const $=id=>document.getElementById(id),NS="http://www.w3.org/2000/svg";
function node(tag,text){const n=document.createElement(tag);if(text!=null)n.textContent=text;return n}
function svg(tag,attrs){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs||{}))n.setAttribute(k,String(v));return n}
const stop=new Set("the and for with this from that these using after based into results paper papers study studies research analysis novel quantum physics chemistry methods approach effect effects model models theory theoretical experimental between under an of on to in at a".split(" "));
function tokens(p){return new Set((String(p.title||"")+" "+String(p.abstract||"").slice(0,900)).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g)?.filter(x=>!stop.has(x))||[])}
function getPapers(){const api=window.AxiovoArchiveData;if(!api)return[];const out=[];for(const source of Object.keys(api.names)){try{out.push(...api.savedRecords(source))}catch{}}const seen=new Set();return out.filter(p=>{const key=p.source+":"+(p.recordId||p.url);if(seen.has(key))return false;seen.add(key);return p.title&&p.url}).slice(0,24)}
function render(){
const g=$("rh-graph"),status=$("rh-graph-status"),list=$("rh-graph-list");g.replaceChildren();list.replaceChildren();
const papers=getPapers();if(!papers.length){status.textContent="No saved papers here yet. Save a paper in Research Desk, then return to build your map.";const a=node("a","Open Research Desk");a.href="./desk.html";list.append(a);return}
const coords=papers.map((p,i)=>{const angle=i*2.399963229728653;const r=35+Math.sqrt(i/Math.max(1,papers.length))*142;return{x:380+r*Math.cos(angle),y:195+r*Math.sin(angle),p}});
const all=coords.map(x=>tokens(x.p));const edges=[];
for(let i=0;i<coords.length;i++)for(let j=i+1;j<coords.length;j++){const a=all[i],b=all[j];const shared=[...a].filter(k=>b.has(k));if(shared.length>=3)edges.push({i,j,shared:shared.slice(0,5)})}
for(const e of edges)g.append(svg("line",{x1:coords[e.i].x,y1:coords[e.i].y,x2:coords[e.j].x,y2:coords[e.j].y,class:"rh-edge"}));
coords.forEach(({x,y,p},i)=>{
const anchor=svg("a",{href:p.url,target:"_blank",rel:"noopener noreferrer"}),circle=svg("circle",{cx:x,cy:y,r:11,class:"rh-node",tabindex:"0","aria-label":"Open "+p.title});
const title=svg("title");title.textContent=p.title;circle.append(title);anchor.append(circle);
const label=svg("text",{x:x+13,y:y+3,class:"rh-node-label"});label.textContent=p.title.slice(0,25)+(p.title.length>25?"…":"");anchor.append(label);g.append(anchor);
const card=node("article");card.className="rh-paper";const strong=node("strong");const link=node("a",p.title);link.href=p.url;link.target="_blank";link.rel="noopener noreferrer";strong.append(link);card.append(strong);
const meta=node("p",(p.source||"archive")+" · "+(p.date||"date unknown"));card.append(meta);
const connected=edges.filter(e=>e.i===i||e.j===i);const rel=node("p",connected.length?connected.length+" potential topic-similarity connections.":"No strong topic similarity found among saved papers.");card.append(rel);list.append(card);
});
status.textContent=papers.length+" saved papers · "+edges.length+" lexical topic links (not citations). Click any node for its original source.";
}
function versions(e){e.preventDefault();const target=$("rh-version-result");target.replaceChildren();const raw=$("rh-version-id").value.trim();const p=window.AxiovoArxiv?.parse(raw);if(!p){target.textContent="Enter a valid arXiv identifier, for example 2611.01234 or 2611.01234v2.";return}
const a=node("a","Open official arXiv record");a.href=window.AxiovoArxiv.abs(p.requested);a.target="_blank";a.rel="noopener noreferrer";target.append(a);
const b=node("a","Open Axiovo paper notes and revision navigation");b.href="./paper.html?id="+encodeURIComponent(p.requested);target.append(b);
const note=node("small","The authoritative revision count and dates must be checked on arXiv.");target.append(note)}
$("rh-refresh").addEventListener("click",render);$("rh-version-form").addEventListener("submit",versions);window.addEventListener("axiovo-library-change",render);window.addEventListener("storage",render);render();
})();