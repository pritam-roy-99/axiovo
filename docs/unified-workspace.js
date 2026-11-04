/* Axiovo: a single Discover / Workspace navigation and storage experience.
 * The existing Workspace HTML remains the canonical markup; scripts are
 * mounted only once. Browser-local storage keys are deliberately unchanged.
 */
(function () {
  "use strict";
  const discover = document.getElementById("discover-shell");
  const workspace = document.getElementById("workspace-panel");
  const firstTab = document.getElementById("workflow-discover");
  const secondTab = document.getElementById("workflow-workspace");
  if (!discover || !workspace || !firstTab || !secondTab) return;
  let loading = null;
  let loaded = false;
  let transition = 0;

  function script(url) {
    return new Promise((resolve, reject) => {
      const element = document.createElement("script");
      element.src = url;
      element.onload = resolve;
      element.onerror = () => reject(new Error("Cannot load " + url));
      document.body.appendChild(element);
    });
  }

  async function loadWorkspace() {
    if (loaded) return;
    if (loading) return loading;
    loading = (async () => {
      const response = await fetch("./workspace.html", {cache:"no-store"});
      if (!response.ok) throw new Error("Workspace unavailable: HTTP " + response.status);
      const html = new DOMParser().parseFromString(await response.text(), "text/html");
      const main = html.querySelector("main.rl-workspace");
      if (!main) throw new Error("Workspace content could not be found");
      workspace.replaceChildren(...Array.from(main.children));
      await script("./relevance.js");
      await script("./workspace.js");
      await script("./research-intelligence.js");
      loaded = true;
    })();
    try { await loading; }
    catch (error) {
      const message = document.createElement("p");
      message.setAttribute("role","alert");
      message.textContent = error.message + ". Your saved data has not been changed.";
      const link = document.createElement("a");
      link.href = "./workspace.html?standalone=1";
      link.textContent = "Open the standalone workspace";
      workspace.replaceChildren(message,link);
      // A failed script can leave some earlier scripts initialized; do not
      // automatically rerun them against duplicate DOM handlers.
    } finally { loading = null; }
  }

  function currentView() {
    return /^#(?:workspace|library)$/.test(location.hash) ? "workspace" : "discover";
  }

  function updateNavigation(view) {
    const inWorkspace = view === "workspace";
    discover.hidden = inWorkspace;
    workspace.hidden = !inWorkspace;
    for (const [link,active] of [[firstTab,!inWorkspace],[secondTab,inWorkspace]]) {
      if (active) link.setAttribute("aria-current","page");
      else link.removeAttribute("aria-current");
    }
    document.querySelectorAll(".rl-global-header .rl-nav a").forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (href === "./#discover" || href === "./#workspace") {
        const active = inWorkspace ? href === "./#workspace" : href === "./#discover";
        if (active) link.setAttribute("aria-current","page");
        else link.removeAttribute("aria-current");
      }
    });
  }

  async function show() {
    const request = ++transition;
    const view = currentView();
    updateNavigation(view);
    if (view === "workspace") {
      await loadWorkspace();
      if (request !== transition || currentView() !== view) return;
      if (loaded) window.dispatchEvent(new Event("researchlens:workspace-activated"));
    }
    if (request !== transition) return;
    if (view === "discover" && location.hash === "#discover") {
      document.getElementById("discover")?.scrollIntoView({block:"start"});
    } else {
      window.scrollTo(0,0);
    }
  }

  function navigateToDiscover(query) {
    const q = String(query || "").trim();
    const url = new URL(location.href);
    url.searchParams.set("view","scholarly");
    if (q) url.searchParams.set("q",q);
    url.hash = "discover";
    // Push a history entry instead of reloading and losing current form state.
    window.history.pushState({view:"discover",q},"",url.pathname+url.search+url.hash);
    const scholar = document.getElementById("rl-source-scholarly");
    scholar?.click();
    show();
    if (!q) return;
    const input = document.getElementById("scholar-query");
    if (input) input.value = q.slice(0,250);
    // Scholarly search is lazy-initialized when the source selector is clicked.
    // Allow the existing initialization callback to bind submit handlers.
    queueMicrotask(() => {
      const form = document.getElementById("scholar-search-form");
      if (form?.onsubmit) form.requestSubmit();
    });
  }

  window.addEventListener("hashchange",show);
  window.addEventListener("popstate",show);
  window.addEventListener("axiovo:discover-search",event=>navigateToDiscover(event.detail?.query));
  window.addEventListener("researchlens-library-change",()=>{
    if (loaded) window.dispatchEvent(new Event("researchlens:workspace-activated"));
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",show);
  else show();
})();
