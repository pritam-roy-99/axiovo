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
  const urls=[
   "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js",
   "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-chtml.min.js"
  ];
  function trySource(index){
   if(index>=urls.length){reject(Error("Both MathJax sources unavailable"));return}
   const script=document.createElement("script");
   script.src=urls[index];script.async=true;
   script.onload=()=>{
    if(typeof window.MathJax?.typesetPromise!=="function"){
     trySource(index+1);return;
    }
    Promise.resolve(window.MathJax.startup?.promise).then(resolve,reject);
   };
   script.onerror=()=>trySource(index+1);
   document.head.append(script);
  }
  trySource(0);
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