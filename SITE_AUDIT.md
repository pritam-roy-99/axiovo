# ResearchLens: page-by-page implementation audit

**Audit date:** 2026-11-03  
**Scope:** GitHub repository `main` as of the start of the audit, plus the changes in this pull request.

**Verification boundary:** This is a source-code and GitHub Actions audit, **not** a successful hands-on browser test of the public deployment. Direct page navigation to the GitHub Pages domain was unavailable in the available web checker, and the execution container had no working external DNS/browser runtime. Do not interpret this document as proof that mobile layouts, external APIs, or third-party login work in production.

## Executive diagnosis

ResearchLens has accumulated multiple parallel implementations for the same task. There is a recent local arXiv feed, a history search, a field-aware OpenAlex search, a standalone legacy Search page, Research Tools search, and a Research Assistant source search. The original site grew feature-by-feature without unified source, state, navigation and interaction contracts. Consequently, users can receive different results, links and saving behavior depending on which page they use.

This PR fixes verified contradictions; it **does not** claim to solve source-completeness or full AI-evaluation infrastructure.

## Route and capability review

| Route | Intended job | Confirmed source-audit finding | This PR / next action |
|---|---|---|---|
| `/` and `/#discover` | Primary discovery, field → topic → subtopic, latest and history | Two data pipelines still coexist. The global focus bar was layered over older hidden controls. The latest view represents a limited JSON cache, while Explore requests arXiv-hosted OpenAlex works. Their counts and classifications are not equivalent. | Preserve explicit source labels; **future:** remove hidden legacy controls and merge the pipelines behind a shared state model. |
| Historical results inside `/` | Older arXiv-hosted records and version links | Updating the status paragraph via `textContent` deleted the official arXiv fallback link from the DOM. Version controls refer to arXiv itself. | **Fixed:** recreate the source link on status changes. **Remaining:** OpenAlex is not a complete historical arXiv index. |
| `/search.html` | Global standalone search | An independent OpenAlex search returned journal-only records and did not use the field-aware arXiv filters. It duplicated Discover. | **Fixed:** redirect old URLs, preserving query, date and sort parameters, into canonical Discover. |
| `/fields.html` | Field Explorer legacy route | Already redirected to Discover. | Keep compatibility redirect; do not reintroduce another field selector. |
| `/workspace.html` | Saved reading, questions, recommendations | Recent feed and live recommendation retrieval are different data sources; the historical library has a shared arXiv-ID store and an OpenAlex-record store. | **Partially fixed:** arXiv-hosted saves from Discover now mirror into the shared arXiv list. **Remaining:** migrate to one canonical library schema with source provenance and revision metadata. |
| `/copilot.html` | Research Assistant, source-based explanation | Local/OAI evidence plus OpenAlex was mixed without ensuring all externally retrieved works actually linked to arXiv; direct arXiv ID extraction stripped `vN`. A hosted inference model is **not** active. | **Fixed:** preserve requested revisions, link source-confirmed arXiv works, update label. **Remaining:** user-level full-text retrieval and evaluated citation checking. |
| `/ai.html` | Retired AI Lab | Redirects to Assistant, retaining URL arguments. | Keep compatibility redirect only. |
| `/lab.html` | PDF reading, notes, comparisons and citation tools | Its own literature search could present non-arXiv records and defaulted to journal/DOI links; opening a PDF via ID removed revision suffixes. | **Fixed:** require arXiv-hosted locations, link original record, preserve exact requested PDF revision. **Remaining:** browser-test PDF.js worker, large documents, annotation persistence and CDN failure recovery. |
| `/paper.html` | Source information, saved paper, GitHub discussion | Existing versioned paper pages used the wrong ID in one GitHub issue detail request. The related-literature link pointed to the duplicate Search page. | **Fixed:** base-ID GitHub issue lookup; canonical Discover related-literature link. **Remaining:** validate original arXiv revision existence rather than assuming it. |
| `/profiles.html` | Local profile and saved reading, optional hosted identity | Saved-paper display only searched the recent JSON feed, hiding historical/unindexed bookmarks and `vN` revisions. Supabase-based hosted profiles depend on separate setup. | **Fixed:** display all valid saved arXiv IDs and original revision links. **Remaining:** make the hosted account configuration status prominent. |
| `/methodology.html` | Explain data coverage, AI and privacy | Described the deprecated AI Lab, old discovery methods and dated snapshots, rather than the current feature set. | **Fixed:** rewrite disclosures to match the current system and realistic limitations. |

