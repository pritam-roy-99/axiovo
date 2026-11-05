# Axiovo 3.0, Feature 1: SQL research database

This module is a **proposed foundation** on a feature branch. It does not
modify the live GitHub Pages website or deploy any server.

## Why SQLite first?

The existing live site is static and already publishes source-specific JSON
snapshots. SQLite and FTS5 allow these verified snapshots to be imported into
a queryable, testable local research index, with a later optional Cloudflare D1
deployment. This phase has **no required subscription, account or paid API**.

## Schema

- `papers`: canonical internal integer ID, source, source ID, title, abstract,
  DOI, original submission date, metadata update date, source links.
- `paper_versions`: version identifiers retained independently of paper identity.
- `authors` / `paper_authors`: ordered author metadata; ORCID reserved for verified values.
- `categories` / `paper_categories`: cross-listings without duplicating paper rows.
- `paper_identifiers`: source identifiers and DOI aliases; never infer
  same-work equivalence from title or an overlapping DOI alone.
- `citation_edges`: schema only; **not populated by heuristics**.
- `ingestion_runs`: counts, status and checkpoints.
- `coverage`: always `partial` until an independent completeness audit exists.
- `papers_fts`: FTS5 indexed titles/abstracts kept synchronized by SQL triggers.

Canonical key examples: `arxiv:2611.12345`,
`biorxiv:10.64898/2026.11.05.123456`,
`chemrxiv:10.26434/example`. The primary key is an internal integer and
remains stable across metadata reimports.

## Run locally, offline

Requires Python 3.11+ with a standard SQLite build containing FTS5.

```sh
python backend/import_snapshots.py --database /tmp/axiovo-research.sqlite --source all
python -m unittest tests.test_research_database -v
```

If ChemRxiv has no verified JSON snapshot, the importer explicitly skips
that source. It never invents ChemRxiv results or claims complete coverage.

For an isolated import:

```sh
python backend/import_snapshots.py --database /tmp/axiovo-research.sqlite --source biorxiv --input docs/data/biorxiv.json
```

The database path should be outside `docs/`. Do **not** commit a private
research database or serve its contents through GitHub Pages.

## Inspect the database

```sql
SELECT source, count(*) FROM papers GROUP BY source;
SELECT p.source, p.source_id, p.title
FROM papers_fts f JOIN papers p ON p.id=f.rowid
WHERE papers_fts MATCH 'quantum AND steering'
ORDER BY bm25(papers_fts) LIMIT 20;
SELECT source,scope,observed_count,status,explanation FROM coverage;
```

## Verification criteria

1. Multiple imports of identical records must not duplicate papers or authorships.
2. A revised paper updates its FTS title but retains older version history.
3. Cross-listed categories must not create extra paper identities.
4. Native source IDs, provenance and partial coverage remain explicit.
5. Unverified records cannot create fabricated citations or paper identities.
6. Deleting a paper removes its dependent author links, versions and FTS content.
7. The existing website continues functioning unchanged.

**Not included yet:** the public API, fully historical ingestion, hosted
database deployment, user accounts, or multi-source semantic search. They
belong to later separately tested features. FTS5 provides lexical search,
not semantic embeddings.

## Next development step

Feature 2 adds a small read-only public search API using this schema,
pagination, strict source filtering and explicit coverage metadata. Deploy it
only after endpoint tests, rate limits and free-tier constraints are verified.
