import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from scripts.arxiv_oai_windows import fetch_window_page
import datetime as dt

class NetworkRetryTests(unittest.TestCase):
    def test_timeout_then_success(self):
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self): return b"<OAI-PMH/>"
        calls = iter([TimeoutError("slow upstream"), Response()])
        with patch("scripts.arxiv_oai_windows.time.sleep") as sleep:
            result = fetch_window_page(dt.date(2026,10,1), dt.date(2026,10,31), "", opener=lambda *a, **kw: (lambda value: (_ for _ in ()).throw(value) if isinstance(value, Exception) else value)(next(calls)))
        self.assertEqual(result, b"<OAI-PMH/>")
        sleep.assert_called_once_with(5)

    def test_exhaustion_reports_checkpoint_safety(self):
        with patch("scripts.arxiv_oai_windows.time.sleep"):
            with self.assertRaisesRegex(RuntimeError, "checkpoint remains unchanged"):
                fetch_window_page(dt.date(2026,10,1), dt.date(2026,10,31), "", opener=lambda *a, **kw: (_ for _ in ()).throw(TimeoutError()))

    def test_nonretryable_http_error(self):
        with patch("scripts.arxiv_oai_windows.time.sleep") as sleep:
            with self.assertRaises(HTTPError):
                fetch_window_page(dt.date(2026,10,1), dt.date(2026,10,31), "", opener=lambda *a, **kw: (_ for _ in ()).throw(HTTPError("https://example.org", 400, "bad", {}, None)))
            sleep.assert_not_called()

if __name__ == "__main__":
    unittest.main()
