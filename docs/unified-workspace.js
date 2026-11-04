/* One entry point for Discover and Workspace. Legacy workspace.html supplies
 * the reusable workspace markup, while its controls and data stay unchanged.
 * The same page origin preserves researchlens-* browser-local saved data.
 */
(function () {
  "use strict";
  const discover = document.getElementById("discover-shell");
  const panel = document.getElementById("workspace-panel");
  const navDiscover = document.getElementById("workflow-discover");
  const navWorkspace = document.getElementById("workflow-workspace");
  if (!discover || !panel) return;
  let mounting = null;
  function script(url) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = url;
      el.onload = resolve;
      el.onerror = () => reject(new Error("Unable to load " + url));
      document.body.appendChild(el);
    });
  }
  function mountWorkspace() {
    if (mounting) return mounting;
    mounting = (async () => {
      const response = await fetch("./workspace.html", {cache:"no-store"});
      if (!response.ok) throw new Error("Workspace view unavailable (HTTP " + response.status + ")");
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const main = doc.querySelector("main.rl-workspace");
      if (!main) throw new Error("Workspace content is missing");
      panel.replaceChildren(...Array.from(main.children));
      await script("./relevance.js");
      await script("./workspace.js");
      await script("./research-intelligence.js");
      window.dispatchEvent(new Event("researchlens:workspace-activated"));
    })().catch((error) => {
      mounting = null;
      const message = document.createElement("p");
      message.setAttribute("role","alert");
      message.textContent = error.message + ". The standalone workspace remains available.";
      panel.replaceChildren(message);
      const fallback = document.createElement("a");
      fallback.href = "./workspace.html?standalone=1";
      fallback.textContent = "Open standalone workspace";
      panel.appendChild(fallback);
    });
    return mounting;
  }
  async function render() {
    const showWorkspace = location.hash === "#workspace" || location.hash === "#library";
    discover.hidden = showWorkspace;
    panel.hidden = !showWorkspace;
    if (navDiscover) navDiscover.setAttribute("aria-current", showWorkspace ? "false" : "page");
    if (navWorkspace) navWorkspace.setAttribute("aria-current", showWorkspace ? "page" : "false");
    if (showWorkspace) await mountWorkspace();
    if (showWorkspace) window.scrollTo(0,0);
    else if (location.hash === "#discover") document.getElementById("discover")?.scrollIntoView({block:"start"});
    else window.scrollTo(0,0);
    if (showWorkspace) window.dispatchEvent(new Event("researchlens:workspace-activated"));
  }
  window.addEventListener("hashchange", render);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
