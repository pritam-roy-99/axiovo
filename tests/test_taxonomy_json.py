"""Versioned taxonomy must exactly reflect curated source labels."""
import json
import tempfile
import unittest
from pathlib import Path
from scripts.build_taxonomy_json import build


class TaxonomyV1Tests(unittest.TestCase):
    def test_builds_all_three_archives_without_unsupported_examples(self):
        with tempfile.TemporaryDirectory() as directory:
            dest=Path(directory)/"taxonomy.json"
            payload=build(output=dest)
            self.assertEqual(payload["schema_version"],1)
            nodes=payload["nodes"]
            self.assertGreater(len(nodes),150)
            ids=[x["id"] for x in nodes]
            self.assertEqual(len(ids),len(set(ids)))
            self.assertEqual(set(x["id"] for x in nodes if x["level"]=="archive"),
                             {"arxiv:root","biorxiv:root","chemrxiv:root"})
            self.assertTrue(all(set(("id","label","parent","description","keywords","example_papers")).issubset(x) for x in nodes))
            self.assertTrue(all(x["example_papers"]==[] for x in nodes))
            self.assertTrue(all(x["parent"] in ids for x in nodes if x["parent"]))
            self.assertEqual(json.loads(dest.read_text())["nodes"],nodes)


if __name__=="__main__":
    unittest.main()
