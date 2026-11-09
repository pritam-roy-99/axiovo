/* MathJax renderer for untrusted scholarly text. Never insert raw source as HTML. */
(function(){
"use strict";
let loader;
window.MathJax={
 tex:{inlineMath:[["\\(","\\)"],["$","$"]],displayMath:[["\\[","\\]"],["$$","$$"]],processEscapes:true},
 options:{skipHtmlTags:["script","noscript","style","textarea","pre","code"]},
 startup:{typeset:false}
};
function load(){
 if(loader)return loader;
 loader=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
  script.async=true;
  script.onload=()=>window.MathJax?.startup?.promise?.then(resolve,reject) || resolve();
  script.onerror=()=>reject(Error("MathJax CDN unavailable"));
  document.head.append(script);
 });
 return loader;
}
function normalize(source){
 let s=String(source||"");
 // Some scholarly feeds escape TeX backslashes a second time.
 s=s.replace(/\\\\(?=[()[\]{}]|(?:mathsf|mathrm|mathbf|mathbb|mathcal|frac|sqrt|alpha|beta|gamma|delta|theta|sigma|omega|sum|prod|left|right|text|begin|end)\b)/g,"\\");
 return s;
}
function typeset(node){
 if(!node)return;
 const original=node.textContent||"";
 const value=normalize(original);
 if(!/\$|\\\(|\\\[/.test(value))return;
 if(value!==original)node.textContent=value;
 load().then(()=>{
  if(!node.isConnected)return;
  return window.MathJax.typesetPromise([node]);
 }).catch(error=>{
  node.title="Equation formatting unavailable. Original LaTeX remains readable.";
  console.warn("Axiovo equation rendering:",error);
 });
}
window.AxiovoAssistantMath={typeset,normalize};
})();