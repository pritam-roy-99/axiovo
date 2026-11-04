/* ResearchLens offline shell. Do not cache remote APIs, PDFs or the live feed. */
"use strict";
const CACHE = "axiovo-shell-v3";
const SHELL = [
  "./", "./index.html", "./workspace.html", "./copilot.html",
  "./lab.html", "./paper.html", "./profiles.html", "./methodology.html",
  "./theme.css", "./theme.js", "./workspace.css", "./discover.css",
  "./lab.css", "./paper-actions.css", "./navigation.js", "./pwa.js",
  "./research-fields.js", "./focus-bar.js", "./scholar-search.js",
  "./cached-arxiv-search.js", "./semantic-search.js", "./interests.js",
  "./scholarly.js", "./discover.js", "./history.js", "./arxiv-versions.js",
  "./assistant-core.js", "./copilot.js", "./lab.js", "./workspace.js",
  "./paper.js", "./profiles.js", "./profiles-social.js", "./social.js",
  "./social-config.js", "./cloud-sync.js", "./relevance.js",
  "./research-intelligence.js", "./unified-workspace.js", "./data/feed.json", "./manifest.webmanifest", "./icons/researchlens.svg"
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(SHELL.map((url) => cache.add(url))).then((results) => {
        const failures = results.filter((x) => x.status === "rejected");
        if (failures.length) console.warn("Axiovo shell: some assets unavailable", failures.length);
      })
    ).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => (name.startsWith("researchlens-shell-") || name.startsWith("litveyra-shell-") || name.startsWith("axiovo-shell-")) && name !== CACHE)
        .map((name) => caches.delete(name)))),
    self.clients.claim()
  ]));
});
function shellRequest(url) {
  return url.origin === self.location.origin &&
    (url.pathname.endsWith("/") || url.pathname.endsWith("/data/feed.json") || /\.(?:html|js|css|svg|webmanifest)$/.test(url.pathname));
}
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!shellRequest(url)) return;
  // Avoid caching dynamic query URLs (paper IDs, searches). The page shell itself
  // is cached without a query string, but online requests stay authoritative.
  const key = new Request(url.origin + url.pathname);
  event.respondWith(
    fetch(req).then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(key, copy)));
      }
      return response;
    }).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(key)) ||
        (req.mode === "navigate" ? await cache.match("./index.html") : Response.error());
    })
  );
});
