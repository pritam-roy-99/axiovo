"use strict";
const assert=require("node:assert/strict");
const contract=require("../docs/search-contract.js");
const bm=require("../docs/bm25-search.js");
const hybrid=require("../docs/hybrid-rank.js");
const core=require("../docs/search-core.js");
const graph=require("../docs/literature-graph.js");
const claims=require("../docs/claim-verifier.js");
const evidence=require("../docs/evidence-index.js");
const citation=require("../docs/citation-formats.js");
const collections=require("../docs/collection-export.js");
const feedPlan=require("../docs/feed-retrieval-plan.js");
const personal=require("../docs/personal-migration.js");
const authorIdentity=require("../docs/author-identity.js");
const retriever=require("../docs/evidence-retriever.js");
const pdfEvidence=require("../docs/pdf-evidence.js");

const a={source:"arxiv",id:"arxiv:2611.00001",source_id:"2611.00001",recordId:"2611.00001v2",version:2,
 title:"Quantum contextuality in sequential measurements",abstract:"A nonclassical measurement test.",
 authors:["Alice Smith"],categories:["quant-ph"],submitted_date:"2026-11-05",date:"2026-11-05",
 landing_url:"https://arxiv.org/abs/2611.00001v2",url:"https://arxiv.org/abs/2611.00001v2",
 pdf_url:"https://arxiv.org/pdf/2611.00001v2"};
const b={...a,id:"arxiv:2611.00002",source_id:"2611.00002",recordId:"2611.00002v1",version:1,
 title:"Quantum contextuality tests using instruments",
 abstract:"Tests for an operational theory.",date:"2026-11-03",submitted_date:"2026-11-03",
 url:"https://arxiv.org/abs/2611.00002v1",landing_url:"https://arxiv.org/abs/2611.00002v1"};
const c={...a,id:"arxiv:2611.00003",source_id:"2611.00003",recordId:"2611.00003v1",version:1,
 title:"Protein folding chemistry",abstract:"Organic molecules.",date:"2026-11-06",submitted_date:"2026-11-06",
 url:"https://arxiv.org/abs/2611.00003v1",landing_url:"https://arxiv.org/abs/2611.00003v1"};
const x={...a,source:"chemrxiv",id:"chemrxiv:10.26434/chemrxiv-abc",source_id:"10.26434/chemrxiv-abc",
 doi:"10.26434/chemrxiv-abc",title:"Contextual quantum chemistry",
 url:"https://doi.org/10.26434/chemrxiv-abc",landing_url:"https://doi.org/10.26434/chemrxiv-abc"};

const q=contract.canonical({q:"quantum contextuality",sources:["arxiv"],from:"2026-11-03",to:"2026-11-05",pageSize:10});
assert.equal(contract.toParams(q).get("sources"),"arxiv");
assert.deepEqual(contract.canonical(contract.toParams(q)).sources,["arxiv"]);
assert.equal(contract.eligible(a,q),true);
assert.equal(contract.eligible(c,q),false);
assert.equal(contract.eligible(x,q),false);
assert.equal(contract.identifier("https://arxiv.org/abs/2611.00001v2").version,2);
assert.equal(contract.eligible(b,{q:"2611.00001v2",source:"arxiv"}),false);
assert.equal(contract.eligible(a,{q:"2611.00001v2",source:"arxiv"}),true);

const ranked=bm.score(bm.create([a,b,c]),"quantum contextuality");
assert.equal(ranked.length,2);
assert.equal(ranked[0].paper.source,"arxiv");
assert.equal(ranked.at(-1).paper!==c,true);
const once=hybrid.fuse({lexical:ranked,semantic:[b,a]},{eligible:p=>p.source==="arxiv"});
const twice=hybrid.fuse({semantic:[b,a],lexical:ranked},{eligible:p=>p.source==="arxiv"});
assert.deepEqual(once.map(z=>z.id),twice.map(z=>z.id));
assert.equal(hybrid.fuse({lexical:[x,a]},{eligible:p=>p.source==="arxiv"}).length,1);
const hits=core.search([a,b,c,x],{q:"quantum contextuality",sources:["arxiv"],sort:"relevance"},
 {lexical:bm,hybrid,contract});
assert.equal(hits.method,"bm25");assert.equal(hits.items.length,2);
const injected={...x,id:"chemrxiv:10.26434/chemrxiv-fake",title:"Invented fake entry",url:"https://doi.org/10.26434/chemrxiv-fake"};
const protectedHybrid=core.search([a,b,c],{q:"quantum contextuality",sources:["arxiv"],mode:"hybrid"},
 {lexical:bm,hybrid,contract,semanticResults:[injected,b]});
