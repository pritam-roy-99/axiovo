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
  await page.waitForURL(url=>url.hash==="#workspace",{timeout:12000});
  await page.locator("#workspace-panel #library-list").waitFor({timeout:12000});
  assert((await page.locator("#workspace-panel").isVisible()),"Workspace must appear in the unified page");
  await page.locator("#workflow-discover").click();
  await page.locator("#discover-shell").waitFor({state:"visible",timeout:12000});
  await page.locator("#workflow-workspace").click();
  await page.locator("#workspace-panel").waitFor({state:"visible",timeout:12000});
  // A saved arXiv revision must appear on the same-page Workspace and retain
  // its reading note after switching views, without an additional navigation.
  await page.evaluate(()=>{
    localStorage.setItem("researchlens-reading-list",JSON.stringify(["2608.13942v2"]));
    window.dispatchEvent(new Event("researchlens-library-change"));
  });
  await page.locator("#library-list article").first().waitFor({timeout:12000});
  const savedHref=await page.locator("#library-list article a").first().getAttribute("href");
  assert(savedHref.includes("2608.13942v2"),"Saved arXiv revision was lost in Workspace");
  await page.locator('#library-list textarea[aria-label^="Private note"]').first().fill("Read proof of Theorem 2");
  await page.locator('#library-list textarea[aria-label^="Private note"]').first().blur();
  await page.locator("#workflow-discover").click();
  await page.locator("#discover-shell").waitFor({state:"visible"});
  await page.locator("#workflow-workspace").click();
  await page.locator("#workspace-panel").waitFor({state:"visible"});
  assert.equal(await page.locator('#library-list textarea[aria-label^="Private note"]').first().inputValue(),"Read proof of Theorem 2");
  // Workspace search switches to the visible Discover search without a reload.
  await page.evaluate(()=>{window.__axiovoSamePage=true});
  await page.locator("#research-query").fill("contextuality and steering");
  await page.locator('#quick-search button[type="submit"]').click();
  await page.locator("#scholarly-discovery").waitFor({state:"visible",timeout:12000});
  assert.equal(await page.locator("#scholar-query").inputValue(),"contextuality and steering");
  assert(await page.evaluate(()=>window.__axiovoSamePage),"Quick search should not reload the page");
  await page.locator("#workflow-workspace").click();
  await page.locator("#workspace-panel").waitFor({state:"visible"});
  assert.equal(new URL(page.url()).searchParams.get("q"),"contextuality and steering",
    "Workspace tab should preserve the existing scholarly search");
  await page.locator("#workflow-discover").click();
  await page.locator("#scholarly-discovery").waitFor({state:"visible"});
  assert.equal(await page.locator("#scholar-query").inputValue(),"contextuality and steering",
    "Returning to Discover should preserve its query");
  await page.locator("#workflow-workspace").click();
  await page.locator("#workspace-panel").waitFor({state:"visible"});

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

  // Discover must recover from stale future dates and retrieve live arXiv results.
  const discover=await browser.newContext({viewport:{width:1100,height:820}});
  const openalexQueries=[];
  const matchingWork={
   id:"https://openalex.org/W2608",display_name:"Quantum computing with error corrected qubits",
   publication_year:2026,publication_date:"2026-10-01",cited_by_count:3,
   authorships:[{author:{display_name:"A. Researcher"}}],
   primary_topic:{display_name:"Quantum computing",field:{id:"https://openalex.org/fields/31"}},
   topics:[{display_name:"Quantum Information",field:{id:"https://openalex.org/fields/31"}}],
   locations:[{landing_page_url:"https://arxiv.org/abs/2610.00001"}],
   abstract_inverted_index:{Quantum:[0],computing:[1],qubits:[2]},
   primary_location:{source:{display_name:"arXiv"},landing_page_url:"https://arxiv.org/abs/2610.00001"}
  };
  const wrongWork={
   id:"https://openalex.org/Wmed",display_name:"Quantum approaches in clinical workplace learning",
   publication_date:"2026-10-01",primary_topic:{display_name:"Clinical Medicine",field:{id:"https://openalex.org/fields/27"}},
   locations:[{landing_page_url:"https://arxiv.org/abs/2610.00002"}]
  };
  await discover.route("https://api.openalex.org/**",route=>{
   const url=new URL(route.request().url());
   openalexQueries.push(url);
   return route.fulfill({status:200,contentType:"application/json",
     body:JSON.stringify({meta:{count:2},results:[matchingWork,wrongWork]})})
  });
  await discover.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
  const dpage=await discover.newPage();
  dpage.on("pageerror",err=>errors.push(dpage.url()+": "+err.message));
  await dpage.goto(base+"/",{waitUntil:"domcontentloaded"});
  await dpage.evaluate(()=>localStorage.setItem("researchlens-field-explorer-v1",JSON.stringify({
   field:"quantum",topic:"Quantum computing",subtopic:"",query:"Quantum computing",
   from:"2099-11-27",to:"2099-11-30",sort:"publication_date:desc"
  })));
  await dpage.goto(base+"/?view=scholarly#discover",{waitUntil:"domcontentloaded"});
  await dpage.locator("#scholar-results article").first().waitFor({timeout:15000});
  assert.equal(await dpage.locator("#scholar-from").inputValue(),"");
  assert.equal(await dpage.locator("#scholar-to").inputValue(),"");
  assert.equal(await dpage.locator("#scholar-results article").count(),1);
  assert((await dpage.locator("#scholar-results").innerText()).includes("Quantum computing with error corrected qubits"));
  assert(!openalexQueries.some(u=>(u.searchParams.get("filter")||"").includes("2099")));
  assert(openalexQueries.some(u=>u.searchParams.get("search")==="Quantum computing"));
  assert(openalexQueries.some(u=>(u.searchParams.get("filter")||"").includes("locations.source.id:S4306400194")));
  assert(openalexQueries.every(u=>!(u.searchParams.get("filter")||"").includes("primary_topic.field.id:")));
  await dpage.locator("#scholar-from").fill("2099-11-27");
  await dpage.locator("#scholar-to").fill("2099-11-30");
  await dpage.locator("#scholar-search-form button[type=submit]").click();
  await dpage.locator("#scholar-results article").first().waitFor({timeout:15000});
  assert.equal(await dpage.locator("#scholar-from").inputValue(),"");
  assert.equal(await dpage.locator("#scholar-to").inputValue(),"");
  assert.equal(await dpage.locator("#scholar-results article").count(),1);
  await discover.close();

  // OpenAlex 429 must not leave Discover empty or trigger repeated semantic calls.
  const limited=await browser.newContext({viewport:{width:1100,height:800}});
  const rateRequests=[];
  await limited.route("https://api.openalex.org/**",route=>{
   rateRequests.push(route.request().url());
   return route.fulfill({status:429,contentType:"application/json",
    body:JSON.stringify({error:"rate_limit_exceeded"})})
  });
  await limited.route("**/data/feed.json",route=>route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify({papers:[
    {id:"2610.00333",title:"Bell nonlocality with entangled qubits",
      abstract:"Experimental tests of the CHSH Bell inequality under quantum noise.",
      authors:["A. Researcher"],published:"2026-10-03",categories:["quant-ph"],primary_category:"quant-ph"},
    {id:"2501.00444",title:"Quantum computing with optical circuits",abstract:"Quantum circuits and error correction.",
      authors:["B. Researcher"],published:"2025-01-04",categories:["quant-ph"],primary_category:"quant-ph"}
   ]})
  }));
  await limited.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
  const limitedPage=await limited.newPage();
  limitedPage.on("pageerror",err=>errors.push(limitedPage.url()+": "+err.message));
  await limitedPage.goto(base+"/?view=scholarly#discover",{waitUntil:"domcontentloaded"});
  await limitedPage.locator("#scholar-query").fill("Bell nonlocality");
  await limitedPage.locator("#scholar-from").fill("2026-11-01");
  await limitedPage.locator("#scholar-to").fill("2026-11-03");
  await limitedPage.locator("#scholar-search-form button[type=submit]").click();
  await limitedPage.locator("#scholar-results article").first().waitFor({timeout:18000});
  assert((await limitedPage.locator("#scholar-status").innerText()).includes("rate-limited"));
  assert((await limitedPage.locator("#scholar-status").innerText()).includes("other dates"));
  assert((await limitedPage.locator("#scholar-results").innerText()).includes("Bell nonlocality with entangled qubits"));
  assert((await limitedPage.locator("#scholar-results").innerText()).includes("Cached arXiv"));
  assert.equal(rateRequests.length,1,"429 should not trigger semantic retry");
  assert((await limitedPage.locator("#scholar-official-search").getAttribute("href")).includes("Bell+nonlocality"));
  await limitedPage.locator("#scholar-search-form button[type=submit]").click();
  await limitedPage.locator("#scholar-results article").first().waitFor({timeout:10000});
  assert.equal(rateRequests.length,1,"Cooldown should avoid repeated calls during the same session");
  await limited.close();

  // Check the core desktop layout separately from the mobile touch session.
  const desktop=await browser.newContext({viewport:{width:1366,height:820}});
  await desktop.route("https://api.openalex.org/**",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify({meta:{count:0},results:[]})
  }));
  await desktop.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
  const screen=await desktop.newPage();
  screen.on("pageerror",err=>errors.push(screen.url()+": "+err.message));
  for(const url of ["/","/?view=scholarly#discover","/#workspace","/copilot.html","/lab.html"]){
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
