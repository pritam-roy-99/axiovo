/* Optional math typesetting: source text remains inert and readable if CDN is unavailable. */
(function(){
"use strict";
let loading=null;
window.MathJax={tex:{inlineMath:[["\\(","\\)"],["$","$"]],displayMath:[["\\[","\\]"],["$$","$$"]],processEscapes:true},options:{skipHtmlTags:["script","noscript","style","textarea","pre","code"]},startup:{typeset:false}};
function load(){
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
  script.async=true;script.onload=resolve;script.onerror=()=>reject(Error("Math rendering unavailable"));
  document.head.append(script);
 });
 return loading;
}
function typeset(node){
 if(!node||!/(\\\\\(|\\\\\[|\\$)/.test(node.textContent||""))return;
 load().then(()=>window.MathJax.typesetPromise([node])).catch(()=>{
  node.title="Mathematical notation is shown as source LaTeX because the math renderer could not load.";
 });
}
window.AxiovoAssistantMath={typeset};
})();