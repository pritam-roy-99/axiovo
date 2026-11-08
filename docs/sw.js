/* Axiovo offline shell. Scholarly metadata, video and PDFs stay network-only. */
"use strict";
const CACHE = "axiovo-shell-v89";
const SHELL = [
  "./", "./index.html", "./desk.html", "./feed.html", "./workspace.html", "./arxiv.html", "./biorxiv.html", "./chemrxiv.html", "./crypto.html",
  "./theme.css", "./axiovo-shell.css?v=20261107-mobile-ui-v1", "./home-landing.css?v=20261107-mobile-ui-v1", "./home-tour.js?v=20261107-video-stability-v1", "./theme.js", "./research-entry.css", "./research-entry.js",
  "./source-pulse.js", "./assets/axiovo-tour-poster.svg?v=four-sources-2", "./citation-evidence.js?v=20261107-verified2", "./citation-evidence.css?v=20261107-verified2", "./navigation.js", "./navigation.js?v=20261107-home-return-v4", "./pwa.js", "./copilot.js?v=20261107-research-reliability-v2", "./eprint-source.js?v=20261107-history-v4", "./paper-sort.js", "./feed.js", "./feed-rank-worker.js", "./feed-core.js", "./feed-preferences.js", "./feed-preview.js", "./feed.css?v=20261107-mobile-ui-v1", "./topic-explorer.css", "./topic-explorer.js?v=20261107-history-v1", "./topic-atlas.js",
  "./crypto.css?v=20261107-custom-paths-v2", "./crypto-topics.js?v=20261107-custom-paths-v2", "./eprint-source.js?v=20261107-history-v4", "./crypto.js?v=20261107-history-v1", "./archive-taxonomy.js", "./archive-data.js?v=20261107-history-v2", "./arxiv-daily-archive.js", "./arxiv-versions.js", "./searchable-select.js",
  "./data/topics/arxiv.tsv", "./data/topics/biorxiv.tsv", "./data/topics/chemrxiv.tsv",
  "./abstract-audio.js?v=20261108-android-gesture-v4", "./author-follow.js", "./following-authors.js", "./research-workspace.css", "./research-desk.js?v=20261107-history-v2", "./research-desk.css", "./zotero-ris.js",
  "./workspace.js", "./workspace.css", "./paper-actions.css", "./paper-card-polish.css?v=20261106-save2", "./research-workflow.css",
  "./interests.js", "./relevance.js", "./research-intelligence.js", "./recommendation-cards.css?v=20261106-actions", "./axiovo-shell.css?v=20261107-mobile-ui-v1",
  "./manifest.webmanifest", "./icons/axiovo.svg"
];
const LEGACY = /^(?:researchlens|litveyra|axiovo)-shell-/;
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Only precache the navigation shell. Fetching every script, CSS and topic
      // file concurrently on first install saturates mobile CPU/network.
      // Other assets are still cached on demand by the fetch handler.
      const essentials = ["./", "./index.html", "./theme.css",
        "./navigation.js", "./pwa.js", "./manifest.webmanifest"];
      const results = await Promise.allSettled(essentials.map(url => cache.add(url)));
      const failed = results.map((value,index)=>value.status==="rejected"?essentials[index]:null).filter(Boolean);
      if(failed.length)console.warn("Axiovo: essential offline assets unavailable",failed);
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
