import io
import json
import unittest
from unittest.mock import patch
from scripts.verify_release import verify, digest

class ReleaseVerificationTests(unittest.TestCase):
    def test_matching_manifest_cannot_hide_stale_script(self):
        manifest={'commit':'abc','files':{'app.js':digest(b'new')}}
        with patch('scripts.verify_release.urllib.request.urlopen',side_effect=[
            io.BytesIO(json.dumps(manifest).encode()),io.BytesIO(b'old')]):
            with self.assertRaisesRegex(ValueError,'Public file differs'):
                verify('https://example.test/',manifest)
    def test_matching_artifact(self):
        manifest={'commit':'abc','files':{'app.js':digest(b'new')}}
        with patch('scripts.verify_release.urllib.request.urlopen',side_effect=[
            io.BytesIO(json.dumps(manifest).encode()),io.BytesIO(b'new')]):
            verify('https://example.test/',manifest)
    def test_wrong_commit(self):
        with patch('scripts.verify_release.urllib.request.urlopen',return_value=io.BytesIO(b'{}')):
            with self.assertRaisesRegex(ValueError,'manifest'):
                verify('https://example.test/',{'commit':'abc','files':{}})
