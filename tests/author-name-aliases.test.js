"use strict";
const assert=require("node:assert/strict");
const Follow=require("../docs/author-follow.js");
const pairs=[
 ["A.S. Majumdar","Archan S Majumdar"],
 ["A. S. Majumdar","Archan S. Majumdar"],
 ["Majumdar, A. S.","Archan S Majumdar"],
 ["Archan S Majumdar","A. S. Majumdar"],
 ["A.S. Majumdar","Majumdar, A S"]
];
for(const [a,b] of pairs){
 assert(Follow.matchesName(a,b),a+" must match "+b);
 assert(Follow.matchesName(b,a),b+" must match "+a);
}
for(const name of ["S. N. Majumdar","Subhash Majumdar","Archan S Mukherjee","A. D. Majumdar"]){
 assert(!Follow.matchesName("A. S. Majumdar",name),"False author identity: "+name);
}
assert.equal(Follow.searchName("A.S. Majumdar"),"Archan S Majumdar");
assert.equal(Follow.searchName("A. S. Majumdar"),"Archan S Majumdar");
assert.equal(Follow.searchName("S. N. Majumdar"),"S. N. Majumdar");
console.log("PASS: followed-author initials, expanded names, surname-first metadata and namesake protection");
