/* Axiovo offline shell. Scholarly metadata, video and PDFs stay network-only. */
"use strict";
const CACHE = "axiovo-shell-v109";
const SHELL = [
  "./", "./index.html", "./workspace.html", "./icons/axiovo.svg",
  "./manifest.webmanifest", "./icons/axiovo-192.png", "./icons/axiovo-512.png", "./theme.css", "./research-entry.css", "./axiovo-shell.css?v=20261108-mobile-research-v3",
  "./research-desk.css", "./home-landing.css?v=20261107-mobile-ui-v1", "./theme.js", "./research-entry.js",
  "./research-hub.html", "./research-hub.css", "./research-hub.js",
  "./navigation.js?v=20261111-no-flash-v1", "./axiovo-blueprint-ui.js?v=20261111-no-flash-v1", "./axiovo-blueprint-ui.css?v=20261111-reference", "./axiovo-page-design-v4.css?v=20261111-complete-v1", "./axiovo-page-design-v4.js?v=20261111-complete-v1", "./icons/axiovo-approved.svg", "./axiovo-robot-help.js?v=20261111-p0p1-v1", "./archive-taxonomy.js", "./arxiv-versions.js", "./archive-data.js",
  "./author-follow.js", "./feed-preferences.js", "./feed-core.js", "./feed-preview.js",
  "./source-pulse.js", "./pwa.js", "./voice-search.js?v=20261109-visible-v2", "./assets/axiovo-tour-poster.svg?v=four-sources-2", "./home-tour.js?v=20261108-video-recovery-v2",
  "./workspace.css", "./paper-actions.css", "./paper-card-polish.css?v=20261106-save2", "./research-workflow.css",
  "./citation-evidence.js?v=20261107-verified2", "./citation-evidence.css?v=20261107-verified2", "./paper-sort.js", "./abstract-audio.js?v=20261108-android-recovery-v6",
  "./workspace.js", "./interests.js", "./relevance.js", "./research-intelligence.js",
  "./research-workspace.css?v=20261108-mobile-research-v1", "./recommendation-cards.css?v=20261106-actions", "./following-authors.js",
];
const LEGACY = /^(?:researchlens|litveyra|axiovo)-shell-/;
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Install the Home and Library shell in small batches. If an asset is
      // unavailable, keep the previous worker until a complete shell can install.
      for (let start=0; start<SHELL.length; start+=4) {
        const batch=SHELL.slice(start,start+4).map(url=>new Request(url,{
          cache:url==="./"||url.endsWith(".html")?"reload":"default"
        }));
        await cache.addAll(batch);
      }
    }).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => LEGACY.test(k) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
function isShell(url) {
  if (url.origin !== self.location.origin) return false;
  return /\/data\/topics\/(arxiv|biorxiv|chemrxiv)\.tsv$/.test(url.pathname) || url.pathname.endsWith("/") || /\.(?:html|js|css|svg|webmanifest)$/.test(url.pathname);
}
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (!isShell(url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Navigation always revalidates HTML on the network, including after a new deployment.
      // Only fall back to the offline shell when the network genuinely fails.
      const response = await fetch(req, req.mode === "navigate" ? {cache:"no-store"} : undefined);
      if (response.ok && response.type === "basic") {
        event.waitUntil(cache.put(req.mode === "navigate" ? url.origin + url.pathname : req, response.clone()));
      }
      return response;
    } catch (_) {
      return await cache.match(req.mode === "navigate" ? url.origin + url.pathname : req)
        || (req.mode === "navigate" ? await cache.match("./index.html") : Response.error());
    }
  })());
});
