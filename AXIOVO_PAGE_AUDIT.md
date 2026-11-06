# Axiovo page-by-page audit

Started 2026-11-06. This is an **evidence-based checklist**, not a claim that
every page or live scholarly API has been completely verified.

## Release order

Fix cross-cutting data and source identity **before** visual refinements.
A test passing with synthetic metadata establishes UI behavior, not the
completeness of the arXiv, bioRxiv or ChemRxiv archives.

| Priority | Area | Desktop / phone acceptance | Current automated checks |
| --- | --- | --- | --- |
| P0 | Shared ingestion and search | Source identities, date provenance, category fidelity, query precision, deterministic relevance, newest/oldest/cited and pagination | `tests/search-provider-contract.test.js`, `tests/chemrxiv-doi-forms.test.js`, `tests/search-accuracy.test.js`, `tests/paper-sort.test.js` |
| P0 | arXiv Discover | All subjects, topic path, full query, first-submission dates, correct versions, source actions, save, sorting and pagination | `scripts/smoke_archive_pages.py`, `scripts/smoke_routes.py` |
| P0 | bioRxiv Discover | Correct server and subjects, DOI/author/date search, source links and save | Same source-specific smoke checks |
| P0 | ChemRxiv Discover | Hyphen/dot DOI formats, source/prefix verification, query/author/date, correct save | DOI regression + archive browser smoke |
| P0 | Research Desk | 3-source query, original links, search refinement, comparison, newest/oldest/cited, save across pages | `scripts/smoke_search_links.py`, `scripts/smoke_routes.py` |
| P1 | My Feed | Follow authors, Discover paths, appropriate recommendations, save/unsave, hide/undo, source filters, sorting, mobile cards | `scripts/smoke_feed.py`, `tests/feed-preferences.test.js` |
| P1 | Library & Workspace | Saved identity/version, persistence, filters, notes, recommendations, Listen, cross-archive sources | `scripts/smoke_recommendations.py`, `scripts/smoke_routes.py` |
| P1 | Research Assistant | Query grounding, no irrelevant sources, arXiv IDs, citation actions, privacy-preserving local modes | `tests/assistant-core.test.js`, `scripts/smoke_routes.py` |
| P2 | Homepage & shared navigation | Header alignment, theme, visible name meaning, source entry points, video access, mobile overflow | `scripts/smoke_routes.py`, `scripts/audit_internal_links.py` |
| P2 | Paper details, Compare, Profiles, Lab, social and documentation | Route validity and controls; deeper interactions still require individual acceptance tests | Route smoke, URL audit, specific unit tests |

## Audited and corrected so far

1. The arXiv DataCite adapter uses canonical arXiv DOI suffixes rather than
   requiring the publisher landing URL to contain `/abs/`; conflicting
   explicit arXiv landing IDs are still rejected.
2. Official arXiv subject metadata accepts explicit `quant-ph` and
   `Quantum Physics (quant-ph)` forms, not guessed subject labels.
3. DataCite cursor pagination always orders by creation date. Interactive
   searches now use page-number pagination and provider-supported sort fields
   for relevance, publication date and citation count. This has a provider
   10,000-record window; longer historical coverage requires indexed shards.
4. Crossref ChemRxiv accepts `10.26434/chemrxiv-...` and
   `10.26434/chemrxiv....` but not unrelated DOI suffixes.
5. Available numeric citation counts are parsed without converting missing
   or malformed fields into a fake count of zero.
6. The shared page smoke now includes My Feed at widths 360, 390, 768 and
   1360 px. A cross-archive Desk -> Library flow has been added at widths
   390 and 1360 px; the browser acceptance result must be checked in CI.

## Release readiness follow-up

Axiovo’s goal is to help researchers find relevant preprints, verify their
original records, and organize useful papers in a private reading workspace.

| Area | Check before publishing |
| --- | --- |
| Search and Discover | Run a keyword, exact ID and date-bound search. Change sorting after loading results and confirm source pagination starts again from page one. Check empty and unavailable providers separately. |
| Desk and Library | Save one result per archive. Open Library and verify the original URLs, reading notes and collections after reload. Verify distinct saved revisions and an older device Library. |
| My Feed | Start with a fresh browser profile. Verify browsing alone creates no follow. Add and remove a topic, follow an author, save a Discover path, and open a paper added to the Desk comparison. |
| Research Assistant | Inspect a pinned arXiv revision. An unavailable revision should offer the original link outside the evidence list. A query in indexed-only mode should remain local. |
| Home, navigation and tutorial | Check the archive choices, Back, Home, theme, keyboard focus, tutorial playback and captions. Confirm the Library loads after disconnecting an installed app. |

The pull-request browser job runs the maintained route, archive, Desk, Feed
and recommendation smoke tests. The Pages job also validates the generated
tutorial and audits the deployed URLs. Provider recall, cold mobile latency,
physical iOS and Android devices, and a full WCAG audit remain separate checks.

## Rules for any page review

- Run the exact same search on phone and desktop. Compare titles, IDs, links,
  dates and source counts, not just their appearance.
- For each visible action, check click or keyboard activation, successful
  state change, failure feedback, and persistence after navigation/reload.
- Never use a source link, author, abstract or DOI that was not taken from
  official or source-linked metadata. Synthetic fixtures are for tests only.
- All sort modes operate on eligible matches; unavailable citations must
  remain explicitly unknown and cannot justify global rankings.
- Archive coverage is partial unless independently reconciled. Preserve
  the existing local Library and followed preferences.
- Run at least 360, 390, 768 and 1360 px widths; 320 px and assistive
  technology require additional manual checks.
- A green code-quality run **is not** proof of successful GitHub Pages
  deployment or that every live external scholarly API is reachable.

## Unfinished validation

- Real-provider recall, historical completeness and author ambiguity need
  independent source-count and relevance audits; source-backed test fixtures
  do not establish those properties.
- Per-control tests for every optional feature and manual Android/iOS/desktop
  browser checks remain to be completed.
- Cold mobile performance, accessibility audits (WCAG AA) and offline/PWA
  update reliability need measurements, not subjective pass labels.
