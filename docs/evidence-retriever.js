/* Conservative evidence-only retrieval. Never substitutes a model assertion for citations. */
(function(root,factory){
 const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.AxiovoEvidenceRetriever=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 function answer(question,papers,{index,verifier,limit=5}={}){
  const extracts=index||root?.AxiovoEvidenceIndex,verify=verifier||root?.AxiovoClaimVerifier;
  if(!extracts||!verify)throw Error("Evidence dependencies unavailable");
  const passages=(papers||[]).flatMap(p=>{
   const id=p.canonicalId||p.id;
   const version=p.version??null;
   const url=p.url||p.landing_url;
   if(!id||!url||!/^https:\/\/(?:arxiv\.org|www\.biorxiv\.org|doi\.org)\//.test(url))return [];
   return extracts.fromAbstract({...p,id,version,url});
  });
  const ranked=extracts.retrieve(passages,question,{limit});
  const mapping=Object.fromEntries(passages.map(p=>[p.passage_id,p]));
  const citations=[];
  for(const row of ranked){
   const passage=row.passage;
   const candidate={source_id:passage.source_id,passage_id:passage.passage_id,
    version:passage.version,quote:passage.text};
   const result=verify.verify(candidate,mapping);
   if(result.valid)citations.push({
    claim_type:"literal-source-quotation",quote:passage.text,
    source_id:passage.source_id,version:passage.version,passage_id:passage.passage_id,
    source_url:result.source_url,section:passage.section||"Abstract",
    note:result.note
   });
  }
  return {question:String(question||""),
   answered:citations.length>0,
   status:citations.length?"source-quotations-only":"insufficient-grounded-evidence",
   citations,uncertainty:"Extractive search is not scientific correctness or novelty certification.",
   advice:citations.length?"Inspect each original source before relying on an interpretation.":
    "No adequately matching literal source evidence was found. Try original papers or refine the query."};
 }
 return Object.freeze({answer});
});