# Axiovo independent archive synchronization watchdog

This Cloudflare Worker runs every 30 minutes, independently of GitHub Actions' cron service. It checks the primary `sync-all-sources.yml` workflow. If no run is active and no attempt started in the previous 40 minutes, it dispatches the workflow.

## One-time activation (requires Cloudflare account)

1. In Cloudflare Workers, create/deploy this Worker from the `ops/cloudflare-archive-monitor` directory, using Wrangler or the dashboard.
2. Create a fine-grained GitHub token restricted to `pritam-roy-99/axiovo`, with **Actions: Read and write**. Store it only as the encrypted Cloudflare Worker secret `GITHUB_TOKEN`. Do not commit it or paste it into chat.
3. From this directory, run `npx wrangler secret put GITHUB_TOKEN`, then `npx wrangler deploy` after authenticating with `npx wrangler login`.
4. Verify the Cloudflare cron trigger `7,37 * * * *` and observe Cron Events. Cloudflare uses UTC. Allow time for propagation.
5. Optionally create a Healthchecks.io check with a 30-minute period and appropriate grace (for example 30 minutes). Add its ping URL as secret `HEALTHCHECKS_PING_URL` and its failure URL as `HEALTHCHECKS_FAIL_URL`. This heartbeat monitors the external scheduler, **not** freshness of the archives.
6. For actual data freshness, independently inspect `docs/data/source-freshness.json` on the deployed website and alert according to each archive's expected publication calendar. Avoid declaring arXiv stale on weekends or holidays.

## Security and reliability

The Worker exposes no public dispatch endpoint. GitHub API requests use a repository-scoped secret. If GitHub API fails, the Worker fails visibly and can ping the monitor's failure endpoint. Duplicate dispatches are suppressed when a workflow is active or recently started. Cloudflare and GitHub schedules are best-effort, not an uptime guarantee.

## Verify

After deployment, inspect Cloudflare Cron Events and GitHub Actions. A run dispatched by this Worker should show event `workflow_dispatch`. Confirm it completes, publishes verified data if changed, and deploys the site.
