"""Deployment policy must not block UI fixes on slow scholarly metadata refresh."""
from pathlib import Path
import re
import unittest

WORKFLOW=(Path(__file__).resolve().parents[1]/".github"/"workflows"/"pages.yml").read_text()

class DeploymentPolicyTests(unittest.TestCase):
    def test_refresh_runs_in_dedicated_scheduled_workflow(self):
        sync=(Path(__file__).resolve().parents[1]/".github"/"workflows"/"sync-all-sources.yml").read_text()
        for label in ("Refresh research metadata", "Refresh free bioRxiv metadata"):
            # Full site deployment never blocks on an external API.
            self.assertIn("if: github.event_name == 'schedule'",WORKFLOW)
        self.assertNotIn("  schedule:",WORKFLOW)
        self.assertIn("cron: '18 * * * *'",sync)
        self.assertIn("workflow_dispatch:",sync)
        self.assertIn("gh workflow run pages.yml",sync)
    def test_metadata_commits_cannot_cancel_running_video_publication(self):
        self.assertIn("group: axiovo-pages",WORKFLOW)
        self.assertIn("cancel-in-progress: false",WORKFLOW)
    def test_code_deploys_after_successful_checks_without_external_refresh(self):
        self.assertIn("python scripts/security_audit.py",WORKFLOW)
        self.assertIn("node tests/library-outside-cache.test.js",WORKFLOW)
        self.assertIn("steps.deployment.outputs.page_url",WORKFLOW)
        self.assertIn("if: steps.refresh.outcome == 'success'",WORKFLOW)

if __name__=="__main__":
    unittest.main()
