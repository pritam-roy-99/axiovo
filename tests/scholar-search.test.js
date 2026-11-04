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
assert.ok(!plan.params.get("filter").includes("locations.source.id:"),"Do not exclude arXiv papers with missing provider tags");
assert.ok(!plan.params.get("filter").includes("primary_topic.field.id:"));
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
// Topic specificity: "quantum" alone must not qualify for steering or QKD.
const steering=S.plan({field:"quantum",topic:"Quantum steering",subtopic:""},"Quantum steering",{today:"2026-11-03"});
const genericQuantum={...quantum,id:"https://openalex.org/W6",display_name:"Quantum computation and error correction"};
const steeringPaper={...quantum,id:"https://openalex.org/W7",display_name:"Quantum steering and incompatibility measurements"};
assert.equal(S.match(genericQuantum,steering),false);
assert.equal(S.match(steeringPaper,steering),true);
const qkd=S.plan({field:"quantum",topic:"Quantum key distribution",subtopic:""},"Quantum key distribution",{today:"2026-11-03"});
assert.equal(S.match(steeringPaper,qkd),false);
assert.equal(S.match({...quantum,id:"https://openalex.org/W8",display_name:"Finite key distribution in quantum networks"},qkd),true);
const prepQuantum=S.plan({field:"quantum",topic:"Contextuality",subtopic:"Preparation contextuality"},"Preparation contextuality",{today:"2026-11-03"});
assert.equal(S.match(quantum,prepQuantum),false);
assert.equal(S.match({...quantum,id:"https://openalex.org/W9",display_name:"Preparation contextuality for quantum states"},prepQuantum),true);
const statPlan=S.plan({field:"statmech",topic:"Nonequilibrium statistical mechanics",subtopic:""},
 "Nonequilibrium statistical mechanics",{today:"2026-11-03"});
const statPaper={...quantum,id:"https://openalex.org/WS",display_name:"Nonequilibrium statistical mechanics and entropy production"};
const unrelatedPaper={...medical,id:"https://openalex.org/WX",display_name:"Nonequilibrium healthcare management"};
assert.equal(S.match(statPaper,statPlan),true);
assert.equal(S.match(unrelatedPaper,statPlan),false);
const condPlan=S.plan({field:"condmat",topic:"Topological phases of matter",subtopic:""},
 "Topological phases of matter",{today:"2026-11-03"});
const condPaper={...quantum,id:"https://openalex.org/WC",display_name:"Topological phases of quantum matter"};
assert.equal(S.match(condPaper,condPlan),true);
assert.equal(S.match({...quantum,id:"https://openalex.org/WY",display_name:"Quantum computing with qubits"},condPlan),false);
const hepPlan=S.plan({field:"highenergy",topic:"Scattering amplitudes",subtopic:""},"Scattering amplitudes",{today:"2026-11-03"});
assert.equal(S.match({...quantum,id:"https://openalex.org/WHEP",display_name:"Scattering amplitudes in gauge theory"},hepPlan),true);
assert.equal(S.match({...medical,id:"https://openalex.org/WHEPM",display_name:"Scattering amplitudes in gauge theory"},hepPlan),false);

const broad=S.plan({field:"quantum",topic:"Quantum steering",subtopic:"",areaSelected:false},"",{today:"2026-11-05",sort:"publication_date:desc"});
assert.equal(broad.search,"","A researcher must browse their field without selecting an area");
assert.equal(broad.params.get("search"),null);
assert.equal(broad.params.get("sort"),"publication_date:desc");
assert.equal(S.match(quantum,broad),true);
assert.equal(S.match(medical,broad),false);
const dated=S.plan({field:"quantum",topic:"Quantum steering",subtopic:""},"Quantum steering",
 {today:"2026-11-05",from:"2026-10-07",to:"2026-10-07",sort:"publication_date:desc"});
assert(dated.params.get("filter").includes("from_publication_date:2026-10-07"));
assert(dated.params.get("filter").includes("to_publication_date:2026-10-07"));
console.log("Field-restricted scholarly search tests passed.");
