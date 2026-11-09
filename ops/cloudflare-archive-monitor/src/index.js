// External archive synchronization watchdog. GITHUB_TOKEN and optional HEALTHCHECKS_PING_URL are Worker secrets.
const REPO = "pritam-roy-99/axiovo";
const WORKFLOW = "sync-all-sources.yml";
const API = "https://api.github.com/repos/" + REPO;
const HEADERS = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "axiovo-archive-monitor" };

async function github(path, token, init = {}) {
  const response = await fetch(API + path, {
    ...init,
    headers: { ...HEADERS, Authorization: "Bearer " + token, ...(init.headers || {}) }
  });
  if (!response.ok) throw new Error("GitHub API " + response.status + " for " + path);
  return response.status === 204 ? null : response.json();
}

export async function checkAndDispatch(env, now = Date.now()) {
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN secret is required");
  const data = await github("/actions/workflows/" + WORKFLOW + "/runs?per_page=30", env.GITHUB_TOKEN);
  const runs = data.workflow_runs || [];
  const active = runs.some(r => r.status === "queued" || r.status === "in_progress" || r.status === "waiting" || r.status === "pending");
  const recent = runs.some(r => {
    const elapsed = now - Date.parse(r.created_at);
    return elapsed >= 0 && elapsed < 20 * 60 * 1000;
  });
  if (active || recent) {
    console.log(JSON.stringify({ outcome: "skip", active, recent, checked_at: new Date(now).toISOString() }));
    return { outcome: "skip", active, recent };
  }
  await github("/actions/workflows/" + WORKFLOW + "/dispatches", env.GITHUB_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main" })
  });
  console.log(JSON.stringify({ outcome: "dispatched", checked_at: new Date(now).toISOString() }));
  return { outcome: "dispatched" };
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const result = await checkAndDispatch(env);
        // Optional monitoring heartbeat means the external scheduler itself executed successfully.
        // It does not certify archive freshness or successful GitHub deployment.
        if (env.HEALTHCHECKS_PING_URL) {
          const response = await fetch(env.HEALTHCHECKS_PING_URL, { method: "POST" });
          if (!response.ok) throw new Error("Monitor ping HTTP " + response.status);
        }
        return result;
      } catch (error) {
        console.error("Archive watchdog failed:", String(error));
        if (env.HEALTHCHECKS_FAIL_URL) {
          try { await fetch(env.HEALTHCHECKS_FAIL_URL, { method: "POST" }); } catch (pingError) { console.error("Failure notification failed", String(pingError)); }
        }
        throw error;
      }
    })());
  }
};
