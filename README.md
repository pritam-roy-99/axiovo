# ResearchLens

**ResearchLens is a free, open-source research-discovery prototype with preliminary prior-literature exploration.** It is independent from arXiv and SciRate.

## Field Explorer (proposed ResearchLens 2.0 workspace)

Open **[Explore by field](https://pritam-roy-99.github.io/researchlens/fields.html)** after this feature branch is merged and deployed.

- Nine discipline presets: quantum information/physics, mathematics, astrophysics, computer science/AI, biology, medicine/public health, chemistry/materials, engineering/robotics, and social sciences/economics.
- Topic chips, suggested literature searches, custom research topics, and field-specific evaluation checklists.
- Live OpenAlex search that keeps results on ResearchLens, with publication date-range filtering, relevance/newest/citation sorting, and paging.
- Source links to original OpenAlex, DOI, open-access and arXiv records when available.
- A separate browser-local reading collection with BibTeX and JSON export, plus copy citation actions.
- Responsive layout and shared day/night setting. The existing research feed, copilot, search, AI Lab and profiles are unchanged.

**Scope and caveats:** Field selection is a query-preset mechanism rather than a validated classifier; search is not restricted to field-specific databases and is subject to OpenAlex coverage and rate limits. The feature does not add institutional subscriptions, paywalled full text, centrally synced accounts, hosted inference, or guaranteed coverage of historical arXiv. User selections and saved records remain in this browser. The field workflows are guidance rather than automatic quality judgments.

## Researcher workspace and consistent navigation

**New:** [My research workspace](https://pritam-roy-99.github.io/researchlens/workspace.html) gives researchers a single starting point with their selected Field Explorer focus, latest papers from the existing arXiv snapshot, unified browser-local saved reading from the arXiv feed and OpenAlex Field Explorer, reading progress (to-read/reading/finished), private notes, keyword filtering and library exports (JSON/BibTeX). A responsive navigation bar now appears on the site's primary pages, allowing one-click access to the Workspace, arXiv Feed, Field Explorer, Copilot, AI Lab and Profile. The homepage links directly to the workspace.

**Data limitations:** Library entries are aggregated from two existing localStorage collections; this is not a server-side account, sync service, verified literature database, or complete arXiv archive. Notes and reading states are stored on the current device. Exported JSON is a backup, not yet an import mechanism for the new unified workspace. External academic metadata retain their source caveats. The workspace displays recent papers already present in the locally indexed feed; it cannot accelerate arXiv ingestion itself.

## Personalized research discovery and question tracking

The [research workspace](https://pritam-roy-99.github.io/researchlens/workspace.html) now includes **Relevant to your research** and **My research questions**.

- Choose specific research interests or exact author names; ResearchLens additionally uses your Field Explorer topic and followed topics.
- Rank papers from the **existing local arXiv snapshot** with transparent title, abstract, topic, project keyword and author matching. Each suggestion explains its match; existing saved papers are down-ranked and hidden papers are excluded.
- Save a suggested paper into the existing arXiv reading list, view it on arXiv, or open the Copilot with its identifier.
- Record research questions with an objective, searchable keywords and progress status; attach or remove papers, edit questions, or export/import your question data as JSON.
- Regression tests for retrieval scoring and normalization are included in the deployment workflow.

**Limitations:** Ranking is deterministic lexical matching rather than an evaluated embedding or AI recommendation service. It does not automatically search the whole arXiv archive, assess importance or prove novelty, and cannot notify users of new papers on its own. Research interests, questions and attached paper IDs stay in local browser storage. The [integrated roadmap](ROADMAP.md) describes future ingestion, PDF, citation and secure account milestones.

## Integrated Research Tools (four stage foundations)

Open [Research Tools](https://pritam-roy-99.github.io/researchlens/lab.html) from the shared navigation after deployment. The page combines:

- **Stage 2, discovery:** bounded recent metadata mirror from arXiv OAI-PMH plus live OpenAlex searches directly on ResearchLens. This is *not* a complete local historical arXiv index or embedding search.
- **Stage 3, reading:** PDF.js browser-local rendering of user-selected PDF files, page notes, export; side-by-side source-metadata comparison of two locally indexed arXiv papers and user-authored source-checked comparison notes.
- **Stage 4, accounts:** optional GitHub OAuth / Supabase RLS-protected private reading and project backup/restore, reusing existing optional public paper discussions and researcher profiles. **Inactive until an owner configures Supabase**, moderation and abuse protections.
- **Stage 5, connections:** live OpenAlex citation neighborhoods with source links, plus on-visit keyword watch against locally indexed papers. No background, email or push notifications.

The OAI workflow can run daily and stores at most 4,000 recently modified metadata records. For requirements, operational limits, privacy and setup, see [RESEARCH_TOOLS_SETUP.md](RESEARCH_TOOLS_SETUP.md). These are functional foundations, not claims of complete full-corpus semantic retrieval, reliable PDF theorem comparison, production community moderation, or automated scientific alerts.

## Homepage guided video

The homepage now includes a 48-second narrated, illustrated walkthrough explaining paper discovery, field-aware search, recommendations, reading lists, PDF notes, citation links and research questions. It is **a scripted product animation**, not a recording of live interactions or a claim that an AI video model generated live screenshots. The video uses accessible native browser controls, English captions (WebVTT), a poster image, a text transcript and no autoplay.

The source is `scripts/build_intro_video.py`. GitHub Actions generates `docs/assets/researchlens-tour.mp4`, the poster and captions during deployment, then caches the assets so routine hourly metadata updates don't re-encode the video. The build uses Pillow, FFmpeg and espeak-ng. No commercial video API credentials are needed. Media is served directly from GitHub Pages.

## Unified Discover (arXiv + field-aware scholarly search)

ResearchLens now offers **one Discover page** at [ResearchLens](https://pritam-roy-99.github.io/researchlens/#discover), with two clearly labeled source modes:

- **Latest arXiv:** the indexed new-submission feed, source categories, arXiv v1 date filters, followed quantum topics, saved and read status, keyboard shortcuts, recommendations, and historical arXiv-linked retrieval via OpenAlex.
- **Search all fields:** discipline/topic presets, custom interests, live OpenAlex scholarly search, publication date and sort filters, pages, saved OpenAlex papers, and BibTeX/JSON export.

Both modes are in the same homepage instead of separate destination pages, and mobile layouts adapt responsively. Field Explorer's existing localStorage keys and paper collections remain unchanged, so the Workspace still aggregates saved papers. Old `fields.html` bookmarks redirect to `/?view=scholarly#discover` and preserve query parameters.

The two modes **do not claim the same source coverage or date semantics**: arXiv's local rolling index is incomplete and uses original submission dates, whereas OpenAlex can find a wider body of publications using indexed publication dates. This is a unified interface, not an assertion that OpenAlex and arXiv contain the same records.

## Current features (deployed GitHub Pages prototype)

- Responsive scientific-paper website with title, abstract, author, and arXiv identifier search.
- arXiv category filters and 15 cross-cutting quantum subcategories (Bell tests, QKD, contextuality, steering, sensing, networks, optics, hardware, and more).
- Multi-label topic detection from title/abstract keywords, explicitly marked exploratory.
- Follow research topics and build a personalized feed; preferences are kept in your browser.
- Page through the indexed feed and find related papers in a subject-focused shortlist.
- Browser-local reading-list bookmarks with BibTeX export.
- Candidate related papers based on lexical overlap of indexed titles and abstracts.
- Scheduled synchronization of arXiv Atom API metadata using both newest submissions and latest revisions, with version-aware deduplication, up to 3,500 retained records and incremental updates.
- Direct links to title-based Semantic Scholar search from each paper.
- Optional OpenAlex citation metadata enrichment for exact normalized title and plausible year matches (requires an API key).
- GitHub Actions tests and GitHub Pages deployment; no paid server required.

### Important limitations

**No public AI novelty verdicts are generated.** The similarity feature only surfaces possible literature connections from a limited local index. It cannot establish mathematical equivalence, novelty, technical correctness, or misconduct. The repository is not a manuscript-submission service yet. The public GitHub Pages website does not run Python or Ollama.

An optional localhost-only Qwen/Ollama HTTP service is included in `api/server.py`, but the public static website does not call it. The original ZIP contains a more extensive FastAPI/SQLite development implementation that has not been fully imported.

## Search historical arXiv-linked papers inside ResearchLens

The homepage **Search historical arXiv papers here** button no longer redirects to arXiv. It opens an in-page search result pane with paper cards, date-range filtering, pagination, OpenAlex/DOI links and links to original arXiv records when the API exposes them. Press Enter in the main search field for the same in-site search.

This on-page history feature queries OpenAlex for works with an arXiv-hosted copy, using OpenAlex source S4306400194. It **does not guarantee complete arXiv coverage**, and OpenAlex publication dates **may differ from arXiv original submission dates**. The existing local index remains available via **Return to local feed**. Search URLs encode the query and dates, so they can be shared.

The local feed is still a small arXiv metadata snapshot. Neither OpenAlex results nor their citation data are automatically added to ResearchLens's permanent local database.

## ResearchLens Research Copilot

**[Launch Copilot](https://pritam-roy-99.github.io/researchlens/copilot.html)** or open it from any research paper. The copilot has five task modes: literature discovery, contribution comparison, explaining results, reviewer checks, and research directions.

The **evidence-only** mode works on the static site immediately and retrieves clickable paper references from the local arXiv snapshot. Use **Search wider literature** to query external OpenAlex. The optional **local Ollama** mode connects to an open-weight Qwen3.5 9B or 27B model running on the visitor's own computer. A much smaller Qwen2.5 WebGPU option is also provided for experimentation. GitHub Pages hosts no GPUs and provides **no shared inference server**.

Conversation history is held in tab memory and may be exported with source links. Research drafts are not posted to a ResearchLens backend. If the user selects Ollama, prompts and retrieved evidence are sent to the configured localhost Ollama process. WebGPU mode requires downloading model assets from third-party model hosts.

Scientific explanations, model comparisons, and citations are generated from **limited, unverified evidence**. Do not interpret them as formal theorem equivalence or novelty checks.

[Model and browser setup instructions](COPILOT_SETUP.md)

## New SciRate-style discovery and community workflow

- **Date browsing:** The research feed filters by a date range of first arXiv submission, for records present in its local snapshot. Global OpenAlex search also supports inclusive publication-date ranges.
- **Historical arXiv:** The homepage builds a direct arXiv advanced-search link using the selected dates and keywords; it also links to [OpenAlex global search](https://pritam-roy-99.github.io/researchlens/search.html), which supports date-only queries. ResearchLens does not locally mirror every paper in arXiv; historical links go to their authoritative records.
- **Recommendations:** A transparent, device-local "Recommended for me" feed based on topics the researcher follows and papers they save. No server-side personalization data collection.
- **Paper profiles:** Each record has a shareable \`paper.html?id=<arXiv ID>\` page, PDF / arXiv / SciRate / DOI link-outs (where available), related articles, and author search links.
- **Real shared discussions and endorsements:** Paper discussion pages look up a GitHub Issue associated with the arXiv ID. Visitors with GitHub accounts can add comments and 👍 reactions to the issue, visible to other researchers. A first discussion thread is seeded for arXiv:2608.13942 at [GitHub issue #1](https://github.com/pritam-roy-99/researchlens/issues/1). This is GitHub-hosted, **not native in-site social functionality**.
- **Researcher workspace:** A local profile editor stores name, affiliation, research interests, bio, and optional ORCID/GitHub links in the visitor's own browser. These are self-entered and not publicly verified; visitors can export/import their local profile. Public ResearchGate-like accounts, verified profiles, social follower graphs, and messaging **still need a secure authentication/database service**.
- **Day/night mode:** Accessible light/dark theme toggle on site pages, stored locally and shared across visits.
- **Quality controls:** GitHub Actions validates Python tests and browser JavaScript syntax before Pages deploy.

No author-provided profile or manuscript is implicitly endorsed by ResearchLens. Community reactions are not measures of scientific correctness or novelty.

For optional *native* ResearchLens authentication, public profiles, follows, comments and votes, the repository includes [SOCIAL_SETUP.md](SOCIAL_SETUP.md), [supabase/schema.sql](supabase/schema.sql), and conditional frontend integration. That backend is **not active** until a Supabase project, GitHub OAuth, and moderation safeguards are configured. The GitHub Issues discussion route works separately.

## Research workflow and first-load experience

- A pre-rendered static 30-paper snapshot appears at first paint with verified index count and synchronization timestamp. JavaScript progressively upgrades it to a searchable, paginated feed.
- Homepage displays local coverage (five arXiv categories plus curated historical IDs) and the oldest/newest source v1 publication dates. This is not complete arXiv coverage.
- **Global scholarly search:** [OpenAlex live search](https://pritam-roy-99.github.io/researchlens/search.html) queries the external OpenAlex corpus, which is much larger than ResearchLens's local GitHub Pages snapshot. It is not copied into our database.
- **Quantum topic subscriptions:** [all-research Atom feed](https://pritam-roy-99.github.io/researchlens/feeds/all.xml) and [example contextuality Atom feed](https://pritam-roy-99.github.io/researchlens/feeds/contextuality.xml).
- **Triage:** j/k navigate, s save, r mark as read, h hide, Enter open selected arXiv record. Bookmarks, read/hidden lists and followed topics are browser-local.
- Export bookmarks as BibTeX, RIS, or JSON; import JSON to restore a reading list and preferences. Paper cards offer arXiv ID and BibTeX copy plus a shareable search URL.
- Mathematical notation in feed cards uses external MathJax for TeX rendering, with plain text fallback when the CDN is unavailable.
- The local AI Lab evidence index uses a *title-weighted BM25-style lexical baseline* plus category overlap; larger external OpenAlex searches are optional and explicitly distinguishable. No embedding-based search or validated theorem comparison is implemented yet.
- [Methodology and coverage](https://pritam-roy-99.github.io/researchlens/methodology.html) documents known errors, refresh cadence, missing benchmark data, and contribution/reporting paths.

## AI Lab (new, public, experimental)

Open **[ResearchLens AI Lab](https://pritam-roy-99.github.io/researchlens/ai.html)** from the homepage or from any paper card.

**Immediately usable without AI hardware:** Select a paper or paste your own manuscript title and abstract, click **Generate evidence report**, and inspect the title/abstract-derived key concepts, publication-dated candidate related papers, and source links. The report can be exported as text. This is deterministic lexical retrieval, not machine learning or proof verification.

**Optional in-browser open-weight AI:** Click **Load open-weight AI model**. On a compatible WebGPU browser and sufficiently capable GPU, the site imports [WebLLM v0.2.86](https://github.com/mlc-ai/web-llm) from a CDN and downloads **Qwen2.5-0.5B-Instruct-q4f16_1-MLC** by default (approximately 1 GB graphics memory required, plus downloads and headroom). Alternatively, users can select Qwen3.5-0.8B or Qwen2.5-1.5B with higher hardware requirements. After the first load, model assets can be cached. The generative assistant explains claimed contributions, discusses limitations, and compares *the supplied abstracts* with citations to selected arXiv identifiers. It does **not** establish novelty or review proofs. Model accuracy has not been benchmarked.

The optional model runs in the user's browser, not in the GitHub Pages server. **It is experimental, may fail on unsupported WebGPU browsers or devices, and is not claimed to work on every machine.** No API key is needed; browser model downloads use third-party CDNs and Hugging Face. The draft's title and abstract are not sent to ResearchLens's server. Do not insert confidential data unless comfortable with local device and browser risks.

The local Ollama API (`api/server.py`) is a separate experimental developer mode and is **not automatically connected to the public site**.

## Publish on GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Under Build and deployment, set **Source: GitHub Actions**.
3. Open **Actions → Refresh arXiv and deploy ResearchLens → Run workflow** to fetch real papers and deploy.
4. Once deployment succeeds, visit https://pritam-roy-99.github.io/researchlens/.

The scheduled refresh checks hourly at minute 17 UTC, with supplementary post-announcement checks at minute 47 during 00:00–05:59 UTC Monday–Friday, on a best-effort basis. Upstream arXiv releases and GitHub scheduling can delay updates. If the API is unavailable, the previous snapshot is retained.

## Develop locally

Requires Python 3.11 or newer.

Run `python -m unittest discover -s tests -v` to test. Run `python scripts/sync.py` to refresh (internet required). The importer separately queries newly submitted papers and recently revised papers, so revision traffic cannot displace new submissions from the fetched window. The default ingest searches `quant-ph, cs.IT, hep-th, physics.optics, cond-mat.mes-hall` with rate-limited requests.

Optional OpenAlex metadata: register for an API key according to OpenAlex's current developer terms and add it as a GitHub Actions repository secret named `OPENALEX_API_KEY`. The workflow will then gradually enrich matching paper records, without making unsupported novelty claims. You can also run `python -m scripts.enrich` locally with that environment variable set.

The automatic provider refresh is independent of model inference. GitHub Pages cannot run Ollama; AI requires a separate protected backend or running the local API.

For optional local open-weight AI, install [Ollama](https://ollama.com), run `ollama pull qwen3.5:4b`, then launch `python -m api.server`. The local developer API provides `POST http://127.0.0.1:8765/analyze` with JSON `{"paper_id":"<arxiv ID>"}`. It requires a populated `docs/data/feed.json` and returns claimed contributions, comparison questions, and candidate prior-paper references. All are **unverified preliminary guidance, not scientific verdicts**.

Serve the site with:

```bash
python -m http.server 8000 --directory docs
```

Then open http://localhost:8000.

## Code structure

- `docs/index.html`: Static interactive website.
- `docs/data/feed.json`: Versioned metadata snapshot.
- `scripts/sync.py`: multi-category arXiv importer and deduplication.
- `scripts/quantum_topics.py`: transparent research-subfield classifier and topic catalog.
- `scripts/enrich.py`: optional citation metadata enrichment via OpenAlex.
- `tests/test_sync.py` and `tests/test_topics.py`: Parser, classification, and versioning tests.
- `api/server.py`: Optional localhost-only Ollama analysis API.
- `.github/workflows/pages.yml`: Scheduled refresh and Pages deployment.

## Roadmap

Broader full-text retrieval; verified citation networks; evidence-linked claim comparisons; optional authenticated open-weight AI inference; better research reading tools; expert commentary and corrections; moderated manuscript submission with persistent identifiers and preservation arrangements.

## License

MIT for original application source code. The original publications and third-party content retain their own rights and license conditions.
