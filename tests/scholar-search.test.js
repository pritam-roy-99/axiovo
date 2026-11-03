"use strict";
const assert=require("node:assert/strict");
const S=require("../docs/scholar-search.js");
const contextual={field:"quantum",topic:"Contextuality",subtopic:"",query:"Contextuality"};
const quantum={id:"https://openalex.org/W1",display_name:"Quantum contextuality and Kochen-Specker theorems",
 publication_date:"2026-04-05",primary_topic:{display_name:"Quantum Physics",field:{id:"https://openalex.org/fields/31"}},
 abstract_inverted_index:{Quantum:[0],contextuality:[1],reveals:[2],measurement:[3],incompatibility:[4]}};
const medical={id:"https://openalex.org/W2",display_name:"ANA Testing From Background Prevalence to Pretest Probability: A Recommendation for Routine Practice",
 publication_date:"2026-02-08",primary_topic:{display_name:"Clinical Medicine",field:{id:"https://openalex.org/fields/27"}}};
const social={id:"https://openalex.org/W3",display_name:"Contested urbanisms: The politics of heritage and housing in Jakarta",
 publication_date:"2026-03-19",primary_topic:{display_name:"Urban Studies",field:{id:"https://openalex.org/fields/33"}}};
const wrong={id:"https://openalex.org/W4",display_name:"The contextuality of workplace education",
 publication_date:"2026-03-19",primary_topic:{display_name:"Physics",field:{id:"https://openalex.org/fields/31"}}};
const future={...quantum,id:"https://openalex.org/W5",publication_date:"2027-08-01"};
const plan=S.plan(contextual,"Contextuality",{today:"2026-11-03"});
assert.equal(plan.context,true);
assert.equal(plan.search,"quantum Contextuality");
assert.ok(plan.params.get("filter").includes("primary_topic.field.id:31|17|26"));
assert.ok(plan.params.get("filter").includes("to_publication_date:2026-11-03"));
assert.deepEqual(S.select([medical,social,wrong,quantum,future],plan).map(w=>w.id),[quantum.id]);
const prep=S.plan({...contextual,subtopic:"Preparation contextuality"},"Preparation contextuality",{today:"2026-11-03"});
assert.equal(prep.context,true);
const unrelated=S.plan({field:"medicine",topic:"Diagnostics",subtopic:"",query:"Diagnostics"},"Diagnostics",{today:"2026-11-03"});
assert.equal(S.match(quantum,unrelated),false);
const medicine={...medical,display_name:"Diagnostic accuracy of ANA testing in clinical cohorts"};
assert.equal(S.match(medicine,unrelated),true);
const free=S.plan({...contextual,query:"Bell correlations"},"Bell correlations",{today:"2026-11-03"});
assert.equal(free.browse,false);
assert.equal(S.fieldId("https://openalex.org/fields/31"),"31");
assert.equal(S.fieldId("bad"),"");
console.log("Field-restricted scholarly search tests passed.");
