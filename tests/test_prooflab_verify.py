import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace
from scripts.prooflab_verify import verify

class ProofLabVerifierTests(unittest.TestCase):
    def test_missing_file(self):
        self.assertEqual(verify(Path("/missing/example.lean"))["status"], "error")
    def test_no_lean(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "Test.lean"
            p.write_text("theorem t : True := by trivial")
            with patch("scripts.prooflab_verify.shutil.which", return_value=None):
                self.assertEqual(verify(p)["status"], "unavailable")
    def test_valid_verified(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "Test.lean"
            p.write_text("theorem t : True := by trivial")
            with patch("scripts.prooflab_verify.shutil.which", return_value="/usr/bin/lean"), patch(
                "scripts.prooflab_verify.subprocess.run", return_value=SimpleNamespace(returncode=0,stdout="",stderr="")):
                self.assertEqual(verify(p)["status"], "verified")
    def test_sorry_not_verified(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "Test.lean"
            p.write_text("theorem t : True := by sorry")
            with patch("scripts.prooflab_verify.shutil.which", return_value="/usr/bin/lean"), patch(
                "scripts.prooflab_verify.subprocess.run", return_value=SimpleNamespace(returncode=0,stdout="",stderr="")):
                self.assertEqual(verify(p)["status"], "incomplete")

if __name__ == "__main__":
    unittest.main()
