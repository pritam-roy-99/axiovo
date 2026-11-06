"""Free-only hosted research AI integration regression checks."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
WORKER=(ROOT/"worker/ai-gateway.js").read_text(encoding="utf-8")
CONFIG=(ROOT/"docs/hosted-ai-config.js").read_text(encoding="utf-8")
UI=(ROOT/"docs/copilot.html").read_text(encoding="utf-8")
SCRIPT=(ROOT/"docs/copilot.js").read_text(encoding="utf-8")
WRANGLER=(ROOT/"worker/wrangler.toml").read_text(encoding="utf-8")

class FreeHostedAITests(unittest.TestCase):
    def test_free_only_allowed_models(self):
        for model in ("nvidia/nemotron-3-ultra-550b-a55b:free",
                      "openai/gpt-oss-120b:free","openrouter/free"):
            self.assertIn(model,WORKER)
            self.assertIn(model,UI)
        self.assertIn("FREE_MODELS.has(requestedModel)",WORKER)
        self.assertIn("Non-free models are disabled by default",WORKER)
        self.assertIn('env.ENABLE_PAID_PROVIDERS!=="EXPLICITLY_APPROVED"',WORKER)
    def test_backend_secrets_never_configured_in_public_files(self):
        self.assertIn('endpoint:""',CONFIG)
        self.assertIn('turnstileSiteKey:""',CONFIG)
        self.assertNotIn("sk-or-",CONFIG)
        self.assertNotIn("sk-proj-",CONFIG)
        self.assertIn("RATE_LIMIT_KV",WORKER)
        self.assertIn("validatedChallenge",WORKER)
        self.assertIn("if(origin!==ORIGIN)",WORKER)
    def test_browser_uses_secure_gateway_with_model_allowlist(self):
        self.assertIn('id="free-hosted-model"',UI)
        self.assertIn('model:$("free-hosted-model")?.value',SCRIPT)
        self.assertIn("lastHostedModel=String(body.model",SCRIPT)
        self.assertIn("Hosted AI is not configured",SCRIPT)
    def test_default_is_verified_free_endpoint(self):
        self.assertIn('MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"',WRANGLER)
        self.assertIn('model:"nvidia/nemotron-3-ultra-550b-a55b:free"',CONFIG)
        self.assertIn('provider:"openrouter"',CONFIG)

if __name__=="__main__":
    unittest.main()
