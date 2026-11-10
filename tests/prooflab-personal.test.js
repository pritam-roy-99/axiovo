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


test("Windows startup updater never forces reset and supports opt-out",()=>{
 const startup=fs.readFileSync(path.join(root,"personal/start.ps1"),"utf8");
 assert.match(startup,/\[switch\]\$NoUpdate/);
 assert.match(startup,/if \(\$NoUpdate\)/);
 assert.match(startup,/git -c credential\.interactive=never pull --ff-only origin main/);
 assert.match(startup,/git status --porcelain --untracked-files=no/);
 assert.match(startup,/git remote get-url origin/);
 assert.doesNotMatch(startup,/git\s+(?:reset\s+--hard|clean\s+-fd|pull\s+--force)/);
 assert.equal((startup.match(/^\$project = \(Resolve-Path/gm)||[]).length,1,"startup project setup must not be duplicated");
 assert.equal((startup.match(/^function Update-Axiovo/gm)||[]).length,1,"updater must not be duplicated");
});


test("Windows Axiovo Personal icon opens the homepage, not ProofLab",()=>{
 const launch=fs.readFileSync(path.join(root,"personal/launch.ps1"),"utf8");
 const startup=fs.readFileSync(path.join(root,"personal/start.ps1"),"utf8");
 assert.match(launch,/127\.0\.0\.1:4317\/index\.html/);
 assert.doesNotMatch(launch,/4317\/prooflab\.html/);
 assert.match(startup,/Opening http:\/\/127\.0\.0\.1:4317\/index\.html/);
 assert.match(server,/u\.pathname==='\/'\?'\/index\.html'/);
 assert.match(server,/origin\+'\/index\.html'/);
});
test("Windows shortcut installer tolerates a restricted Start Menu",()=>{
 const installer=fs.readFileSync(path.join(root,"personal/install-shortcut.ps1"),"utf8");
 assert.match(installer,/\$desktopOK=\$true/);
 assert.match(installer,/\$menuOK=\$false/);
 assert.match(installer,/catch \{/);
 assert.match(installer,/Windows denied Start Menu shortcut access/);
 assert.match(installer,/if \(-not \$desktopOK -and -not \$menuOK\)/);
});
