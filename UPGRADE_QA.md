# Axiovo upgrade QA

Current scope: repaired Discover CTA and additive source-verifiable metadata pipeline. Full seven-phase roadmap remains in progress.

## Architecture
- Static GitHub Pages: `docs/`
- Shared archive search: `docs/topic-explorer.js`, `docs/archive-data.js`
- Browser-local Library: existing storage keys unchanged
- Harvesters: `scripts/sync.py`, `scripts/arxiv_announcements.py`, `scripts/oai_harvest.py`, `scripts/sync_biorxiv.py`, `scripts/sync_chemrxiv.py`

## Canonical pipeline
Run `python -m unittest discover -s tests -p test_verified_records.py -v`, then `python scripts/build_verified_records.py` and `python scripts/build_taxonomy.py`. The canonical record fields include id, source, title, abstract, authors, categories, submitted_date, announced_date, version, doi, pdf_url, landing_url, journal_ref, license, source_checked_at, metadata_source, subtopics and tag_status. Unavailable values stay null. Unverified topics go into needs_review.json. Source-date counts are *indexed subset counts*, not archive-wide totals.

## Manual acceptance checklist
1. On arxiv.html, biorxiv.html and chemrxiv.html at 360 and 390 px, verify white-label **Show matching papers**, click it, and confirm refreshed search and focus on results.
2. Check subject → subfield → sub-subtopic selections, crosslists, author/date filters and original source links.
3. Test exact paper title, DOI, and arXiv version-specific searches, then compare result scope with official source.
4. Save papers and notes, reload, and confirm existing Library entries are intact.
5. Compare methodology.html observed counts to data/coverage.json and data/records/manifest.json.
6. Open **Report wrong topic** and confirm GitHub pre-fills paper source and topic; report is submitted only after user confirmation.
7. Check keyboard focus, day/night controls, video captions, mobile overflow and external paper links.

## Not yet verified
A 50-question claim/passage groundedness evaluation, production-scale embeddings, authenticated moderation and collaboration, full-history indexing, and a complete 7-phase tutorial. Do not claim these outcomes until implemented and measured. Rerecord the tutorial after major UI changes.
