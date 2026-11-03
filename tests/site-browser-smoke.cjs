/* Real-browser route and interaction smoke tests. Run against a local HTTP server:
 * npm install --no-save playwright && npx playwright install chromium
 * python3 -m http.server 8765 --directory docs
 * node tests/site-browser-smoke.cjs
 */
"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const base="http://127.0.0.1:8765";
(async function(){
 const browser=await chromium.launch({headless:true});
 const errors=[];
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.route("https://api.openalex.org/**",route=>route.fulfill({
  status:200,contentType:"application/json",
  body:JSON.stringify({meta:{count:0,page:1,per_page:100},results:[]})
 }));
 await context.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
 await context.route("https://api.github.com/**",route=>route.fulfill({status:200,contentType:"application/json",body:"{\"items\":[],\"total_count\":0}"}));
 const page=await context.newPage();
 page.on("pageerror",err=>errors.push(page.url()+": "+err.message));
 try{
  await page.goto(base+"/",{waitUntil:"domcontentloaded"});
  await page.locator("#rl-focus-bar").waitFor();
  assert(await page.locator("#rl-focus-field-title").isVisible());
  assert(!(await page.locator("#arxiv-legacy-focus").isVisible()));
  await page.locator("#rl-focus-field-details > summary").click();
  assert(await page.locator("#rl-focus-fields").isVisible());
  await page.locator("#rl-focus-fields button").filter({hasText:"Medicine & public health"}).click();
  assert((await page.locator("#rl-focus-trail").innerText()).includes("Medicine"));
  const trial=page.locator("#rl-focus-areas button").filter({hasText:"Clinical trials"});
  await trial.click();
  assert((await page.locator("#rl-focus-subtopics").innerText()).includes("Adaptive trials"));
  await page.locator("#rl-focus-subtopics button").filter({hasText:"Adaptive trials"}).first().click();
  assert((await page.locator("#rl-focus-trail").innerText()).includes("Adaptive trials"));
  await page.locator("#scholarly-discovery").waitFor({state:"visible"});
  assert.equal(await page.locator("#scholar-query").inputValue(),"Adaptive trials");

  await page.goto(base+"/workspace.html",{waitUntil:"domcontentloaded"});
  await page.locator("main h1").waitFor();
  assert((await page.locator("main h1").innerText()).includes("Pick up"));

  await page.goto(base+"/copilot.html",{waitUntil:"domcontentloaded"});
  await page.locator("#paper-picker").waitFor();
  assert(await page.locator("#question").count()===1);

  await page.goto(base+"/lab.html",{waitUntil:"domcontentloaded"});
  await page.locator("#lab-local-pdf").waitFor();
  assert(await page.locator("#lab-search-form").count()===1);

  await page.goto(base+"/paper.html?id=2608.13942v2",{waitUntil:"domcontentloaded"});
  await page.locator("#links a[href='https://arxiv.org/abs/2608.13942v2']").waitFor({timeout:10000});

  await page.evaluate(()=>localStorage.setItem("researchlens-reading-list",JSON.stringify(["2608.13942v2","2501.00001"])));
  await page.goto(base+"/profiles.html",{waitUntil:"domcontentloaded"});
  await page.locator("#papers a[href*='2608.13942v2']").first().waitFor({timeout:10000});
  assert((await page.locator("#papers").innerText()).includes("v2"));

  await page.goto(base+"/search.html?q=contextuality&from=2024-01-01&sort=publication_date%3Adesc",{waitUntil:"domcontentloaded"});
  await page.waitForURL(url=>url.pathname==="/"
    &&url.searchParams.get("view")==="scholarly"
    &&url.searchParams.get("q")==="contextuality", {timeout:10000});
  await page.locator("#scholar-query").waitFor();
  assert.equal(await page.locator("#scholar-from").inputValue(),"2024-01-01");
  assert.equal(await page.locator("#scholar-sort").inputValue(),"publication_date:desc");
  await page.goto(base+"/ai.html?id=2608.13942v2",{waitUntil:"domcontentloaded"});
  await page.waitForURL(url=>url.pathname==="/copilot.html"&&url.searchParams.get("id")==="2608.13942v2");

  // Check the core desktop layout separately from the mobile touch session.
  const desktop=await browser.newContext({viewport:{width:1366,height:820}});
  await desktop.route("https://api.openalex.org/**",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify({meta:{count:0},results:[]})
  }));
  await desktop.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
  const screen=await desktop.newPage();
  screen.on("pageerror",err=>errors.push(screen.url()+": "+err.message));
  for(const url of ["/","/workspace.html","/copilot.html","/lab.html"]){
   await screen.goto(base+url,{waitUntil:"domcontentloaded"});
   await screen.locator("main").first().waitFor();
   const metrics=await screen.evaluate(()=>({viewport:document.documentElement.clientWidth,
    document:document.documentElement.scrollWidth}));
   assert(metrics.document<=metrics.viewport+3,url+" horizontal page overflow: "+JSON.stringify(metrics));
  }
  await desktop.close();

  assert.deepEqual(errors,[],"Unexpected JavaScript exceptions");
  console.log("Browser smoke passed: responsive focus, source search, saved arXiv vN, 7 routes and redirects.");
 }finally{
  await context.close();await browser.close()
 }
})().catch(err=>{console.error(err);process.exitCode=1});
