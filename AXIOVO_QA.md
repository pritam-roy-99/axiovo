# Axiovo upgrade QA and phase acceptance

This is an honest checklist. A code commit is not proof that the live website
has deployed or that an external provider returns all relevant papers.

## Priority 0: blue paper-navigation button

- [x] All three Discover HTML pages include a visible named **Show matching papers** button.
- [x] JavaScript click handler scrolls to and focuses the matching results heading.
- [x] High-contrast white text and visible focus styles are defined.
- [ ] Confirm on an actual Android phone: Cell Behavior > All topics, blue text visible, click reaches results.
- [ ] Confirm in Chrome, Firefox, Safari and Android browser with light/dark themes.
- [ ] Confirm button remains readable at 320, 360, 390, 768, 1360 pixel widths.

Automated test: `python scripts/smoke_routes.py`. It checks the CTA's
text/contrast/focus as well as global mobile navigation.

## Phase 1: source data and trust

- [x] Existing official harvesters retained, with no invented paper records.
- [x] Normalization of source-linked metadata to one v1 schema.
- [x] Monthly JSON shards generated without overwriting original feeds.
- [x] Distinct submission, announcement and last-check timestamps.
- [x] Verified-source coverage manifest showing per-archive actual cached counts.
- [x] Versioned JSON taxonomy with parent links, keywords and empty unknown fields.
- [x] Honest unscored `needs_review` queue.
- [x] Local-only wrong-topic reporting with explicit GitHub submission.
- [ ] Semantic embedding classification with validated calibration and confidence.
- [ ] Verified publication status and corrections/retractions via primary notices.
- [ ] Full historical inventory and independently reconciled archive totals.

Automated tests: `test_normalized_index.py`, `test_taxonomy_json.py`,
`topic-report.test.js`, `search-accuracy.test.js`.
Manual test: save a Library paper, reload all three pages, create a topic
report, verify the local queue, and confirm nothing is submitted automatically.
Do not confuse zero cached ChemRxiv records with zero actual papers.

## Phase 2: discovery

- [x] Source-restricted archive discovery and current keyword/date filters retained.
- [x] Exact identifiers and source links retained.
- [ ] Calibrated semantic embedding + BM25 hybrid index and evaluation set.
- [ ] Five-point related/citing graph with authenticated source provenance.
- [ ] Independent cross-archive recall benchmarks.
- [ ] Verified daily trending topic counts.
- [ ] Complete optional personalized feed and weekly digest.

Acceptance to test: query "how do topological edge states survive disorder";
review true arXiv, bioRxiv and ChemRxiv candidates manually. Do **not**
require two archives if the literature cannot honestly support it.

## Phase 3: reading

- [x] Existing abstracts, source links, reading notes and compare tools retained.
- [ ] Passage-anchored structured summaries with sentence-level evidence.
- [ ] Comparable table across 2–5 papers, with genuinely missing fields marked.
- [ ] Beginner/Expert rendering, identical source evidence.
- [ ] Verified repository/dataset link metadata and fresh timestamps.

## Phase 4: Research Assistant

- [x] Evidence-only, local Ollama and local WebGPU options retained.
- [x] Removed hosted provider API key entry from public GitHub Pages.
- [x] Prepared a disabled-by-default Turnstile-protected server-side gateway.
- [x] Added a 50-original-paper **bibliographic source** retrieval/citation test.
- [ ] Deploy and authenticate the optional free server only after owner approval.
- [ ] Passage-level evidence grounding, used vs unused sources, fulltext coverage.
- [ ] Verified scientific contradiction detection and Literature Review Builder.
- [ ] Independent 50-question model groundedness test with human-checked claims.

The bibliographic test is **not** a scientific groundedness benchmark. Its 95%
gate checks whether actual indexed papers can be retrieved and rendered with
the correct source URLs.

## Phase 5: interoperability

- [x] Existing Library storage, RIS/BibTeX and local backups retained.
- [ ] Cross-device shared collections with authenticated permissions.
- [ ] Browser extension for verified save-to-Library.
- [ ] Public read-only search API with server-side rate limiting and docs.
- [ ] Public curated reading lists with permission/privacy controls.

## Phase 6: performance and accessibility

- [x] Accessible mobile/desktop CTA and existing theme toggle preserved.
- [x] Existing service worker, local Library and responsive header retained.
- [ ] Test cold mobile network first content under two seconds on representative devices.
- [ ] Test local cached search p95 under one second; remote calls have separate budget.
- [ ] Run axe, Lighthouse and manual keyboard/voice/screen-reader assessments.
- [ ] Reach reproducible 95+ Lighthouse ratings, not a declared score.

## Phase 7: final product tutorial

- [x] Existing tutorial generation uses Chromium captures of actual pages.
- [x] Caption and audio scene metadata generated; current build may use TTS fallback.
- [ ] After all features work, build 3–4 min real interaction video at 1920x1080/30 fps.
- [ ] Verify warm Indian-English female voice, every technical term and pause.
- [ ] Human-audit transcript alignment, captions, scene timing and touch targets.
- [ ] Publish MP4, WebM, poster, version date and clickable replay chapters.

## Privacy, accessibility and regression rules

Do not delete or rename localStorage keys holding saved Library entries,
reading notes, author follows or researcher preferences. Use new versioned
keys for new features. Never embed provider API keys in public JavaScript.
Every preprint must be traceable to its original record. Unknown upstream
metadata must remain unknown. Keep keyboard focus visible after navigation.

## Validation and release

Review the GitHub Actions run for each commit; it may be pending or fail.
Run the required tests and inspect generated
`docs/data/index/v1/manifest.json`. Open the deployed website and compare
it against mobile screenshot and source files before declaring finished.
