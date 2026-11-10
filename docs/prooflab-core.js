/* Axiovo ProofLab Phase 1: pure, offline-first proof obligation utilities. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.AxiovoProofLab=api;})(typeof globalThis!=="undefined"?globalThis:null,function(){
"use strict";
const MAX=12000;
function clean(s){return String(s||"").trim().slice(0,MAX)}
function create(title,statement,assumptions){return {version:1,id:"proof-"+Date.now().toString(36),title:clean(title).slice(0,200),statement:clean(statement),assumptions:clean(assumptions).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,40),obligations:[],lean:"",status:"draft",verification:null};}
function addObligation(p,statement){if(!p||!clean(statement))throw Error("An obligation statement is required");return {...p,obligations:[...(p.obligations||[]),{id:"lemma-"+((p.obligations||[]).length+1),statement:clean(statement),status:"open"}],status:"draft",verification:null};}
function setLean(p,lean){return {...p,lean:clean(lean),status:"draft",verification:null};}
function report(p){return {title:p.title,status:p.status,open:(p.obligations||[]).filter(x=>x.status!=="verified").length,assumptions:(p.assumptions||[]).length,hasLean:!!p.lean,verification:p.verification};}
function validate(p){return !!(p&&p.version===1&&typeof p.title==="string"&&typeof p.statement==="string"&&Array.isArray(p.assumptions)&&Array.isArray(p.obligations)&&typeof p.lean==="string");}
function exportJSON(p){if(!validate(p))throw Error("Invalid ProofLab project");return JSON.stringify(p,null,2);}
return {create,addObligation,setLean,report,validate,exportJSON};
});