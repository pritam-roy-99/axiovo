# Axiovo optional secure AI gateway

This Worker is **not deployed by the repository's GitHub Pages workflow**.
The free, source-evidence and local-model modes work without it. No paid
service should be activated until the site operator explicitly approves it.

## Why a gateway?

GitHub Pages is static. Any API key placed in JavaScript, HTML, localStorage
or a browser request becomes available to visitors. The gateway stores provider
credentials only as server-side secrets and makes model calls from Cloudflare.

## Deployment (administrator only)

1. Create a Cloudflare account and review the current free-tier limits and
   privacy terms before deploying. No provider or Cloudflare account is
   provisioned by Axiovo automatically.
2. Install Wrangler locally and run it from this `worker/` directory.
3. Create a KV namespace and replace the placeholder `id` in
   `wrangler.toml`. Set `RATE_SALT` to a random private secret.
4. Configure Cloudflare Turnstile for `pritam-roy-99.github.io`.
5. Add secret values using `wrangler secret put API_KEY`,
   `wrangler secret put TURNSTILE_SECRET_KEY`, and
   `wrangler secret put RATE_SALT`. Never commit them.
6. Review `PROVIDER` and `MODEL`. The default only permits
   `openrouter/free` (or `:free` models). Other providers require deliberate
   separate approval and `ENABLE_PAID_PROVIDERS=EXPLICITLY_APPROVED`.
7. Deploy the Worker; verify Turnstile, origin restriction, daily rate limit,
   CORS, no request-content logging, and provider error handling.
8. Only after that, set the published Worker HTTPS
   `/v1/answer` endpoint, its Turnstile *public site key*, and approved
   provider/model in `docs/hosted-ai-config.js`.
9. Rebuild GitHub Pages and retest the Research Assistant.
10. Add provider request quotas and spending caps in the provider account.

No backend API key should ever appear in `docs/`. Browser communication sends
the research prompt and source abstracts to the selected provider via the
Worker, so users must be told that confidential or unpublished data will leave
their browser before activating this optional mode.

This gateway is a **prepared integration, not a live hosted AI service**.
The current evidence-only, Ollama and WebGPU modes remain the default.
