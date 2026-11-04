/* The Discover and Workspace views share the homepage and the same browser-local
 * reading library. Keep URL query parameters, source selection and view synchronized.
 * The old workspace.html remains an independently usable fallback.
 */
(function () {
  "use strict";
  const discover = document.getElementById("discover-shell");
  const panel = document.getElementById("workspace-panel");
  const navDiscover = document.getElementById("workflow-discover");
  const navWorkspace = document.getElementById("workflow-workspace");
  if (!discover || !panel) return;

  let mounting = null;
  let renderSerial = 0;

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load " + url));
      document.body.appendChild(script);
    });
  }

  function mountWorkspace() {
    if (mounting) return mounting;
    mounting = (async () => {
      const response = await fetch("./workspace.html", {cache: "no-store"});
      if (!response.ok) throw new Error("Workspace unavailable (HTTP " + response.status + ")");
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const main = doc.querySelector("main.rl-workspace");
      if (!main) throw new Error("Workspace content was not found");
      panel.replaceChildren(...Array.from(main.children));
      await loadScript("./relevance.js");
      await loadScript("./workspace.js");
      await loadScript("./research-intelligence.js");
    })().catch(error => {
      mounting = null;
      const message = document.createElement("p");
      message.setAttribute("role", "alert");
      message.textContent = error.message + ". You can still open the standalone workspace.";
      const fallback = document.createElement("a");
      fallback.href = "./workspace.html?standalone=1";
      fallback.textContent = "Open standalone workspace";
      panel.replaceChildren(message, fallback);
    });
    return mounting;
  }

  function workspaceRoute() {
    return location.hash === "#workspace" || location.hash === "#library";
  }

  async function render() {
    const token = ++renderSerial;
    const workspace = workspaceRoute();
    discover.hidden = workspace;
    panel.hidden = !workspace;
    if (navDiscover) {
      if (workspace) navDiscover.removeAttribute("aria-current");
      else navDiscover.setAttribute("aria-current", "page");
    }
    if (navWorkspace) {
      if (workspace) navWorkspace.setAttribute("aria-current", "page");
      else navWorkspace.removeAttribute("aria-current");
    }
    document.querySelectorAll(".rl-global-header .rl-nav a").forEach(a => {
      if (a.hash === "#workspace") {
        if (workspace) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      } else if (a.hash === "#discover") {
        if (!workspace) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      }
    });
    if (workspace) await mountWorkspace();
    if (token !== renderSerial) return;
    if (workspace) {
      window.dispatchEvent(new Event("researchlens:workspace-activated"));
      window.scrollTo(0, 0);
    } else if (location.hash === "#discover") {
      document.getElementById("discover")?.scrollIntoView({block: "start"});
    } else window.scrollTo(0, 0);
  }

  /* Internal view switches must not erase ?view=scholarly, ?q=..., date
   * filters or other search context just because their href is ./#workspace. */
  document.addEventListener("click", event => {
    const anchor = event.target.closest?.("a[href]");
    if (!anchor || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        anchor.target && anchor.target !== "_self") return;
    const url = new URL(anchor.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname ||
        !["#discover", "#workspace", "#library"].includes(url.hash)) return;
    if (url.hash === "#discover" && url.searchParams.get("view") === "scholarly" &&
        [...url.searchParams.keys()].length === 1) {
      event.preventDefault();
      document.getElementById("rl-source-scholarly")?.click();
      return;
    }
    if (url.search && url.search !== location.search) return;
    event.preventDefault();
    const next = new URL(location.href);
    next.hash = url.hash;
    if (next.href !== location.href) history.pushState({}, "", next.href);
    render();
  });

  window.addEventListener("hashchange", render);
  window.addEventListener("popstate", render);
  /* Discover's source toggle changes the URL with replaceState, which by
   * design does not dispatch hashchange or popstate. */
  window.addEventListener("researchlens:discover-navigation", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
