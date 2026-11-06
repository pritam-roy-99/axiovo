## 2026 data-trust upgrade and reproducible build

The current source-trust pipeline is additive and free to operate on GitHub Pages.
Run `python scripts/build_verified_records.py` to validate source IDs and
produce per-source/month JSON shards, a manifest, per-archive indexed coverage,
and a needs-review topic queue. Run `python scripts/build_taxonomy.py` to
create `docs/data/taxonomy.json` from the existing curated TSV directories.
Original source dates are not conflated: `submitted_date` and
`announced_date` are separate fields, and missing values remain null.

The canonical schema includes: `id`, `source`, `title`, `abstract`,
`authors[]`, `categories[]`, `submitted_date`, `announced_date`,
`version`, `doi`, `pdf_url`, `landing_url`, `journal_ref`, `license`,
`source_checked_at`, `metadata_source`, `subtopics[]`, and `tag_status`.
See [upgrade QA and manual checks](UPGRADE_QA.md) and
[change history](CHANGELOG.md). No existing browser Library storage keys or
page routes are migrated.

These source-derived snapshots are not complete historical archives. Full
embedding-based semantic search, secure shared collections and admin approval
still require additional implementation and measured testing.

## arXiv ingestion: completeness versus update speed

Axiovo now uses two separate official arXiv metadata paths, modeled on the
[hourly OAI-PMH synchronization documented by SciRate](https://github.com/scirate/scirate/blob/main/README.markdown).

1. **Hourly all-category updates:** GitHub Actions harvests arXiv OAI-PMH
   `ListRecords` metadata with resumption tokens and uses it in the recent
   reading feed. A source update datestamp is **not** an arXiv first-submission
   date or a daily announcement date. Requests are rate-limited and can fail;
   Axiovo retains the last verified snapshot instead of inventing records.
2. **Complete dated batches:** a separate scheduled harvester queries
   `submittedDate` for **each closed UTC day**, across all arXiv categories,
   follows every page and verifies `opensearch:totalResults` against the
   number of distinct arXiv identifiers received. A day is published in
   `docs/data/arxiv-days/manifest.json` only if complete.
3. **Custom historical ranges:** the project maintainer can run
   [the backfill workflow](https://github.com/pritam-roy-99/axiovo/actions/workflows/arxiv-archive-backfill.yml)
   with `from_date` and `to_date` (up to 31 UTC days per batch). Older
   dates are **not** assumed to be indexed merely because the homepage or
   OpenAlex contains a subset. Unavailable dates are marked incomplete.
4. **Read-only static hosting:** GitHub Pages serves previously harvested JSON.
   A visitor cannot launch server-side bulk arXiv harvesting from the
   browser. For unharvested historical days, Axiovo links to the official
   arXiv search and reports partial coverage.

The official arXiv
[bulk metadata documentation](https://github.com/arXiv/arxiv-docs/blob/develop/source/help/bulk_data.md)
recommends OAI-PMH for bulk synchronization. Its Atom search API supports
`submittedDate` and pagination, but GitHub-hosted requests can receive
HTTP 429. Neither Axiovo nor SciRate guarantees instant availability after
arXiv's announcement. Date batches refer to **first submission (UTC)**, not
the SciRate-style announcement date.

# Axiovo

## Axiovo: from knowledge to discovery

Axiovo combines **axiom** (a foundational starting point for reasoning) with **novo** (new). Axiovo helps researchers find relevant preprints across arXiv, bioRxiv and ChemRxiv, verify them at the original source, and organize their reading in a private workspace.

Choose an archive from Home or search all three in **Research Desk**. Save papers to **Library**, compare abstracts against the originals, and follow the authors, topics or Discover paths you choose in **My Feed**. Library data and follows are stored on this device.

## Research fields and local AI

Axiovo includes 12 top-level disciplines, including a dedicated **High-energy physics & particle physics** field with research areas for quantum field theory, Standard Model phenomenology, lattice QCD, collider physics, scattering amplitudes and more. Each topic has fine-grained interests, which can be customized and saved in your browser.

The optional Research Assistant provides evidence-led source retrieval, literature comparison, deep technical reviews and assumption-checking workflows. For model-generated answers, connect a locally running [Ollama](https://ollama.com/) instance, detect installed models and choose an analysis depth. Hosted GPU inference and mathematically verified results are not included in the free static GitHub Pages deployment.

## Multi-disciplinary discovery and optional evidence providers

- **Neutral first launch:** All research disciplines are available, without special ranking weight for quantum physics. Your previously selected discipline remains saved on this device.
- **arXiv cross-listing:** Recent-paper cards display secondary arXiv categories alongside the primary category. Use *Cross-listed only* to filter papers that appear in more than one category. This is based on source metadata, not AI-inferred classifications.
- **bioRxiv:** A new Discover tab searches a cached snapshot of recent life-science preprints from the official public bioRxiv API. Save DOI-identified bioRxiv preprints in Library with private notes. Historical coverage remains available on bioRxiv's official site.
- **Visual palettes:** Settings offers Ocean, Forest, Violet, Rose and Amber, each with day and night modes. The palette is stored locally.
- **Community:** It is intentionally a secondary link in Settings rather than a main navigation destination.
- **Consensus:** An optional Consensus-powered search is available *inside the locally run app* when `CONSENSUS_API_KEY` is set. The token stays on the local Python server, never in browser JavaScript or GitHub Pages. On hosted Pages, open Consensus's official search separately. Free API accounts currently have a limited monthly quota; please consult provider terms.
- **Free AI:** Evidence-only retrieval works without model downloads. Researchers can enable a local Ollama Qwen3.5 model or an experimental small browser-based model. Axiovo does not supply free GPU inference or certify proofs automatically.

### Use Consensus locally

Register for a Consensus API key at [Consensus](https://consensus.app/), then start Axiovo on your own computer:

```bash
# macOS / Linux
export CONSENSUS_API_KEY="your-own-api-key"
python3 run.py
```

For Windows PowerShell:

```powershell
$env:CONSENSUS_API_KEY="your-own-api-key"
py run.py
```

Use Discover → **Search with Consensus (local API)**. The local HTTP server binds only to `127.0.0.1` and forwards a query to Consensus `/v1/search` with the key from its environment. Never commit your key into this repository or paste it into the website.

## What makes this project different

**Axiovo is an open-source, local-first research discovery and reading workspace**, rather than a pay-per-paper AI PDF analysis service. Its intended workflow is **discover → verify the original source → save → annotate → revisit and discuss**.

- **Open and inspectable:** the code is public; arXiv metadata and OpenAlex provenance are explicitly identified.
- **Use without a hosted account:** browser-local reading, PDF notes and personal research interests; export options are available in the workspace.
- **Install or run locally:** use the installable web app or run `python3 run.py` with no extra packages.
- **Source-linked rather than verdict-driven:** original arXiv records and revision-aware links are emphasized. AI output, citation counts and lexical rankings must not be treated as correctness or novelty certification.

**Important limits:** historical search is not a complete arXiv mirror. Hosted social accounts and model inference require separate setup, and local storage is device/browser-specific. Paper analysis and comparison are not unique to this project. We do not claim scientifically validated novelty or correctness from automated reports.

**Naming:** Other unrelated projects and websites use “Research Lens” or “Axiovo”. This repository is independent of them. A distinctive product name and a trademark/domain check should be considered before an app-store launch.

## Install or run locally (no build step)

- **Android / desktop:** Open [Axiovo](https://pritam-roy-99.github.io/axiovo/) in Chrome or Edge and use **Install app** or **Add to Home screen** when the browser offers it.
- **Run on your computer:** Download or clone this GitHub repository, then run `python3 run.py` (Windows: `py run.py`). The app opens in your browser on a local address. Stop with Ctrl+C.
- **Offline:** Previously visited app pages and scripts can work offline. Live scholarly search, remote PDFs, external discussions, and model downloads still need internet. Data saved in your browser is not automatically synced.

See [LOCAL_APP.md](LOCAL_APP.md) for complete installation, update, and privacy instructions.


**Axiovo is a free, open-source research-discovery prototype with preliminary prior-literature exploration.** It is independent from arXiv and SciRate.

## Field Explorer (proposed Axiovo 2.0 workspace)

Open **[Explore by field](https://pritam-roy-99.github.io/axiovo/fields.html)** after this feature branch is merged and deployed.

- Nine discipline presets: quantum information/physics, mathematics, astrophysics, computer science/AI, biology, medicine/public health, chemistry/materials, engineering/robotics, and social sciences/economics.
- Topic chips, suggested literature searches, custom research topics, and field-specific evaluation checklists.
- Live OpenAlex search that keeps results on Axiovo, with publication date-range filtering, relevance/newest/citation sorting, and paging.
- Source links to original OpenAlex, DOI, open-access and arXiv records when available.
- A separate browser-local reading collection with BibTeX and JSON export, plus copy citation actions.
- Responsive layout and shared day/night setting. The existing research feed, copilot, search, AI Lab and profiles are unchanged.

**Scope and caveats:** Field selection is a query-preset mechanism rather than a validated classifier; search is not restricted to field-specific databases and is subject to OpenAlex coverage and rate limits. The feature does not add institutional subscriptions, paywalled full text, centrally synced accounts, hosted inference, or guaranteed coverage of historical arXiv. User selections and saved records remain in this browser. The field workflows are guidance rather than automatic quality judgments.

## Researcher workspace and consistent navigation

**New:** [My research workspace](https://pritam-roy-99.github.io/axiovo/workspace.html) gives researchers a single starting point with their selected Field Explorer focus, latest papers from the existing arXiv snapshot, unified browser-local saved reading from the arXiv feed and OpenAlex Field Explorer, reading progress (to-read/reading/finished), private notes, keyword filtering and library exports (JSON/BibTeX). A responsive navigation bar now appears on the site's primary pages, allowing one-click access to the Workspace, arXiv Feed, Field Explorer, Copilot, AI Lab and Profile. The homepage links directly to the workspace.

**Data limitations:** Library entries are aggregated from two existing localStorage collections; this is not a server-side account, sync service, verified literature database, or complete arXiv archive. Notes and reading states are stored on the current device. Exported JSON is a backup, not yet an import mechanism for the new unified workspace. External academic metadata retain their source caveats. The workspace displays recent papers already present in the locally indexed feed; it cannot accelerate arXiv ingestion itself.

## Personalized research discovery and question tracking

The [research workspace](https://pritam-roy-99.github.io/axiovo/workspace.html) now includes **Relevant to your research** and **My research questions**.

- Choose specific research interests or exact author names; Axiovo additionally uses your Field Explorer topic and followed topics.
- Rank papers from the **existing local arXiv snapshot** with transparent title, abstract, topic, project keyword and author matching. Each suggestion explains its match; existing saved papers are down-ranked and hidden papers are excluded.
- Save a suggested paper into the existing arXiv reading list, view it on arXiv, or open the Copilot with its identifier.
- Record research questions with an objective, searchable keywords and progress status; attach or remove papers, edit questions, or export/import your question data as JSON.
- Regression tests for retrieval scoring and normalization are included in the deployment workflow.

**Limitations:** Ranking is deterministic lexical matching rather than an evaluated embedding or AI recommendation service. It does not automatically search the whole arXiv archive, assess importance or prove novelty, and cannot notify users of new papers on its own. Research interests, questions and attached paper IDs stay in local browser storage. The [integrated roadmap](ROADMAP.md) describes future ingestion, PDF, citation and secure account milestones.

## Integrated Research Tools (four stage foundations)

Open [Research Tools](https://pritam-roy-99.github.io/axiovo/lab.html) from the shared navigation after deployment. The page combines:

- **Stage 2, discovery:** bounded recent metadata mirror from arXiv OAI-PMH plus live OpenAlex searches directly on Axiovo. This is *not* a complete local historical arXiv index or embedding search.
- **Stage 3, reading:** PDF.js browser-local rendering of user-selected PDF files, page notes, export; side-by-side source-metadata comparison of two locally indexed arXiv papers and user-authored source-checked comparison notes.
- **Stage 4, accounts:** optional GitHub OAuth / Supabase RLS-protected private reading and project backup/restore, reusing existing optional public paper discussions and researcher profiles. **Inactive until an owner configures Supabase**, moderation and abuse protections.
- **Stage 5, connections:** live OpenAlex citation neighborhoods with source links, plus on-visit keyword watch against locally indexed papers. No background, email or push notifications.

The OAI workflow can run daily and stores at most 4,000 recently modified metadata records. For requirements, operational limits, privacy and setup, see [RESEARCH_TOOLS_SETUP.md](RESEARCH_TOOLS_SETUP.md). These are functional foundations, not claims of complete full-corpus semantic retrieval, reliable PDF theorem comparison, production community moderation, or automated scientific alerts.

## Topic Explorer, Library, and Research Assistant

Open an archive and choose **Archive subject → Research subfield → Sub-subtopic**.
The TSV catalogs in `docs/data/topics/` define Axiovo’s research subfields and
synonyms for all supported archive subjects. The subject picker preserves the
official category codes. The topic finder searches across all three levels inside
the chosen archive. Paths can be shared as URLs and saved or extended in the browser.

The Research Desk searches the three archives in separate result sections.
The Library puts saved papers first and has a Following view for author name
lookups. The Research Assistant offers related arXiv sources and inspection of
original abstracts, with optional local models in a separate settings panel.
Subject coverage and paper coverage are distinct. Date completeness is shown
only for verified arXiv submission batches.

Regenerate the shared archive pages with `python scripts/build_archive_pages.py`.
GitHub Pages assembles the captioned homepage tour from the checked-in narration
using `python scripts/build_intro_video.py` with Pillow and FFmpeg. To regenerate
the voice takes, install `kokoro-onnx==0.6.1` and pass the
[v1.1 release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1)
English model and voice files to `--regenerate-narration MODEL VOICES`.

## Unified Discover (arXiv + field-aware scholarly search)

Axiovo now offers **one Discover page** at [Axiovo](https://pritam-roy-99.github.io/axiovo/#discover), with two clearly labeled source modes:

- **Latest arXiv:** the indexed new-submission feed, source categories, arXiv v1 date filters, followed quantum topics, saved and read status, keyboard shortcuts, recommendations, and historical arXiv-linked retrieval via OpenAlex.
- **Search all fields:** discipline/topic presets, custom interests, live OpenAlex scholarly search, publication date and sort filters, pages, saved OpenAlex papers, and BibTeX/JSON export.

Both modes are in the same homepage instead of separate destination pages, and mobile layouts adapt responsively. Field Explorer's existing localStorage keys and paper collections remain unchanged, so the Workspace still aggregates saved papers. Old `fields.html` bookmarks redirect to `/?view=scholarly#discover` and preserve query parameters.

The two modes **do not claim the same source coverage or date semantics**: arXiv's local rolling index is incomplete and uses original submission dates, whereas OpenAlex can find a wider body of publications using indexed publication dates. This is a unified interface, not an assertion that OpenAlex and arXiv contain the same records.

## Unified Research Assistant

Axiovo combines the former AI Lab and Research Copilot into **one** interface: [Research Assistant](https://pritam-roy-99.github.io/axiovo/copilot.html).

- Start from a scientific question, arXiv ID or indexed paper; choose literature discovery, contributions, technical explanation, reviewer checks, speculative directions, or claim-and-assumption analysis.
- Paper selection and comparison integrate AI Lab's separate metadata analysis. A source-linked comparison shows indexed abstracts, original-submission chronology, shared concepts and a checklist for human verification.
- BM25-style metadata ranking combines the local arXiv Atom snapshot and bounded OAI-PMH mirror. Live OpenAlex bibliographic search can be added directly to the source context.
- The wider-retrieval setting explicitly distinguishes remote and local searches. An unpublished draft is **not automatically** submitted to OpenAlex; external searches remain user-initiated when a draft is present.
- Deterministic source evidence and conversation exports work without any local language model. Optional Ollama Qwen on the researcher's computer and experimental browser WebGPU Qwen remain available, and model citations to nonexistent source numbers are flagged.
- The old `ai.html` route redirects to the unified assistant, retaining arXiv paper IDs and question parameters.

**Limits:** This is metadata/abstract-based research assistance, not complete full-text semantic retrieval, theorem verification, proof equivalence, automated novelty certification or a hosted AI API. OpenAlex availability is external, and local AI modes need device-specific setup.

## Researcher-friendly discovery and reading-list controls

Axiovo now prioritizes **Discover** before **Workspace** in the top navigation and homepage actions. The arXiv and wider scholarly discovery interfaces share a **primary research field** preference. Researchers can select a main discipline, one of its established research areas, and then a curated specialized interest. The nine supported discipline presets have **246 field-specific subtopic suggestions**. Selecting a subtopic starts a corresponding live OpenAlex metadata search and updates the browser-local research interest used by the workspace and recommendations.

The limited local arXiv feed is primarily a quantum/physics snapshot. Choosing another discipline switches to broader OpenAlex discovery instead of presenting quantum papers as if they matched that discipline. Field menus are compact in-page controls rather than Android's full-screen native selectors.

Paper cards now have one **Analyze / Ask AI** link to the unified Research Assistant (the former AI Lab and Copilot are already merged). A modern, accessible bookmark button saves papers to reading lists with a clear saved/unsaved state. Both arXiv and OpenAlex saved collections remain browser-local and are aggregated in the research workspace.

**Scope:** Research subtopics are curated search suggestions, not a disciplinary ontology or a validated paper classifier. The local arXiv snapshot is incomplete, and OpenAlex results depend on source indexing and API availability. Saved reading lists and preferences stay on the current device unless explicitly exported or backed up through an independently configured account service.

## Researcher-centered Discover usability

- **Workspace first, Discover second** in the primary navigation.
- **One AI action per paper:** the feed and scholarly search use **Research Assistant**, which opens the same unified paper analysis and Q&A tool. When an arXiv ID can be extracted from OpenAlex's source URL, it is passed to the assistant; otherwise the paper title becomes the search query.
- **Bookmark-style reading list button** with an icon and distinct Saved/Save paper states on both sources, with keyboard and accessibility labels.
- **Explore your main field:** Discover uses the researcher's selected discipline from the browser-local profile and shows field-specific topics when the broader scholarly source is selected. The local arXiv feed still covers only its original categories and is explicitly distinguished from wider cross-disciplinary search.
- **Field-specific subtopics and followed interests:** follow curated specialized areas or add a personal interest under a particular field and research topic. Followed subtopics are listed first; the current Workspace and personalized recommendation logic reuse those choices. These are browser-local preferences, not server-side researcher accounts or a scientific taxonomy classifier.

The preferences live in `localStorage` under `axiovo-field-explorer-v1` and `axiovo-interests-by-field-v1`. To transfer them across devices, use browser data migration or a future authenticated sync feature. A local preference does not expand the underlying arXiv metadata coverage.

## Discipline-specific OpenAlex search relevance

Axiovo Discover no longer treats a bare broad keyword as a complete field-specific search. The integrated `scholar-search.js` adds:
- OpenAlex `primary_topic.field.id` filters using discipline-related fields, with explicit selection of the relevant main field.
- Quantum-specific contextuality disambiguation, distinguishing mathematical/physical contextuality from unrelated clinical, educational and social-science uses.
- Client-side title/abstract/topic screening of 100 API candidates per batch. Results without a matching classified field or topical evidence are excluded.
- Publication date checks to prevent future-dated works from appearing before today's date.
- Relevant-record counts for the screened batch rather than unqualified counts of broad OpenAlex keyword matches.
- Regression cases for real unrelated examples such as ANA pretest screening and urban heritage, as well as positive quantum contextuality cases.

**Important:** Field classification in OpenAlex is approximate, and stronger filtering trades recall for precision. It may omit interdisciplinary papers or records with incomplete topic metadata. This is not exhaustive research retrieval; for complete prior-art work, cross-check additional source databases and original papers. OpenAlex's live API and indexing limits still apply.

## AI-assisted field-specific literature discovery

Discover now uses a staged retrieval strategy rather than relying solely on exact keywords.

1. Search OpenAlex bibliographic metadata with the user's selected discipline and publication-date filters, then screen title/abstract/topic evidence.
2. When fewer than six matching records survive and **Use AI semantic search when keyword results are weak** is enabled, automatically try OpenAlex's embedding-based `search.semantic` endpoint. It can retrieve conceptually related literature without identical wording.
3. Recheck the semantic candidates against discipline classification, source date and specific domain anchors. E.g. Preparation contextuality must concern quantum contextuality *and* preparation, not contextual urbanism or clinical medicine.
4. Deduplicate candidates, retain verified lexical results ahead of fallback matches and label each new AI semantic candidate visibly. The fallback can be turned off by the user.

The semantic query and field preferences are transmitted to OpenAlex; a local AI model is not installed and no unpublished manuscript is uploaded. Semantic search is subject to OpenAlex availability, usage budgets, and rate limits. Only 50 records per semantic request are possible, and the fallback is attempted on the first search batch. This is a **relevance aid**, not an exhaustive review, a novelty assessment, or a guarantee that all papers are correctly classified. An OpenAlex field restriction and topical anchors can still omit relevant cross-disciplinary results. Axiovo falls back to standard bibliographic results if the semantic service fails.

## arXiv-first discovery, revisions and reading controls

Axiovo now treats the local JSON feed as **a latest-announcements cache**, not as the authority for which papers exist. The main paper search offers **Search all arXiv**: it queries public OpenAlex metadata restricted to works with an arXiv-hosted copy, with direct links to the authoritative arXiv abstract and PDF pages. The all-field scholarly explorer is also restricted to arXiv-hosted works. Any valid exact arXiv ID, such as `2608.13942v1`, can be opened **without either database containing the paper**.

- The page understands modern identifiers (`2608.13942v1`) and legacy identifiers (`cond-mat/0207270v2`). An unversioned ID opens arXiv's latest revision, while a `vN` suffix opens that exact requested revision, if it exists. OpenAlex's `submittedVersion` designation is **not** treated as an arXiv version number.
- Each result offers a responsive, high-contrast action bar: **Read on arXiv**, **PDF**, **Research Assistant**, and **Save paper**. Historical search and the wider field explorer include a revision-number control for opening the correct arXiv version.
- Exact revision IDs saved from historical results or paper pages remain distinct in the browser reading library. The Workspace also accepts saved arXiv IDs never present in the local cache.
- The Workspace's personalized feed supplements recent announcements with live arXiv-linked OpenAlex results for the researcher's chosen interest, when that external API is available.
- The original arXiv website remains one click away even when OpenAlex search returns no matching metadata.

**Coverage and technical limits:** A static GitHub Pages site cannot browser-fetch all arXiv API responses because of cross-origin restrictions; its on-site historical search therefore uses OpenAlex as a discovery index and **does not guarantee full arXiv recall** or authoritative version-date metadata. For exact versions, arXiv is authoritative; arXiv itself can confirm whether a requested `vN` exists. OpenAlex labels manuscript copy classes (submitted/accepted/published), not the arXiv revision sequence. Metadata from OpenAlex can lag or merge preprints with journal versions; complete arXiv archive hosting requires a durable harvester/database or backend. No proxy is used to send confidential manuscript content to third parties.

## One connected research-focus selector

The Discover page has a **single shared research focus bar** above the arXiv sources. Choose a **main field**, then a **research area**, then a **specialized subtopic**. Every selection updates the visible topic/subtopic choices using `docs/research-fields.js`, writes the browser-local preference `axiovo-field-explorer-v1`, and refreshes the arXiv-hosted OpenAlex search. Readers may star specialized interests per field/topic or add a custom subtopic, which is saved under `axiovo-interests-by-field-v1`.

This replaces the confusing duplicate quantum-topic chip strip and repeated discipline/topic selectors from the former Field Explorer sidebar. Older controls remain invisible for compatibility with existing feed handlers; they no longer compete for attention. The latest-announcements source remains available, clearly labelled as a limited local snapshot. Selecting a field, research area, or subtopic switches to wider arXiv-hosted discovery, where subjects are not restricted to the five local snapshot categories. Field-specific search still relies on OpenAlex coverage and is not a complete arXiv archive.

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

## Search historical arXiv-linked papers inside Axiovo

The homepage **Search historical arXiv papers here** button no longer redirects to arXiv. It opens an in-page search result pane with paper cards, date-range filtering, pagination, OpenAlex/DOI links and links to original arXiv records when the API exposes them. Press Enter in the main search field for the same in-site search.

This on-page history feature queries OpenAlex for works with an arXiv-hosted copy, using OpenAlex source S4306400194. It **does not guarantee complete arXiv coverage**, and OpenAlex publication dates **may differ from arXiv original submission dates**. The existing local index remains available via **Return to local feed**. Search URLs encode the query and dates, so they can be shared.

The local feed is still a small arXiv metadata snapshot. Neither OpenAlex results nor their citation data are automatically added to Axiovo's permanent local database.

## Axiovo Research Copilot

**[Launch Copilot](https://pritam-roy-99.github.io/axiovo/copilot.html)** or open it from any research paper. The copilot has five task modes: literature discovery, contribution comparison, explaining results, reviewer checks, and research directions.

The **evidence-only** mode works on the static site immediately and retrieves clickable paper references from the local arXiv snapshot. Use **Search wider literature** to query external OpenAlex. The optional **local Ollama** mode connects to an open-weight Qwen3.5 9B or 27B model running on the visitor's own computer. A much smaller Qwen2.5 WebGPU option is also provided for experimentation. GitHub Pages hosts no GPUs and provides **no shared inference server**.

Conversation history is held in tab memory and may be exported with source links. Research drafts are not posted to a Axiovo backend. If the user selects Ollama, prompts and retrieved evidence are sent to the configured localhost Ollama process. WebGPU mode requires downloading model assets from third-party model hosts.

Scientific explanations, model comparisons, and citations are generated from **limited, unverified evidence**. Do not interpret them as formal theorem equivalence or novelty checks.

[Model and browser setup instructions](COPILOT_SETUP.md)

## New SciRate-style discovery and community workflow

- **Date browsing:** The research feed filters by a date range of first arXiv submission, for records present in its local snapshot. Global OpenAlex search also supports inclusive publication-date ranges.
- **Historical arXiv:** The homepage builds a direct arXiv advanced-search link using the selected dates and keywords; it also links to [OpenAlex global search](https://pritam-roy-99.github.io/axiovo/search.html), which supports date-only queries. Axiovo does not locally mirror every paper in arXiv; historical links go to their authoritative records.
- **Recommendations:** A transparent, device-local "Recommended for me" feed based on topics the researcher follows and papers they save. No server-side personalization data collection.
- **Paper profiles:** Each record has a shareable \`paper.html?id=<arXiv ID>\` page, PDF / arXiv / SciRate / DOI link-outs (where available), related articles, and author search links.
- **Real shared discussions and endorsements:** Paper discussion pages look up a GitHub Issue associated with the arXiv ID. Visitors with GitHub accounts can add comments and 👍 reactions to the issue, visible to other researchers. A first discussion thread is seeded for arXiv:2608.13942 at [GitHub issue #1](https://github.com/pritam-roy-99/axiovo/issues/1). This is GitHub-hosted, **not native in-site social functionality**.
- **Researcher workspace:** A local profile editor stores name, affiliation, research interests, bio, and optional ORCID/GitHub links in the visitor's own browser. These are self-entered and not publicly verified; visitors can export/import their local profile. Public ResearchGate-like accounts, verified profiles, social follower graphs, and messaging **still need a secure authentication/database service**.
- **Day/night mode:** Accessible light/dark theme toggle on site pages, stored locally and shared across visits.
- **Quality controls:** GitHub Actions validates Python tests and browser JavaScript syntax before Pages deploy.

No author-provided profile or manuscript is implicitly endorsed by Axiovo. Community reactions are not measures of scientific correctness or novelty.

For optional *native* Axiovo authentication, public profiles, follows, comments and votes, the repository includes [SOCIAL_SETUP.md](SOCIAL_SETUP.md), [supabase/schema.sql](supabase/schema.sql), and conditional frontend integration. That backend is **not active** until a Supabase project, GitHub OAuth, and moderation safeguards are configured. The GitHub Issues discussion route works separately.

## Research workflow and first-load experience

- A pre-rendered static 30-paper snapshot appears at first paint with verified index count and synchronization timestamp. JavaScript progressively upgrades it to a searchable, paginated feed.
- Homepage displays local coverage (five arXiv categories plus curated historical IDs) and the oldest/newest source v1 publication dates. This is not complete arXiv coverage.
- **Global scholarly search:** [OpenAlex live search](https://pritam-roy-99.github.io/axiovo/search.html) queries the external OpenAlex corpus, which is much larger than Axiovo's local GitHub Pages snapshot. It is not copied into our database.
- **Quantum topic subscriptions:** [all-research Atom feed](https://pritam-roy-99.github.io/axiovo/feeds/all.xml) and [example contextuality Atom feed](https://pritam-roy-99.github.io/axiovo/feeds/contextuality.xml).
- **Triage:** j/k navigate, s save, r mark as read, h hide, Enter open selected arXiv record. Bookmarks, read/hidden lists and followed topics are browser-local.
- Export bookmarks as BibTeX, RIS, or JSON; import JSON to restore a reading list and preferences. Paper cards offer arXiv ID and BibTeX copy plus a shareable search URL.
- Mathematical notation in feed cards uses external MathJax for TeX rendering, with plain text fallback when the CDN is unavailable.
- The local AI Lab evidence index uses a *title-weighted BM25-style lexical baseline* plus category overlap; larger external OpenAlex searches are optional and explicitly distinguishable. No embedding-based search or validated theorem comparison is implemented yet.
- [Methodology and coverage](https://pritam-roy-99.github.io/axiovo/methodology.html) documents known errors, refresh cadence, missing benchmark data, and contribution/reporting paths.

## AI Lab (new, public, experimental)

Open **[Axiovo AI Lab](https://pritam-roy-99.github.io/axiovo/ai.html)** from the homepage or from any paper card.

**Immediately usable without AI hardware:** Select a paper or paste your own manuscript title and abstract, click **Generate evidence report**, and inspect the title/abstract-derived key concepts, publication-dated candidate related papers, and source links. The report can be exported as text. This is deterministic lexical retrieval, not machine learning or proof verification.

**Optional in-browser open-weight AI:** Click **Load open-weight AI model**. On a compatible WebGPU browser and sufficiently capable GPU, the site imports [WebLLM v0.2.86](https://github.com/mlc-ai/web-llm) from a CDN and downloads **Qwen2.5-0.5B-Instruct-q4f16_1-MLC** by default (approximately 1 GB graphics memory required, plus downloads and headroom). Alternatively, users can select Qwen3.5-0.8B or Qwen2.5-1.5B with higher hardware requirements. After the first load, model assets can be cached. The generative assistant explains claimed contributions, discusses limitations, and compares *the supplied abstracts* with citations to selected arXiv identifiers. It does **not** establish novelty or review proofs. Model accuracy has not been benchmarked.

The optional model runs in the user's browser, not in the GitHub Pages server. **It is experimental, may fail on unsupported WebGPU browsers or devices, and is not claimed to work on every machine.** No API key is needed; browser model downloads use third-party CDNs and Hugging Face. The draft's title and abstract are not sent to Axiovo's server. Do not insert confidential data unless comfortable with local device and browser risks.

The local Ollama API (`api/server.py`) is a separate experimental developer mode and is **not automatically connected to the public site**.

## Publish on GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Under Build and deployment, set **Source: GitHub Actions**.
3. Open **Actions → Refresh arXiv and deploy Axiovo → Run workflow** to fetch real papers and deploy.
4. Once deployment succeeds, visit https://pritam-roy-99.github.io/axiovo/.

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

## Positioning: Axiovo, Zotero, and Semantic Scholar

**Axiovo is a local-first daily research-reading workspace, not a replacement for a complete scholarly index or reference manager.** Reading lists, local notes, followed topics and preference signals do not require an account; optional external, community and hosted integrations have their own terms.

| Workflow | Axiovo | Zotero | Semantic Scholar |
| --- | --- | --- | --- |
| Best use | Daily preprint discovery, version-specific arXiv links, offline-friendly reading list | Reference management, PDF annotation, citations in manuscripts | Large-scale scholarly search, citation graph and recommendations |
| Source coverage | Limited recent arXiv category snapshots plus external lookups; **not** a full mirror | Imported and collected references | Broad scholarly corpus |
| Local-first without account | Yes, for core reading workflows | Yes, via local Zotero library | Search without an account; library features vary |
| arXiv revisions | Version-exact source links and saved revision IDs | Managed via imported source records | Metadata varies by indexed record |
| Transfer between tools | BibTeX and RIS export; arXiv-ID import from RIS and local JSON backup | BibTeX and RIS import/export, Connector | Citation and collection export features |

Axiovo's paper record and fallback results label provenance and limitations. A successful search does **not** establish priority, novelty, correctness or complete coverage. See [Zotero translators](https://www.zotero.org/support/dev/translators) and [OpenAlex API guidance](https://help.openalex.org/api/authentication/) for relevant provider limits.

## Prioritized roadmap and implemented features

**Shipped or integrated into the current source:**

1. **More disciplines and resilient discovery:** Broader representative arXiv category snapshots, explicit arXiv IDs, OpenAlex search and independently indexed Semantic Scholar fallback on empty or rate-limited searches. Scope remains partial.
2. **Zotero interoperability:** Copy DOI/arXiv IDs, export Zotero-compatible RIS, import RIS records containing unambiguous arXiv IDs without overwriting saved papers. To add citations to Zotero, import the RIS file or use the Zotero Connector on the source arXiv page; the static site does not write directly into a Zotero account.
3. **Private local feed learning:** Per-paper *More like this* and *Less like this* preference signals influence recommendations in-browser. These local settings are included in device backups and are not transmitted to a ranking service.
4. **Per-topic Atom subscriptions:** Generated during deployment for all available topic labels, with subscription links for followed topics. Feed updates depend on successful metadata refreshes.
5. **Account-free data transfer:** Device-data export and conservative restore in Settings. This is a manual backup workflow rather than automatic encrypted cross-device sync.
6. **Reader polish:** Expandable full abstracts, saved exact arXiv versions, author-follow preferences and existing private research notes.

**Deferred pending architecture, permissions and testing:**

- **Anonymous aggregated popularity:** Global save/follow counts need a service and abuse protection. Local likes are not presented as real community votes.
- **Automatic email digests:** Would require an opt-in mailing backend, secure email storage and unsubscribe handling. Atom feeds provide a no-account alternative.
- **Automatic cross-device sync and encrypted sharing:** Not present. Portable private backups avoid an unreviewed cloud storage model.
- **Full arXiv historical indexing:** Requires larger ingestion infrastructure, archival reconciliation and robust source deduplication.
- **Version-anchored highlights and PDF annotations:** Extend existing note storage with structured source/version anchors and tests before relying on them.

## Roadmap

Broader full-text retrieval; verified citation networks; evidence-linked claim comparisons; optional authenticated open-weight AI inference; better research reading tools; expert commentary and corrections; moderated manuscript submission with persistent identifiers and preservation arrangements.

## License

MIT for original application source code. The original publications and third-party content retain their own rights and license conditions.
