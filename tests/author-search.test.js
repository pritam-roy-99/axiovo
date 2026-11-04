"use strict";
const assert=require("node:assert/strict");
const A=require("../docs/author-search.js");
assert.equal(A.clean("María  García"),"maria garcia");
assert.equal(A.clean("  John W. Smith  "),"john w smith");
assert.equal(A.rankName("John Smith","John Smith"),100);
assert.equal(A.rankName("María García","Maria Garcia"),100);
assert(A.rankName("John W. Smith","John Smith")>=80,"Middle-initial variants should be suggested");
assert(A.rankName("John Smith","J. Smith")>=60,"First-initial variants should be suggested");
assert(A.rankName("John Smith","John Smith")>A.rankName("Jan Smith","John Smith"));
assert.equal(A.canonicalId("https://openalex.org/A5023471898"),"A5023471898");
assert.equal(A.canonicalId("someone"),"");
const search=A.searchParams("Maria Garcia");
assert.equal(search.get("search"),"Maria Garcia");
const params=A.worksParams("https://openalex.org/A5023471898");
assert(params.get("filter").includes("authorships.author.id:A5023471898"));
assert(!params.get("filter").includes("locations.source.id:"),"Do not exclude indexed arXiv works by provider tagging");
assert.equal(params.get("per_page"),"200");
assert.equal(params.get("sort"),"publication_date:desc");
assert.throws(()=>A.worksParams("not-an-id"),/Invalid/);
const authors=[
 {id:"https://openalex.org/A5012345678",display_name:"Jon Smyth",works_count:7},
 {id:"https://openalex.org/A5023471898",display_name:"John Smith",works_count:9},
 {id:"https://openalex.org/A5033467821",display_name:"John W. Smith",works_count:12},
 {id:"invalid",display_name:"John Smith",works_count:100000}
];
const ranked=A.rankAuthors(authors,"John Smith");
assert.equal(ranked[0].display_name,"John Smith");
assert.equal(ranked.length,3,"Only distinct valid OpenAlex identities are shown");
assert.equal(new Set(ranked.map(x=>x.id)).size,3);

assert.equal(A.rankName("Shubhayan Sarkar","Shubhayan Sarkar"),100);
assert(A.rankName("Shubhayan Sarkar","Shubhayan Sarka")>=75);
for(const wrong of ["Siddhartha Sarkar","Sourav Sarkar","Sudipta Sarkar","Abhishek Sarkar","Amal Sarkar","Antara Sarkar","Chitrak Sarkar","Kanad Sarkar","Palash Sarkar"]){
 assert.equal(A.rankName(wrong,"Shubhayan Sarkar"),0,"Unrelated author suggested: "+wrong);
}
assert.equal(A.rankName("Shubhayan Sarkar","S. Sarkar"),82);
const rankedSarkar=A.rankAuthors([
 {id:"https://openalex.org/A5021006857",display_name:"Shubhayan Sarkar",works_count:32},
 {id:"https://openalex.org/A5076543210",display_name:"Siddhartha Sarkar",works_count:100},
 {id:"https://openalex.org/A5076543211",display_name:"Sourav Sarkar",works_count:90}
],"Shubhayan Sarkar");
assert.deepEqual(rankedSarkar.map(x=>x.display_name),["Shubhayan Sarkar"]);
const sourceUrl=new URL(A.officialAuthorUrl("Shubhayan Sarkar"));
assert.equal(sourceUrl.hostname,"arxiv.org");
assert.equal(sourceUrl.searchParams.get("query"),"Shubhayan Sarkar");
assert.equal(sourceUrl.searchParams.get("searchtype"),"author");
console.log("Author identity and similar-name search regression tests passed");
