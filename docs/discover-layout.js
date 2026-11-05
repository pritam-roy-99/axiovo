/* Progressive disclosure for Axiovo Discover.
 * This changes presentation only. Existing IDs, forms, buttons, event listeners,
 * state, network requests and source dates are preserved.
 */
(function(){
"use strict";
function disclosure(parent, children, label, name, initiallyOpen=false){
 if(!parent||!children.length)return null;
 const d=document.createElement("details");
 d.className="axiovo-discover-details "+name;
 if(initiallyOpen)d.open=true;
 const summary=document.createElement("summary");
 summary.textContent=label;
 d.append(summary);
 const inner=document.createElement("div");inner.className="axiovo-discover-details-content";
 children[0].before(d);
 for(const node of children)inner.append(node);
 d.append(inner);
 return d;
}
function init(){
 if(!document.body.classList.contains("axiovo-discover"))return;
 const focus=document.getElementById("rl-focus-bar");
 const subrow=focus?.querySelector(".rl-focus-subrow");
 if(focus&&subrow)disclosure(focus,[subrow],"Refine subtopics and add interests","axiovo-advanced-focus");
 const provider=document.querySelector(".axiovo-provider-line");
 if(provider)disclosure(provider.parentElement,[provider],"Additional research sources","axiovo-additional-sources");
 const arxiv=document.getElementById("arxiv-discovery");
 const sourceNotice=arxiv?.querySelector(".rl-source-notice");
 if(sourceNotice)disclosure(arxiv,[sourceNotice],"Index coverage and historical search help","axiovo-index-help");
 const feedAside=arxiv?.querySelector(".layout > aside");
 if(feedAside&&feedAside.children.length){
  const children=Array.from(feedAside.children);
  disclosure(feedAside,children,"Recommendations, index status and advanced actions","axiovo-feed-tools");
 }
 const scholar=document.getElementById("scholarly-discovery");
 const toolkit=scholar?.querySelector(".tools-panel");
 if(toolkit&&toolkit.children.length)
  disclosure(toolkit,Array.from(toolkit.children),"Saved papers and research toolkit","axiovo-scholar-tools");
 const searchForm=document.getElementById("scholar-search-form");
 const datebar=searchForm?.querySelector(".datebar");
 if(datebar){
  const d=disclosure(searchForm,[datebar],"Date range filters (optional)","axiovo-date-filters");
  const from=document.getElementById("scholar-from"),to=document.getElementById("scholar-to");
  function sync(){if(d&&(from?.value||to?.value))d.open=true}
  from?.addEventListener("change",sync);
  to?.addEventListener("change",sync);
  sync();
 }
 const focusTrail=document.getElementById("rl-focus-trail");
 if(focusTrail)focusTrail.setAttribute("aria-label","Current field and research area");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();