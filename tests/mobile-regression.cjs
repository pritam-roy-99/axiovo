/* Mobile regression matrix. Run from repository root:
 * python3 -m http.server 8765 --directory docs
 * node tests/mobile-regression.cjs
 * Requires: npm install --no-save playwright && npx playwright install chromium
 *
 * Deliberately uses DOMContentLoaded so remote literature APIs do not block QA.
 * Tests layout and navigation. It does not assert live API accuracy or TTS output.
 */
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.AXIOVO_TEST_BASE || "http://127.0.0.1:8765";
const routes = [
 "index.html", "desk.html", "arxiv.html", "biorxiv.html",
 "chemrxiv.html", "crypto.html", "feed.html", "workspace.html",
 "copilot.html", "lab.html", "profiles.html", "paper.html"
];
const sizes = [
 {name:"small Android",width:320,height:700},
 {name:"compact Android",width:360,height:740},
 {name:"typical Android",width:390,height:844},
 {name:"large Android",width:428,height:926},
 {name:"landscape",width:844,height:390}
];
(async () => {
 const browser = await chromium.launch({headless:true});
 const failures = [];
 try {
  for (const size of sizes) {
   const context = await browser.newContext({
    viewport:{width:size.width,height:size.height},
    isMobile:true,hasTouch:true,deviceScaleFactor:2
   });
   const page = await context.newPage();
   const errors = [];
   page.on("pageerror",e=>errors.push(e.message));
   for (const path of routes) {
    errors.length=0;
    try {
     await page.goto(base+"/"+path,{waitUntil:"domcontentloaded",timeout:25000});
     await page.locator("header.rl-global-header").waitFor({timeout:10000});
     const report = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      const header = document.querySelector("header.rl-global-header");
      const logo = header?.querySelector(".rl-logo");
      const nav = header?.querySelector(".rl-nav");
      const settings = header?.querySelector(".rl-settings-link");
      const rect = el=>el?.getBoundingClientRect();
      const visible = el=>!!(el && rect(el).width>0 && rect(el).height>0);
      const tooWide = [...document.querySelectorAll("main *")].filter(el=>{
       const r=el.getBoundingClientRect();
       const style=getComputedStyle(el);
       return r.width>viewport+3 &&
         style.position!=="fixed" && style.position!=="absolute" &&
         style.overflowX!=="auto" && style.overflowX!=="scroll" &&
         !el.closest(".rl-nav");
      }).slice(0,5).map(el=>({tag:el.tagName,cls:String(el.className).slice(0,90),width:Math.round(el.getBoundingClientRect().width)}));
      return {
       viewport,documentWidth:document.documentElement.scrollWidth,
       headerVisible:visible(header),logoVisible:visible(logo),
       navVisible:visible(nav),settingsVisible:visible(settings),
       navScrollable:!!nav && nav.scrollWidth>nav.clientWidth+2,
       navCanScroll:!!nav && ["auto","scroll"].includes(getComputedStyle(nav).overflowX),
       tooWide
      };
     });
     assert(report.headerVisible && report.logoVisible && report.navVisible && report.settingsVisible,
      "Header or navigation control is hidden: "+JSON.stringify(report));
     assert(report.documentWidth <= report.viewport+3,
      "Horizontal document overflow: "+JSON.stringify(report));
     assert(!report.navScrollable || report.navCanScroll,
      "Navigation is clipped without scroll: "+JSON.stringify(report));
     assert.equal(report.tooWide.length,0,"Oversize main elements: "+JSON.stringify(report.tooWide));
     assert.equal(errors.length,0,"Uncaught JS errors: "+errors.join("; "));
    } catch(e) {
     failures.push(size.name+" ("+size.width+"x"+size.height+") "+path+": "+e.message);
    }
   }
   // Back/Home navigation and data persistence: no source fetch required.
   try {
    await page.goto(base+"/index.html",{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>localStorage.setItem("axiovo-mobile-qa-preserve","yes"));
    await page.goto(base+"/feed.html",{waitUntil:"domcontentloaded"});
    await page.locator(".axiovo-home-link").click();
    await page.waitForURL(url=>url.pathname.endsWith("/index.html") && url.searchParams.has("axiovo_return"));
    assert.equal(await page.evaluate(()=>localStorage.getItem("axiovo-mobile-qa-preserve")),"yes");
    assert(await page.locator("#axiovo-home-video").count()===1);
    await page.evaluate(()=>localStorage.removeItem("axiovo-mobile-qa-preserve"));
   } catch(e) {
    failures.push(size.name+" navigation/persistence: "+e.message);
   }
   await context.close();
  }
 } finally { await browser.close(); }
 if(failures.length) {
  console.error("Mobile regression failures ("+failures.length+"):\n"+failures.map(x=>" - "+x).join("\n"));
  process.exitCode=1;
 } else console.log("Mobile regression passed: "+sizes.length+" viewports, "+routes.length+" routes, navigation and persistence.");
})().catch(e=>{console.error(e);process.exitCode=1});
