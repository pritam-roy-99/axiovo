/* Public configuration only. Never put API tokens or secrets in this file.
 * A separately deployed server proxy is required before hosted mode can run.
 * Leave endpoint empty until the operator configures Cloudflare Worker + Turnstile.
 */
window.AxiovoHostedAIConfig=Object.freeze({
 endpoint:"",
 turnstileSiteKey:"",
 provider:"openrouter",
 model:"nvidia/nemotron-3-ultra-550b-a55b:free",
 status:"not-configured"
});