assert.equal(protectedHybrid.items.some(row=>row.paper.id===injected.id),false);
assert.equal(protectedHybrid.items.length,2);


assert.equal(graph.edge({from:a.id,to:b.id,type:"cites"}),null);
const verifiedEdge={from:a.id,to:b.id,type:"cites",provider:"OpenAlex",
 source_record:"https://api.openalex.org/works/W123",checked_at:"2026-11-07"};
const g=graph.build([verifiedEdge,verifiedEdge,{...verifiedEdge,type:"similar"}]);
assert.equal(g.edges.length,1);assert.equal(g.rejected_count,1);
assert.equal(graph.forPaper(g,b.id)[0].direction,"incoming");
const passages=evidence.fromAbstract({...a,id:a.id});
assert(passages.length>0);
const first=passages[0];
assert(claims.verify({source_id:a.id,passage_id:first.passage_id,quote:first.text,version:2},
 {[first.passage_id]:first}).valid);
assert.equal(claims.verify({source_id:b.id,passage_id:first.passage_id,quote:first.text},
 {[first.passage_id]:first}).valid,false);

const ris=citation.ris(a),bib=citation.bibtex(a),csl=citation.csl(a);
assert(ris.includes("TY  - ELEC")&&ris.includes("AU  - Alice Smith"));
assert(bib.includes("@misc{")&&bib.includes("2611.00001"));
assert.equal(csl.type,"report");assert.equal(csl.version,"2");
assert.equal(citation.unique([a,a,b]).length,2);
const publicList=collections.portable("Public list",[{...a,private_note:"SECRET",access_token:"PRIVATE"}],citation);
assert(!JSON.stringify(publicList).includes("SECRET"));
assert(!JSON.stringify(publicList).includes("PRIVATE"));
assert.equal(collections.validate(publicList).records.length,1);
assert.throws(()=>collections.validate({...publicList,records:[{...publicList.records[0],private_note:"x"}]}));
const plan1=feedPlan.plan({authors:["Alice","Bob"],topics:["quantum","biology"],budget:2});
const plan2=feedPlan.plan({authors:["Alice","Bob"],topics:["quantum","biology"],budget:2,cursor:plan1.nextCursor});
assert.equal(plan1.total,4);
assert.equal(new Set([...plan1.queries,...plan2.queries].map(t=>t.key)).size,4);
assert.throws(()=>personal.optInMirror({getItem:()=>null},[],{approved:false}),/Explicit migration approval required/);
assert.equal(authorIdentity.orcid("0000-0002-1825-0097"),"0000-0002-1825-0097");
assert.equal(authorIdentity.orcid("0000-0002-1825-0098"),null);
assert.equal(authorIdentity.openAlex("https://openalex.org/A1234"),"A1234");
const unresolved=authorIdentity.candidate({name:"Alex Smith"},"OpenAlex search");
assert.equal(unresolved.confirmed,false);
assert.equal(authorIdentity.sameResearcher(unresolved,unresolved),false);
assert.throws(()=>citation.normalize({...a,url:"https://example.com/not-the-paper"}),/original source/);
assert.throws(()=>citation.normalize({...a,url:"https://arxiv.org/abs/2611.00001v1",landing_url:"https://arxiv.org/abs/2611.00001v1"}),/revision mismatch/);
const evidenceAnswer=retriever.answer("nonclassical measurement",[a],{index:evidence,verifier:claims});
assert(evidenceAnswer.answered);
assert.equal(evidenceAnswer.citations[0].source_url,a.url);
const abstain=retriever.answer("unanswerable black hole topology",[a],{index:evidence,verifier:claims});
assert.equal(abstain.answered,false);
(async()=>{
 const testFile={size:8,arrayBuffer:async()=>new ArrayBuffer(8)};
 const stub={getDocument:()=>({promise:Promise.resolve({
  numPages:1,
  getPage:async()=>({getTextContent:async()=>({items:[{str:"Qubit"},{str:"measurement"}]})}),
  destroy:async()=>{}
 })})};
 const result=await pdfEvidence.extract(testFile,{pdfjs:stub,paper:{id:a.id,version:2},maxPages:1});
 assert.equal(result.uploaded,false);
 assert.equal(result.passages[0].extraction_status,"layout-uncertain");
 console.log("Phases 2-5: strict search, evidence, portability, fair follow plan and opt-in migration tests passed.");
})().catch(error=>{console.error(error);process.exitCode=1});

