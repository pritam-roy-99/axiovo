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
  // Author-name discovery must show distinct identities before displaying papers.
  let authorWorksQuery="";
  await page.route("https://api.openalex.org/authors?**",route=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({meta:{count:2},results:[
    {id:"https://openalex.org/A5023471898",display_name:"John Smith",works_count:20,
     last_known_institutions:[{display_name:"University A"}]},
    {id:"https://openalex.org/A5033467821",display_name:"John W. Smith",works_count:40,
     last_known_institutions:[{display_name:"University B"}]}
   ]})
  }));
  await page.route("https://api.openalex.org/works?**",route=>{
   authorWorksQuery=new URL(route.request().url()).searchParams.get("filter")||"";
   return route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({meta:{count:1},results:[{
     id:"https://openalex.org/WAUTHOR",display_name:"An arXiv paper from the selected researcher",
     publication_date:"2026-10-02",authorships:[{author:{display_name:"John Smith"}}],
     locations:[{landing_page_url:"https://arxiv.org/abs/2610.00001"}],
     primary_location:{landing_page_url:"https://arxiv.org/abs/2610.00001",source:{display_name:"arXiv"}}
    }]})});
  });
  await page.locator("#axiovo-author-details > summary").click();
  await page.locator("#axiovo-author-query").fill("John Smith");
  await page.locator("#axiovo-author-form button[type='submit']").click();
  await page.locator(".axiovo-author-identity").first().waitFor();
  assert.equal(await page.locator(".axiovo-author-identity").count(),2);
  await page.locator(".axiovo-author-identity button").first().click();
  await page.locator(".axiovo-author-paper a").first().waitFor();
  assert(authorWorksQuery.includes("authorships.author.id:A5023471898"));
  assert((await page.locator(".axiovo-author-paper").innerText()).includes("An arXiv paper"));
  await page.unroute("https://api.openalex.org/authors?**");
  await page.unroute("https://api.openalex.org/works?**");
  assert(await page.locator("#rl-focus-field-title").isVisible());
  assert(!(await page.locator("#arxiv-legacy-focus").isVisible()));
  await page.locator("#rl-focus-field-details > summary").click();
  assert(await page.locator("#rl-focus-fields").isVisible());
  await page.locator("#rl-focus-fields button").filter({hasText:"Medicine & public health"}).click();
  assert((await page.locator("#rl-focus-trail").innerText()).includes("Medicine"));
  assert.equal(await page.locator("#rl-focus-areas button").filter({hasText:"All research areas"}).first().getAttribute("aria-pressed"),"true");
  assert.equal(await page.locator("#scholar-query").inputValue(),"","Research area must be optional");
  // Preserve an explicitly selected first-submission date when narrowing by area.
  await page.evaluate(()=>{document.getElementById("date-from").value="2026-10-05"});

  const trial=page.locator("#rl-focus-areas button").filter({hasText:"Clinical trials"});
  await trial.click();
  assert.equal(await page.locator("#scholar-from").inputValue(),"2026-10-05");
  assert.equal(await page.locator("#scholar-to").inputValue(),"2026-10-05");

  assert((await page.locator("#rl-focus-subtopics").innerText()).includes("Adaptive trials"));
  await page.locator("#rl-focus-subtopics button").filter({hasText:"Adaptive trials"}).first().click();
  assert((await page.locator("#rl-focus-trail").innerText()).includes("Adaptive trials"));
  await page.locator("#scholarly-discovery").waitFor({state:"visible"});
  assert.equal(await page.locator("#scholar-query").inputValue(),"Adaptive trials");

  // User-editable hierarchy: save a new subfield and sub-subfield on mobile,
  // hide them independently and keep the customization in browser storage.
  await page.locator('#rl-focus-areas .rl-focus-editor input').fill("Quantum statistical medicine");
  await page.locator('#rl-focus-areas .rl-focus-editor button[type="submit"]').click();
  assert((await page.locator("#rl-focus-trail").innerText()).includes("Quantum statistical medicine"));
  await page.locator("#rl-focus-custom").fill("Fluctuation based diagnostics");
  await page.locator("#rl-focus-apply").click();
  assert((await page.locator("#rl-focus-trail").innerText()).includes("Fluctuation based diagnostics"));
  await page.reload({waitUntil:"domcontentloaded"});
  assert((await page.locator("#rl-focus-trail").innerText()).includes("Fluctuation based diagnostics"));
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Remove subtopic Fluctuation based diagnostics"}).click();
  assert(!(await page.locator("#rl-focus-subtopics").innerText()).includes("Fluctuation based diagnostics"));
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Remove research area Quantum statistical medicine"}).click();
  assert(!(await page.locator("#rl-focus-areas").innerText()).includes("Quantum statistical medicine"));
  await page.reload({waitUntil:"domcontentloaded"});
  assert(!(await page.locator("#rl-focus-areas").innerText()).includes("Quantum statistical medicine"));

  await page.goto(base+"/workspace.html",{waitUntil:"domcontentloaded"});
  await page.waitForURL(url=>url.hash==="#workspace",{timeout:12000});
  await page.locator("#workspace-panel #library-list").waitFor({timeout:12000});
  assert((await page.locator("#workspace-panel").isVisible()),"Workspace must appear in the unified page");
  await page.locator("#workflow-discover").click();
  await page.locator("#discover-shell").waitFor({state:"visible",timeout:12000});
  await page.locator("#workflow-workspace").click();
  await page.locator("#workspace-panel").waitFor({state:"visible",timeout:12000});

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
  assert(openalexQueries.some(u=>!(u.searchParams.get("filter")||"").includes("locations.source.id:")),"ArXiv works must not be excluded by provider source ID");
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
  const limited=await browser.newContext({viewport:{width:1100,height:800},serviceWorkers:"block"});
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
  await limited.route("https://api.semanticscholar.org/**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:[]})}));
  const limitedPage=await limited.newPage();
  limitedPage.on("pageerror",err=>errors.push(limitedPage.url()+": "+err.message));
  await limitedPage.goto(base+"/?view=scholarly#discover",{waitUntil:"domcontentloaded"});
  await limitedPage.locator("#scholar-query").fill("Bell nonlocality");
  await limitedPage.locator("#scholar-from").fill("2026-10-01");
  await limitedPage.locator("#scholar-to").fill("2026-10-04");
  await limitedPage.locator("#scholar-search-form button[type=submit]").click();
  await limitedPage.locator("#scholar-results article").first().waitFor({timeout:18000});
  assert((await limitedPage.locator("#scholar-status").innerText()).length>15,"Source fallback must explain results");
  assert((await limitedPage.locator("#scholar-status").innerText()).includes("limited") || (await limitedPage.locator("#scholar-status").innerText()).includes("cached"));
  assert((await limitedPage.locator("#scholar-results").innerText()).includes("Bell nonlocality with entangled qubits"));
  assert((await limitedPage.locator("#scholar-results").innerText()).includes("Cached arXiv"));
  assert.equal(rateRequests.length,1,"429 should not trigger semantic retry");
  assert((await limitedPage.locator("#scholar-official-search").getAttribute("href")).includes("Bell+nonlocality"));
  await limitedPage.locator("#scholar-search-form button[type=submit]").click();
  await limitedPage.locator("#scholar-results article").first().waitFor({timeout:10000});
  assert.equal(rateRequests.length,1,"Cooldown should avoid repeated calls during the same session");
  await limited.close();

  // Mobile-first Axiovo navigation and local question-first library workflow.
  const researchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await researchContext.addInitScript(()=>{
   localStorage.setItem("researchlens-reading-list",JSON.stringify(["2610.00111"]));
   localStorage.setItem("researchlens-research-projects-v1",JSON.stringify([{
    id:"p-test-1",title:"Measurement contextuality",question:"Can we witness a new operational separation?",
    keywords:"contextuality quantum experiments",status:"exploring",paper_ids:[],updated_at:"2026-11-01T00:00:00Z"
   }]));
  });
  await researchContext.route("**/data/feed.json",route=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({generated_at:"2026-11-03T00:00:00Z",papers:[{
    id:"2610.00111",title:"Quantum contextuality and operational witnesses",
    authors:["A. Scientist"],published:"2026-10-03T00:00:00Z",
    abstract:"A contextuality experiment",categories:["quant-ph"],primary_category:"quant-ph"
   }]})
  }));
  await researchContext.route("https://api.openalex.org/**",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify({meta:{count:0},results:[]})
  }));
  await researchContext.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({
   status:200,contentType:"application/javascript",body:""
  }));
  const research=await researchContext.newPage();
  research.on("pageerror",err=>errors.push(research.url()+": "+err.message));
  await research.goto(base+"/#workspace",{waitUntil:"domcontentloaded"});
  await research.locator("#library-list select[aria-label^='Attach']").first().waitFor({timeout:16000});
  assert(await research.locator(".rl-nav").isVisible(),"Mobile bottom navigation not visible");
  assert.equal(await research.locator(".rl-nav a").count(),3);
  assert((await research.locator(".axiovo-credit").innerText()).includes("ChatGPT by OpenAI"));
  const attach=research.locator("#library-list select[aria-label^='Attach']").first();
  await attach.selectOption("p-test-1");
  const linked=await research.evaluate(()=>JSON.parse(localStorage.getItem("researchlens-research-projects-v1")));
  assert(linked[0].paper_ids.includes("2610.00111"));
  const note=research.locator("#library-list textarea").first();
  await note.fill("Check the assumptions in Theorem 1");
  await note.dispatchEvent("change");
  await research.locator(".rl-nav a[href='./#discover']").click();
  await research.locator("#discover-shell").waitFor({state:"visible"});
  await research.locator(".rl-nav a[href='./#workspace']").click();
  await research.locator("#workspace-panel").waitFor({state:"visible"});
  assert.equal(await research.locator("#library-list textarea").first().inputValue(),"Check the assumptions in Theorem 1");
  await research.goto(base+"/community.html",{waitUntil:"domcontentloaded"});
  assert((await research.locator("main").innerText()).includes("GitHub Issues"));
  await research.goto(base+"/profiles.html",{waitUntil:"domcontentloaded"});
  assert((await research.locator("h1").innerText()).toLowerCase().includes("settings"));
  await researchContext.close();

  // Regression: imported arXiv IDs outside the rolling cache must stay visible
  // and exportable; a surname-only author fallback must never claim a match.
  const auditContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await auditContext.addInitScript(()=>{
   localStorage.setItem("researchlens-reading-list",JSON.stringify(["2507.18744"]));
  });
  await auditContext.route("**/data/feed.json",route=>route.fulfill({
   status:200,contentType:"application/json",body:JSON.stringify({
    generated_at:"2026-11-05T00:00:00Z",topic_catalog:[],
    papers:[{id:"2610.10001",title:"Unrelated solid-state preprint",
     authors:["Siddhartha Sarkar","Sourav Sarkar"],published:"2026-10-15T00:00:00Z",
     abstract:"An unrelated materials study",primary_category:"cond-mat.mtrl-sci",
     categories:["cond-mat.mtrl-sci"],topics:[]}]
   })
  }));
  for(const url of ["https://api.openalex.org/**","https://api.semanticscholar.org/**","https://inspirehep.net/api/**"]){
   await auditContext.route(url,route=>route.fulfill({
    status:429,contentType:"application/json",body:'{"error":"rate limited"}'
   }));
  }
  await auditContext.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
  const audit=await auditContext.newPage();
  audit.on("pageerror",err=>errors.push(audit.url()+": "+err.message));
  await audit.goto(base+"/",{waitUntil:"domcontentloaded"});
  await audit.locator("#recommended-links").getByText("Follow topics or save papers").waitFor({timeout:10000});
  await audit.locator("#savedOnly").click();
  await audit.locator("#papers").getByText("arXiv:2507.18744").waitFor({timeout:10000});
  assert(await audit.locator("#papers a[href='https://arxiv.org/abs/2507.18744']").isVisible());
  await audit.locator("#axiovo-author-details > summary").click();
  await audit.locator("#axiovo-author-query").fill("Shubhayan Sarkar");
  await audit.locator("#axiovo-author-form button[type='submit']").click();
  await audit.locator("#axiovo-author-status").getByText("No confidently matching author names").waitFor({timeout:16000});
  assert.equal(await audit.locator(".axiovo-author-choice").count(),0,
   "Do not suggest unrelated Sarkars during provider outages");
  assert(await audit.locator("#axiovo-author-candidates a[href*='arxiv.org/search/']").count()>0);
  await auditContext.close();

  // Date-complete archive: render all 151 papers, not a 25/30-record sample.
  const dailyContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const dailyRecords=Array.from({length:151},(_,i)=>({
   id:"2611."+String(i+1).padStart(5,"0"),version:1,title:"Archive paper "+String(i+1),
   abstract:"Science across every field",authors:["Scientist "+i],
   primary_category:i%2?"quant-ph":"math.AG",
   categories:[i%2?"quant-ph":"math.AG"],published:"2026-11-05T12:00:00Z",updated:"2026-11-05T12:00:00Z"
  }));
  await dailyContext.route("**/data/arxiv-days/manifest.json",route=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({schema:1,days:{"2026-11-05":{complete:true,count:151}}})
  }));
  await dailyContext.route("**/data/arxiv-days/2026-11-05.json",route=>route.fulfill({
   status:200,contentType:"application/json",
   body:JSON.stringify({date:"2026-11-05",complete:true,paper_count:151,
    source_total:151,papers:dailyRecords})
  }));
  await dailyContext.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,body:""}));
  const dailyPage=await dailyContext.newPage();
  dailyPage.on("pageerror",err=>errors.push("daily archive: "+err.message));
  await dailyPage.goto(base+"/",{waitUntil:"domcontentloaded"});
  await dailyPage.locator("#date-from").fill("2026-11-05");
  await dailyPage.locator("#date-to").fill("2026-11-05");
  await dailyPage.locator("#date-to").dispatchEvent("change"); // selected range automatically opens complete archive
  await dailyPage.locator("#history-count").getByText("151 matching papers").waitFor({timeout:12000});
  assert.equal(await dailyPage.locator("#history-cards article").count(),25);
  assert((await dailyPage.locator("#history-pagination").innerText()).includes("Page 1 of 7"));
  await dailyPage.locator("#history-pagination button").filter({hasText:"Next"}).click();
  assert((await dailyPage.locator("#history-pagination").innerText()).includes("Page 2 of 7"));
  assert.equal(await dailyPage.locator("#history-cards article").count(),25);
  await dailyContext.close();

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

  // Narrow phone widths: no horizontal document scrolling, and navigation is
  // visible with all four destinations. Optional account settings stay outside
  // the primary bottom bar.
  for(const width of [360,390,430]){
   const phone=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true});
   await phone.route("https://api.openalex.org/**",route=>route.fulfill({status:200,contentType:"application/json",body:"{\"meta\":{\"count\":0},\"results\":[]}"}));
   await phone.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
   const mobile=await phone.newPage();
   mobile.on("pageerror",err=>errors.push(mobile.url()+": "+err.message));
   for(const url of ["/","/#workspace","/copilot.html","/lab.html","/profiles.html","/community.html"]){
    await mobile.goto(base+url,{waitUntil:"domcontentloaded"});
    await mobile.locator(".rl-nav a").first().waitFor({timeout:12000});
    if(url==="/#workspace")await mobile.locator("#library-list").waitFor({timeout:12000});
    const metrics=await mobile.evaluate(()=>({
      viewport:document.documentElement.clientWidth,
      page:document.documentElement.scrollWidth,
      menu:document.querySelectorAll(".rl-nav a").length
    }));
    assert(metrics.page<=metrics.viewport+3,"Phone "+width+" "+url+" horizontal overflow: "+JSON.stringify(metrics));
    assert.equal(metrics.menu,3,"There should be three primary destinations");
   }
   await phone.close();
  }


  assert.deepEqual(errors,[],"Unexpected JavaScript exceptions");
  console.log("Browser smoke passed: responsive focus, source search, saved arXiv vN, 7 routes and redirects.");
 }finally{
  await context.close();await browser.close()
 }
})().catch(err=>{console.error(err);process.exitCode=1});
