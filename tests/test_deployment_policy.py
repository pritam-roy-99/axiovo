"""Deployment policy must not block UI fixes on slow scholarly metadata refresh."""
from pathlib import Path
import re
import unittest

WORKFLOW=(Path(__file__).resolve().parents[1]/".github"/"workflows"/"pages.yml").read_text()

class DeploymentPolicyTests(unittest.TestCase):
    def test_refresh_runs_in_dedicated_scheduled_workflow(self):
        sync=(Path(__file__).resolve().parents[1]/".github"/"workflows"/"sync-all-sources.yml").read_text()
        for command in ("scripts.sync", "scripts.oai_harvest", "scripts.arxiv_daily_archive",
                        "scripts.sync_biorxiv", "scripts/sync_biorxiv.py"):
            self.assertNotIn(command, WORKFLOW)
        self.assertNotIn("git rebase", WORKFLOW)
        self.assertNotIn("  schedule:",WORKFLOW)
        self.assertIn("cron: '7,37 * * * *'",sync)
        self.assertEqual(sync.count("    - cron:"),1)
        self.assertIn("cancel-in-progress: false",sync)
        self.assertIn("workflow_dispatch:",sync)
        self.assertIn("gh workflow run pages.yml",sync)
    def test_announcements_publish_independently_of_historical_and_other_archives(self):
        sync=(Path(__file__).resolve().parents[1]/".github/workflows/sync-all-sources.yml").read_text()
        announcements=sync.split("  announcements:",1)[1].split("  synchronize:",1)[0]
        self.assertIn("git add docs/data/announcements.json",announcements)
        self.assertIn("gh workflow run pages.yml",announcements)
        self.assertNotIn("scripts.oai_harvest",announcements)
        self.assertNotIn("scripts.sync_biorxiv",announcements)
        self.assertNotIn("rebase -X theirs",sync)
    def test_metadata_commits_cannot_cancel_running_video_publication(self):
        self.assertIn("group: axiovo-pages",WORKFLOW)
        self.assertIn("cancel-in-progress: false",WORKFLOW)
    def test_code_deploys_after_successful_checks_without_external_refresh(self):
        self.assertIn("python scripts/security_audit.py",WORKFLOW)
        self.assertIn("node tests/library-outside-cache.test.js",WORKFLOW)
        self.assertIn("steps.deployment.outputs.page_url",WORKFLOW)
        oai=(Path(__file__).resolve().parents[1]/".github/workflows/oai.yml").read_text()
        self.assertNotIn("schedule:",oai)
        self.assertNotIn("git push",oai)

    def test_publication_watchdog_recovers_and_alerts_without_unsafe_bypass(self):
        recovery=(Path(__file__).resolve().parents[1]/".github/workflows/publication-recovery.yml").read_text()
        self.assertIn("workflow_run:",recovery)
        self.assertIn("workflow_dispatch:",recovery)
        self.assertIn("schedule:",recovery)
        self.assertIn("cancel-in-progress: false",recovery)
        self.assertIn("issues: write",recovery)
        self.assertIn("head_sha",recovery)
        self.assertIn("status",recovery)
        self.assertIn("backoff_minutes",recovery)
        self.assertIn("min(240",recovery)
        self.assertIn("report_blocker",recovery)
        self.assertIn("site release older than two hours",recovery)
        self.assertIn('"issue", "create"',recovery)
        self.assertIn('"issue", "close"',recovery)
        self.assertIn('"workflow", "run", "pages.yml"',recovery)
        self.assertNotIn("continue-on-error: true",recovery)
        self.assertNotIn("gh workflow run pages.yml --repo",recovery)
        self.assertIn("cancel-in-progress: false",WORKFLOW)

if __name__=="__main__":
    unittest.main()
