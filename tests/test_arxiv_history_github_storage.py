import unittest
from pathlib import Path

class GithubStorageWorkflowTests(unittest.TestCase):
    def test_manual_only_and_isolated_branch(self):
        text = Path(".github/workflows/arxiv-history-github-storage.yml").read_text()
        self.assertIn("workflow_dispatch:", text)
        self.assertNotIn("  push:", text)
        self.assertIn('Harvest OAI datestamp window:', text)
        self.assertNotIn("  schedule:", text)
        self.assertIn("arxiv-history-data", text)
        self.assertIn("cancel-in-progress: false", text)
        self.assertIn("200 * 1024 * 1024", text)
        self.assertIn("git diff --cached --quiet", text)

if __name__ == "__main__":
    unittest.main()
