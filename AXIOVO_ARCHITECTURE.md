# Axiovo architecture and upgrade notes (November 2026)

## Production structure

Axiovo is a static GitHub Pages research website. `docs/` is the published
application root. No server-side data store is part of the default deployment.

| Responsibility | Files |
|---|---|
| Shared navigation, themes, mobile | `docs/navigation.js`, `docs/axiovo-shell.css`, `docs/theme.js` |
| arXiv, bioRxiv, ChemRxiv research paths | `docs/{arxiv,biorxiv,chemrxiv}.html`, `docs/topic-explorer.js`, `docs/topic-atlas.js` |
| Search, original links and browser Library | `docs/archive-data.js`, `docs/research-desk.js`, `docs/workspace.js` |
| Assistant | `docs/copilot.html`, `docs/copilot.js`, `docs/assistant-core.js` |
| Official source harvesting | `scripts/sync.py`, `scripts/oai_harvest.py`, `scripts/sync_biorxiv.py`, `scripts/sync_chemrxiv.py`, `scripts/arxiv_announcements.py` |
| Verifiable date coverage | `scripts/arxiv_daily_archive.py` and `docs/data/arxiv-days/` |
| Normalized metadata | `scripts/build_normalized_index.py`, `docs/data/index/v1/` |
| Curated taxonomy | `scripts/build_taxonomy_json.py`, `docs/data/taxonomy/v1.json` |
| Local topic corrections | `docs/topic-report.js` |
| Optional AI proxy | `worker/ai-gateway.js`; off until explicitly configured |
| How-to video | `scripts/build_tutorial_video.py`, generated `docs/assets/axiovo-tour.mp4` |
| Deployment and testing | `.github/workflows/pages.yml`, `scripts/smoke_routes.py`, `tests/` |

## Immutable source record schema (v1)

Monthly shards are stored at
`docs/data/index/v1/{arxiv,biorxiv,chemrxiv}/YYYY-MM.json`;
unknown dates are retained in `undated.json` instead of assigned a false
calendar date. Each source record contains:

```json
{
  "id": "arxiv:2611.00001",
  "source": "arXiv",
  "title": "Exact original title from official source",
  "abstract": "Exact original source abstract if provided",
  "authors": ["Author from source"],
  "categories": ["official category"],
  "submitted_date": null,
  "announced_date": null,
  "version": null,
  "doi": null,
  "pdf_url": "https://arxiv.org/pdf/2611.00001",
  "landing_url": "https://arxiv.org/abs/2611.00001",
  "journal_ref": null,
  "license": null,
  "last_source_sync": null,
  "source_dataset": "feed.json",
  "tagging": {
    "method": "official-category-only",
    "confidence": null,
    "subtopics": [],
    "review_required": true
  }
}
```

**Example only, not a claimed paper.** Real output derives only from validated
source records. The three optional dates are distinct: initial submission,
announcement, and last successful metadata sync. Unsupported bibliographic
fields are null, not guessed. A paper with no validated subtopic is explicitly
in the review queue. The manifest is derived from the same files; all reported
counts are of **cached and verified records**, not entire official archives.

`docs/data/index/v1/manifest.json` lists source counts, monthly shards,
source timestamps, rejected inputs, known gaps, and first-submission-day counts.
`docs/data/index/v1/needs_review.json` holds unscored classification IDs.
`docs/data/taxonomy/v1.json` is a versioned hierarchy with
`id, label, parent, description, keywords, example_papers`.
Empty descriptions or examples indicate work not yet curated. They must not be
silently filled by AI.

## Updating the metadata

Run the existing official-source harvesters to update the input snapshots.
Then run:

```bash
python -m unittest discover -s tests -p 'test_normalized_index.py' -v
python -m scripts.build_normalized_index
python -m unittest discover -s tests -p 'test_taxonomy_json.py' -v
python -m scripts.build_taxonomy_json
node tests/search-accuracy.test.js
node tests/topic-report.test.js
node tests/assistant-grounding-50.test.js
```

GitHub Actions executes these gates before publishing. Scheduled Actions
and network providers are best-effort; a failed upstream call should preserve
the last verified dataset. **The project is not a complete historical mirror**:
source APIs may paginate, rate limit, delay publication, or omit metadata.

Never change or clear existing localStorage keys used for the saved Library.
The new wrong-topic queue uses an independent key, is never uploaded
automatically, and has a user-initiated link to open a public GitHub issue.

## Re-recording the tutorial

For the currently generated walkthrough, install Python Playwright, Chromium,
Pillow, FFmpeg, and the configured Indian-English TTS dependency. Run:

```bash
python -m playwright install chromium
python scripts/build_tutorial_video.py
python scripts/audit_internal_links.py --built
```

The generator loads the **real local Axiovo pages**, records page-state scenes,
adds step highlights, builds subtitles, and emits
`docs/assets/axiovo-tour-build.json` with scene/voice metadata. The script
uses Indian English neural narration when available and records any fallback.
A complete 1920x1080 continuous interaction recording with proven human-audited
pronunciation remains a separate Phase 7 acceptance item. Do not claim that
the tour covers unimplemented features.

## Hosted AI security

The Research Assistant's evidence-only, local Ollama and on-device WebGPU
modes do not require API keys. A separately deployed Cloudflare Worker is
provided in `worker/`, but remains **disabled by default**. Its secrets,
Turnstile and rate-limiting binding must be configured by an administrator.
Public GitHub Pages JavaScript must never contain a provider token or request
users to type provider API keys. See `worker/README.md`.

Do not activate any paid provider without specific owner approval. Running a
static site does not grant access to free OpenAI API inference.

## Limitations and outstanding phases

The current implementation does **not** establish full historic coverage,
automated ML-calibrated subtopic correctness, 95+ Lighthouse scores, passage-
verified AI summarization, secure online collaborative editing, or a public
rate-limited search API. Those require separate verified work and in some
cases a deployed backend. Optional prebuilt semantic indexing, publication
status verification, citation graph, browser extension, and completed how-to
video remain explicit project milestones.
