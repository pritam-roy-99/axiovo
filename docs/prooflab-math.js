/* Safe research math rendering. Model output is never parsed as raw HTML. */
(function(){
"use strict";
const math=()=>window.AxiovoAssistantMath;
const lineFormula=/^(?:\\(?:begin\{(?:align|equation|gather|multline|aligned|cases|matrix|pmatrix)\*?\}|frac\b|dfrac\b|sqrt\b|sum\b|prod\b|langle\b|left\b|sigma\b|rho\b|psi\b)|(?:[A-Za-z][\w]*_\{?\d+\}?).*(?:=|\\(?:frac|sigma|sqrt)))/;
function el(tag,value,cls){const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=value;return n;}
function normalizeTeX(source){
 const s=math()?.normalize(String(source||""))||String(source||"");
 return s.replace(/(\\begin\{((?:align|equation|gather|multline|aligned|cases|matrix|pmatrix)\*?)\}[\s\S]*?\\end\{\2\})/g,(whole)=>"\\["+whole+"\\]");
}
function blocks(source){
 const lines=String(source||"").replace(/\r\n?/g,"\n").split("\n");
 const output=[];let prose=[],fence=null,display=null;
 const flush=()=>{if(prose.length){output.push({kind:"paragraph",text:prose.join("\n")});prose=[];}};
 for(const line of lines){
  const t=line.trim();
  if(fence!==null){if(/^\x60{3,}/.test(t)){output.push({kind:"code",text:fence.join("\n")});fence=null;}else fence.push(line);continue;}
  if(/^\x60{3,}/.test(t)){flush();fence=[];continue;}
  if(display!==null){display.push(line);if(t.includes("\\]")||t.endsWith("$$")){output.push({kind:"display",text:display.join("\n")});display=null;}continue;}
  if(t.startsWith("\\[")||t.startsWith("$$")){
   flush();
   if((t.startsWith("\\[")&&t.includes("\\]",2))||(t.startsWith("$$")&&t.endsWith("$$")&&t.length>4)){output.push({kind:"display",text:t});}
   else display=[line];
   continue;
  }
  if(!t){flush();continue;}
  const heading=t.match(/^(#{1,4})\s+(.+)$/);
  if(heading){flush();output.push({kind:"heading",level:Math.min(heading[1].length+2,6),text:heading[2]});continue;}
  const bullet=t.match(/^(?:[-*•]\s+|\d+[.)]\s+)(.+)$/);
  if(bullet){flush();output.push({kind:"bullet",text:bullet[1]});continue;}
  if(lineFormula.test(t)&&!/[.!?]\s+\w/.test(t)){flush();output.push({kind:"math",text:t});continue;}
  prose.push(line);
 }
 if(fence!==null)output.push({kind:"code",text:fence.join("\n")});
 if(display!==null)output.push({kind:"display",text:display.join("\n")});
 flush();return output;
}
function render(target,source){
 if(!target)return;
 const frag=document.createDocumentFragment();
 for(const b of blocks(normalizeTeX(source))){
  if(b.kind==="heading")frag.append(el("h"+b.level,b.text,"prooflab-message-heading"));
  else if(b.kind==="code")frag.append(el("pre",b.text,"prooflab-message-code"));
  else if(b.kind==="math")frag.append(el("div","\\["+b.text+"\\]","prooflab-equation"));
  else if(b.kind==="display")frag.append(el("div",b.text,"prooflab-equation"));
  else if(b.kind==="bullet")frag.append(el("p","• "+b.text,"prooflab-message-list-item"));
  else frag.append(el("p",b.text,"prooflab-message-paragraph"));
 }
 target.replaceChildren(frag);
 math()?.typeset(target);
}
window.AxiovoProofLabMath={render,blocks,normalizeTeX};
})();