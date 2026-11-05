/* Conservative extractive research metadata for side-by-side paper comparison.
 * Each reported field is a literal substring of the supplied abstract.
 * No generated claims and no inference about absent datasets or code.
 */
(function(root,factory){
 "use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoEvidenceExtract=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const fields=[
  ["Research question",/\b(we (study|investigate|examine|address|explore)|this (study|work|paper) (investigates|examines|addresses|studies))\b/i],
  ["Method",/\b(we (use|employ|develop|propose|introduce|implement|construct)|using|our (approach|method)|methodology)\b/i],
  ["Dataset",/\b(dataset|data set|experimental data|benchmark|corpus|cohort|observational data)\b/i],
  ["Main result",/\b(we (find|show|prove|demonstrate|establish|observe|report)|our results|results (show|indicate|suggest))\b/i],
  ["Limitations",/\b(limitation|however|restricted to|only when|cannot|may not|does not|small sample)\b/i],
  ["Code availability",/\b(code (is |are )?(available|released)|github\.com|software repository|open.source code|implementation (is )?available)\b/i]
 ];
 function sentences(abstract){
  const text=String(abstract||"").trim();
  if(!text)return [];
  const parts=text.match(/[^.!?]+(?:[.!?]+|$)/g)||[];
  let searchFrom=0;
  return parts.map(part=>{
   const content=part.trim();
   const from=text.indexOf(content,searchFrom);
   searchFrom=Math.max(from+content.length,searchFrom);
   return {text:content,start:from,end:from+content.length};
  }).filter(item=>item.text);
 }
 function extract(abstract){
  const parts=sentences(abstract);
  const out={};
  for(const [name,pattern] of fields){
   const candidate=parts.find(part=>pattern.test(part.text));
   out[name]=candidate?{text:candidate.text,start:candidate.start,end:candidate.end,source:"original abstract"}:
    {text:"Not stated in the available abstract",start:null,end:null,source:"unavailable"};
  }
  return out;
 }
 return {fields:fields.map(x=>x[0]),sentences,extract};
});
