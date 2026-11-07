"""Full IACR backfill checkpoints and adaptive date-window splitting."""
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

from scripts import backfill_eprint as history

class BackfillTests(unittest.TestCase):
    def test_year_windows_cover_entire_oai_date_range(self):
        w=history.initial_queue("2024-03-12",date(2026,11,7))
        self.assertEqual(w[0],{"from":"2024-03-12","until":"2024-12-31"})
        self.assertEqual(w[-1],{"from":"2026-01-01","until":"2026-11-07"})
        self.assertEqual(len(w),3)

    def test_large_window_can_be_split_without_overlap(self):
        parts=history.split_window({"from":"2026-01-01","until":"2026-01-08"})
        self.assertEqual(parts[0]["until"],"2026-01-04")
        self.assertEqual(parts[1]["from"],"2026-01-05")
        self.assertIsNone(history.split_window({"from":"2026-01-02","until":"2026-01-02"}))

    def test_complete_windows_are_checkpointed_and_never_skipped(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            state_path=folder/"state.json"
            snapshot=folder/"eprint.json"
            existing={"schema_version":2,"earliest_oai_datestamp":"2025-01-01",
                "latest_oai_day":"2026-11-07",
                "pending":[{"from":"2025-01-01","until":"2025-01-08"}],
                "completed_windows":0,"complete_oai_traversal":False}
            state_path.write_text(json.dumps(existing))
            rows=[{"id":"2025/5","title":"A verified record","authors":["Cryptographer"]}]
            def collect(*,since,until,max_pages):
                if since=="2025-01-01" and until=="2025-01-08":
                    return rows,False
                return rows,True
            with patch.object(history,"STATE",state_path),patch.object(history.source,"collect",side_effect=collect),\
                 patch.object(history.source,"write_snapshot",return_value=None) as writer:
                amount=history.run(first="2025-01-01",today=date(2026,11,7),
                                   max_windows=2,max_pages=5)
                self.assertEqual(amount,2)
                loaded=json.loads(state_path.read_text())
                self.assertEqual(loaded["pending"],[])
                self.assertEqual(loaded["completed_windows"],2)
                self.assertTrue(loaded["complete_oai_traversal"])
                writer.assert_called_once()

    def test_interruption_does_not_advance_checkpoint(self):
        with tempfile.TemporaryDirectory() as temp:
            state_path=Path(temp)/"state.json"
            with patch.object(history,"STATE",state_path),\
                 patch.object(history.source,"collect",side_effect=TimeoutError("upstream unavailable")):
                with self.assertRaises(TimeoutError):
                    history.run(first="2026-01-01",today=date(2026,11,7),max_windows=2)
                self.assertFalse(state_path.exists())

    def test_oversized_day_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            state_path=Path(temp)/"state.json"
            initial={"schema_version":2,"earliest_oai_datestamp":"2026-11-07",
              "latest_oai_day":"2026-11-07",
              "pending":[{"from":"2026-11-07","until":"2026-11-07"}],
              "completed_windows":0,"complete_oai_traversal":False}
            state_path.write_text(json.dumps(initial))
            with patch.object(history,"STATE",state_path),\
                 patch.object(history.source,"collect",return_value=([],False)):
                with self.assertRaisesRegex(RuntimeError,"single day"):
                    history.run(first="2026-11-07",today=date(2026,11,7))
                self.assertEqual(json.loads(state_path.read_text())["completed_windows"],0)

    def test_bad_checkpoint_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            state_path=Path(temp)/"state.json"
            state_path.write_text('{"schema_version":1,"pending":[]}')
            with patch.object(history,"STATE",state_path):
                with self.assertRaisesRegex(ValueError,"Invalid IACR checkpoint"):
                    history.run(first="2026-01-01",today=date(2026,11,7))

if __name__=="__main__":
    unittest.main()
