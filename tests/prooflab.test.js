const test=require("node:test"),assert=require("node:assert/strict"),P=require("../docs/prooflab-core.js");
test("creates a draft with explicit assumptions",()=>{const p=P.create("T","statement","A\nB");assert.equal(p.status,"draft");assert.deepEqual(p.assumptions,["A","B"]);assert.equal(P.report(p).open,0)});
test("obligations remain open and never claim verification",()=>{let p=P.create("T","S","");p=P.addObligation(p,"prove lemma");assert.equal(P.report(p).open,1);assert.equal(p.status,"draft")});
test("Lean code never changes verification status",()=>{let p=P.create("T","S","");p=P.setLean(p,"theorem t : True := by trivial");assert.equal(p.status,"draft");assert.equal(p.verification,null)});
test("JSON export validates structure",()=>{const p=P.create("T","S","");assert.deepEqual(JSON.parse(P.exportJSON(p)),p);assert.throws(()=>P.exportJSON({}))});
test("empty obligations rejected",()=>assert.throws(()=>P.addObligation(P.create("T","S",""),"   ")));
