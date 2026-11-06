/* Axiovo v40: small, verified offline shell. Remote search and PDFs stay network-only. */
"use strict";
const CACHE = "axiovo-shell-v53";
const SHELL = [
  "./", "./index.html", "./desk.html", "./feed.html", "./arxiv.html", "./biorxiv.html", "./chemrxiv.html",
  "./theme.css", "./axiovo-shell.css", "./theme.js", "./research-entry.css", "./research-entry.js",
  "./navigation.js", "./pwa.js", "./paper-sort.js", "./feed.js", "./feed-core.js", "./feed-preferences.js", "./feed-preview.js", "./feed.css", "./topic-explorer.css", "./topic-explorer.js", "./topic-atlas.js",
  "./archive-taxonomy.js", "./archive-data.js", "./arxiv-daily-archive.js", "./arxiv-versions.js",
  "./data/topics/arxiv.tsv", "./data/topics/biorxiv.tsv", "./data/topics/chemrxiv.tsv",
  "./abstract-audio.js", "./author-follow.js", "./following-authors.js", "./research-workspace.css", "./research-desk.js", "./research-desk.css", "./zotero-ris.js", "./manifest.webmanifest", "./icons/axiovo.svg"
];
const LEGACY = /^(?:researchlens|litveyra|axiovo)-shell-/;
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      const results = await Promise.allSettled(SHELL.map(url => cache.add(url)));
      const failed = results.map((value, index) => value.status === "rejected" ? SHELL[index] : null).filter(Boolean);
      if (failed.length) console.warn("Axiovo: optional offline assets unavailable", failed);
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
  if (url.origin !== self.location.origin || url.search) return false;
  return /\/data\/topics\/(arxiv|biorxiv|chemrxiv)\.tsv$/.test(url.pathname) || url.pathname.endsWith("/") || /\.(?:html|js|css|svg|webmanifest)$/.test(url.pathname);
}
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (!isShell(url)) return; // Never intercept video, remote APIs, feed, PDF or custom queries.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(req);
      if (response.ok && response.type === "basic") {
        event.waitUntil(cache.put(new Request(url.origin + url.pathname), response.clone()));
      }
      return response;
    } catch (_) {
      return await cache.match(new Request(url.origin + url.pathname))
        || (req.mode === "navigate" ? await cache.match("./index.html") : Response.error());
    }
  })());
});
