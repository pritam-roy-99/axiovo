const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const client=fs.readFileSync(path.join(root,"docs/prooflab-personal.js"),"utf8");
const server=fs.readFileSync(path.join(root,"personal/server.mjs"),"utf8");
test("public GitHub Pages never runs private ChatGPT connector",()=>{
 let calls=0;
 const sandbox={location:{hostname:"pritam-roy-99.github.io",protocol:"https:"},fetch(){calls++;throw Error("Unexpected request")}};
 vm.runInNewContext(client,sandbox,{timeout:1000});
 assert.equal(calls,0);
});
test("private companion never permits remote binding or public cloud credentials",()=>{
 assert.match(server,/server\.listen\(port,'127\.0\.0\.1'/);
 assert.match(server,/Windows DPAPI|windows-dpapi-current-user-v1/);
 assert.match(server,/req\.headers\.origin===origin/);
 assert.match(server,/req\.headers\['x-axiovo-local'\]===csrf/);
 assert.match(server,/input\.approved!==true/);
 assert.doesNotMatch(server,/OPENAI_API_KEY|localStorage\./);
});
test("explicit per-request consent and user context opt-in are mandatory",()=>{
 assert.match(client,/personal-approve/);
 assert.match(client,/personal-include-statement/);
 assert.match(client,/personal-include-assumptions/);
 assert.match(client,/personal-include-lean/);
 assert.match(client,/personal-history/);
 assert.match(client,/personal-disconnect/);
 assert.match(client,/personal-clear/);
});