## Priorities after this cleanup

### P0: Must verify before claiming a polished launch
1. **Real-browser end-to-end tests** on desktop Chrome and Android Chrome: first load, navigation, both Discover modes, field/topic/subtopic changes, source links, save → Workspace → Profile, precise `v1/v2` URLs, Assistant, PDF tools, dark theme, back/forward, keyboard.
2. **API compatibility and reliability:** live OpenAlex query validation under keyless rate/budget rules; empty, timeout, 429, CORS and malformed metadata states; semantic fallback quotas.
3. **Bibliographic coverage:** a backend/OAI ingest and normalized arXiv-version database are needed for SciRate-like historical discovery and dependable freshness. OpenAlex is a useful secondary discovery index, not an authoritative arXiv replica.

### P1: Coherence and scientific confidence
4. Replace the remaining duplicated search functions with a single documented client retrieval interface, including common `arXiv ID + version`, source provenance, field scoring, pagination and cache policy.
5. Consolidate **all** reading/saved-paper stores into one versioned schema; add migration, export/import and cross-tab sync tests. Current mirroring is a compatibility repair, not schema consolidation.
6. Build a labeled evaluation set for each research field and subtopic (relevant and irrelevant publications). Track Precision@10, Recall@K and query failures; do not claim semantic relevance solely from mocked tests.
7. Replace old hidden controls in Discover with clean components after their event dependencies are removed; do not add further controls as another overlay.
8. Make capabilities and connection requirements explicit: evidence-only, optional local inference, GitHub discussion, optional Supabase hosted accounts.

### P2: Presentation and comfort
9. Test mobile 360px and 390px widths, long mathematical titles, crowded action buttons, PDF canvas resizing, dark-theme contrast, and screen-reader flows.
10. Simplify the homepage and onboarding around three tasks: **Find**, **Read & assess**, **Save & follow**. Keep advanced capabilities discoverable but secondary.

## Required real-browser smoke scenarios

1. Open `/` with browser storage empty and with saved preferences; check no runtime errors.
2. Select **Medicine → Clinical trials → Adaptive trials** and confirm the quantum-only chips do not appear.
3. Select **Quantum information & physics → Contextuality → Preparation contextuality** and check the first 20 papers manually against their arXiv abstracts.
4. Change from one field to another, then use browser Back/Forward; confirm search state and visible focus do not silently diverge.
5. Search exact `2608.13942v1` and `2608.13942v2`; confirm different arxiv.org revision URLs and correct missing-version behavior.
6. Use a legacy `/search.html?q=...&from=...&sort=...` link; confirm every search argument reaches Discover.
7. Search a paper present in arXiv but absent from the local JSON cache; confirm its source link remains available.
8. Save from Explore, then open Workspace and Profile; confirm the saved paper and version remain visible.
9. Remove from the reading list; confirm state updates in all views, including after reload.
10. Open Research Assistant directly from a historical paper; verify the correct arXiv link and that no hosted AI inference is implied.
11. Force an OpenAlex 429/network outage; verify honest error reporting and official arXiv fallback.
12. Open a local 10–30 page PDF in Research Tools, annotate, reload and export; test both Chrome desktop and Android.
13. Open light and dark mode; inspect contrast and clickable touch-target sizes.
14. Test menu/keyboard focus, screen reader labels and mobile scroll behavior.
15. Verify GitHub Issues discussions and optional hosted accounts only when actually configured.

**Release criterion:** Automated code checks are necessary, but must not be described as a complete browser acceptance test. GitHub Pages deployment success confirms publication of assets, not correctness of external APIs or all user journeys.
