# ResearchLens

**ResearchLens is a free, open-source research-discovery prototype with preliminary prior-literature exploration.** It is independent from arXiv and SciRate.

## Current features

- Responsive scientific-paper website with title, abstract, author, and arXiv identifier search.
- arXiv category filters and 15 cross-cutting quantum subcategories (Bell tests, QKD, contextuality, steering, sensing, networks, optics, hardware, and more).
- Multi-label topic detection from title/abstract keywords, explicitly marked exploratory.
- Follow research topics and build a personalized feed; preferences are kept in your browser.
- Page through the indexed feed and find related papers in a subject-focused shortlist.
- Browser-local reading-list bookmarks with BibTeX export.
- Candidate related papers based on lexical overlap of indexed titles and abstracts.
- Scheduled synchronization of arXiv Atom API metadata, with version-aware deduplication, up to 3,000 retained records and incremental updates.
- Direct links to title-based Semantic Scholar search from each paper.
- Optional OpenAlex citation metadata enrichment for exact normalized title and plausible year matches (requires an API key).
- GitHub Actions tests and GitHub Pages deployment; no paid server required.

### Important limitations

**No public AI novelty verdicts are generated.** The similarity feature only surfaces possible literature connections from a limited local index. It cannot establish mathematical equivalence, novelty, technical correctness, or misconduct. The repository is not a manuscript-submission service yet. The public GitHub Pages website does not run Python or Ollama.

An optional localhost-only Qwen/Ollama HTTP service is included in `api/server.py`, but the public static website does not call it. The original ZIP contains a more extensive FastAPI/SQLite development implementation that has not been fully imported.

## Publish on GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Under Build and deployment, set **Source: GitHub Actions**.
3. Open **Actions → Refresh arXiv and deploy ResearchLens → Run workflow** to fetch real papers and deploy.
4. Once deployment succeeds, visit https://pritam-roy-99.github.io/researchlens/.

The scheduled refresh runs at 00:37, 06:37, 12:37, and 18:37 UTC, on a best-effort basis. Upstream arXiv releases and GitHub scheduling can delay updates. If the API is unavailable, the previous snapshot is retained.

## Develop locally

Requires Python 3.11 or newer.

Run `python -m unittest discover -s tests -v` to test. Run `python scripts/sync.py` to refresh (internet required). The default ingest searches `quant-ph, cs.IT, hep-th, physics.optics, cond-mat.mes-hall` with rate-limited requests.

Optional OpenAlex metadata: register for an API key according to OpenAlex's current developer terms and add it as a GitHub Actions repository secret named `OPENALEX_API_KEY`. The workflow will then gradually enrich matching paper records, without making unsupported novelty claims. You can also run `python -m scripts.enrich` locally with that environment variable set.

The automatic provider refresh is independent of model inference. GitHub Pages cannot run Ollama; AI requires a separate protected backend or running the local API.

For optional local open-weight AI, install [Ollama](https://ollama.com), run `ollama pull qwen3.5:4b`, then launch `python -m api.server`. The local API provides `POST http://127.0.0.1:8765/analyze` with JSON `{"paper_id":"<arxiv ID>"}`. It requires a populated `docs/data/feed.json` and returns claimed contributions, comparison questions, and candidate prior-paper references. All are **unverified preliminary guidance, not scientific verdicts**.

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
