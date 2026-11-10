"""Official RSS versions, Eastern dates and honest completeness."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from scripts import arxiv_announcements as rss

class RssIdentityTests(unittest.TestCase):
    def test_guid_revision_survives_unversioned_abstract_link(self):
        xml=b'''<rss><channel><pubDate>Mon, 09 Nov 2026 05:00:00 +0000</pubDate>
        <item><title>Example</title><link>https://arxiv.org/abs/2611.01234</link>
        <guid>oai:arXiv.org:2611.01234v3</guid><description>arXiv:2611.01234v3 Announce Type: replace Abstract: Text</description>
        <category>quant-ph</category><category>cs.CR</category></item></channel></rss>'''
        day, rows = rss.parse_feed(xml, 'quant-ph')
        self.assertEqual(day, '2026-11-09')
        self.assertEqual(rows[0]['version'], 3)
        self.assertEqual(rows[0]['link'], 'https://arxiv.org/abs/2611.01234v3')
        self.assertIn('cs.CR', rows[0]['categories'])
        with self.assertRaises(ValueError):
            rss.parse_feed(xml.replace(b'org:2611.01234', b'org:2611.09999'), 'quant-ph')

    def test_rss_fetch_has_bounded_timeout(self):
        """One unavailable category must not consume the whole update window."""
        from unittest.mock import MagicMock
        response = MagicMock()
        response.__enter__.return_value.read.return_value = (
            b'<rss><channel><pubDate>Tue, 10 Nov 2026 05:00:00 +0000</pubDate>'
            b'<item><title>Example</title><link>https://arxiv.org/abs/2611.01234</link>'
            b'</item></channel></rss>'
        )
        with patch.object(rss.urllib.request, "urlopen", return_value=response) as fetch:
            day, rows = rss.get("quant-ph")
        self.assertEqual(day, "2026-11-10")
        self.assertEqual(len(rows), 1)
        self.assertLessEqual(fetch.call_args.kwargs["timeout"], 10)

    def test_empty_category_is_not_a_failed_feed(self):
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'announcements.json'
            row={'id':'2611.00001','version':1,'categories':['quant-ph'],'abstract':'','authors':[]}
            with patch.object(rss,'TARGET',target), patch.object(rss,'ARCHIVES',('quant-ph','econ')), \
                 patch.object(rss,'get',side_effect=[('2026-11-09',[row]),('2026-11-09',[])]), \
                 patch.object(rss.time,'sleep'):
                rss.main()
            self.assertTrue(json.loads(target.read_text())['complete'])

    def test_cap_does_not_certify_complete_release(self):
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'announcements.json'
            rows=[{'id':f'2611.{i:05d}','version':1,'categories':['cs'],'abstract':'','authors':[]} for i in range(2000)]
            with patch.object(rss,'TARGET',target), patch.object(rss,'ARCHIVES',('cs',)), \
                 patch.object(rss,'get',return_value=('2026-11-09',rows)):
                rss.main()
            self.assertFalse(json.loads(target.read_text())['complete'])
