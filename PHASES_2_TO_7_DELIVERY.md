# Axiovo Phases 2–7: Engineering delivery and release evidence

**Development branch:** `feature/phases-2-7-foundations`. Based on the separate Phase 1 Source Reliability branch. Changes are not automatically released to production.

This log distinguishes committed functionality from scientifically evaluated and deployed capabilities.

| Phase | Implemented in development | Required before production acceptance |
|---|---|---|
| 2 — Search | Canonical query and exact-ID/date/source filters; deterministic BM25, source-linked lexical index, reciprocal-rank fusion, explicit sort contract; independent quality evaluator | 100+ expert-labeled balanced queries, held-out gains, source/field and mobile latency benchmarks; guarded integration into all pages |
| 3 — Intelligence | Provenance-only citation graph, literal abstract evidence index, strict citation anchor checker, graph exporter | Real reference-provider ingestion, license-checked full-text indexing, expert claim-grounding ≥95%, correct abstention and passages across PDF revisions |
| 4 — Workspace | 50-item pagination with full-library search including notes and collections; optional user-triggered IndexedDB mirror; cross-tab refresh; follow scan rotation with source budgets | 5,000-record migration round-trip, conflict-safe optional cloud sync, offline reconciliation and identity-disambiguation evaluation |
| 5 — Interoperability | RIS/BibTeX/CSL-JSON formatter, Library export selection, private-safe public collection contract; static public-source metadata API | Round-trip format conformance against Zotero/CSL, publication record reconciliation, permission review for any future hosted sharing |
| 6 — Performance | Local multi-viewport Chromium timing, overflow and heading audit, source-preserving CI checks | Axe, Lighthouse and real-device WCAG 2.2 AA checks; documented p50/p95 and source outage matrix; fix measured issues |
| 7 — Release | Release readiness auditor, reproducible index CI, published endpoint documentation | 3–4 minute final real-site tutorial, live-domain post-deployment tests, usability comparison with researchers, independent rollback rehearsal |

## Privacy and compatibility

Existing routes, paper retrieval code, Local Library keys, saved searches, notes, follows and settings are left intact. The new BM25/hybrid modules are **not the default search engine** while relevance evaluations remain outstanding. The new graph does **not** infer citations from similarity. The IndexedDB copy requires the visitor to press its explicit control.

No hosted AI, paid API, account requirement, remote telemetry, or cross-device notes upload is introduced.

## Test evidence

Branch CI runs the existing Python and Node suites and browser journeys, and now also builds and hashes the v2 source, lexical search, citation graph and static API indexes. `scripts/report_web_vitals.py` collects viewport evidence, while `scripts/release_readiness.py` intentionally refuses to declare launch ready without expert judgments and manual testing.

Validation:

```bash
python -m unittest discover -s tests -v
for test in tests/*.test.js; do node "$test"; done
python -m scripts.build_source_v2
python -m scripts.build_search_index
python -m scripts.build_literature_graph
python -m scripts.build_public_api
python scripts/report_web_vitals.py
python -m scripts.release_readiness
```

Do **not** merge and announce all phases completed solely because these tests pass. The supplied engineering roadmap defines Phase 7 as an evidence-based production acceptance gate.
