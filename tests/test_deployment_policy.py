"""Deployment policy must not block UI fixes on slow scholarly metadata refresh."""
from pathlib import Path
import re
import unittest

WORKFLOW=(Path(__file__).resolve().parents[1]/".github"/"workflows"/"pages.yml").read_text()

class DeploymentPolicyTests(unittest.TestCase):
    def test_metadata_runs_on_schedule_or_manual_request_only(self):
        for label in ("Refresh research metadata", "Refresh free bioRxiv metadata"):
            pattern=r"      - name: "+re.escape(label)+r"\n        if: github\.event_name != 'push'"
            self.assertRegex(WORKFLOW,pattern)
        self.assertIn("cron: '17 * * * *'",WORKFLOW)
        self.assertIn("workflow_dispatch:",WORKFLOW)
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
