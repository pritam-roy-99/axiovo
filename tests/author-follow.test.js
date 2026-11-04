"use strict";
const assert=require("node:assert/strict");
const values=new Map();
global.localStorage={
 getItem(key){return values.has(key)?values.get(key):null},
 setItem(key,value){values.set(key,String(value))}
};
const Follow=require("../docs/author-follow.js");
assert.deepEqual(Follow.list(),[]);
assert.equal(Follow.toggle("Ada Researcher"),true);
assert.equal(Follow.isFollowing("Ada Researcher"),true);
assert.equal(Follow.toggle("Blaise Scientist"),true);
assert.deepEqual(Follow.list(),["Ada Researcher","Blaise Scientist"]);
assert.equal(Follow.toggle("Ada Researcher"),false);
assert.deepEqual(Follow.list(),["Blaise Scientist"]);
assert.equal(Follow.toggle("  "),false);
values.set(Follow.KEY,"{malformed");
assert.deepEqual(Follow.list(),[]);
console.log("Author follow storage tests passed");
