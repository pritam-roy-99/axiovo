const test=require("node:test"),assert=require("node:assert/strict"),O=require("../docs/prooflab-ollama.js");
test("reject invalid model names",()=>assert.equal(O.validModel("https://remote.example"),false));
test("discover only local installed models",async()=>{const models=await O.models(async url=>{assert.equal(url,"http://127.0.0.1:11434/api/tags");return {ok:true,json:async()=>({models:[{name:"qwen2.5:3b"},{name:"qwen2.5:3b"},{name:"bad model"}]})}});assert.deepEqual(models,["qwen2.5:3b"])});
test("request local proof suggestion without asserting verification",async()=>{const result=await O.suggest({model:"qwen2.5:3b",statement:"P implies P",fetcher:async(url,options)=>{assert.equal(url,"http://127.0.0.1:11434/api/chat");assert.equal(JSON.parse(options.body).stream,false);return {ok:true,json:async()=>({message:{content:"Proposed strategy only"}})}}});assert.equal(result,"Proposed strategy only")});
test("reject empty theorem",async()=>await assert.rejects(()=>O.suggest({model:"qwen2.5:3b",statement:""})));


test("local follow-up includes bounded chat history and current question",async()=>{
 let payload;
 const answer=await O.suggest({model:"deepseek-r1:7b",statement:"A implies A",question:"Explain step two",history:[{role:"user",content:"First step?"},{role:"assistant",content:"Assume A"}],fetcher:async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({message:{content:"Next step"}})};}});
 assert.equal(answer,"Next step");
 assert.equal(payload.messages[1].role,"user");
 assert.equal(payload.messages[1].content,"First step?");
 assert.equal(payload.messages[2].role,"assistant");
 assert.match(payload.messages.at(-1).content,/Explain step two/);
 assert.equal(payload.stream,false);
});
