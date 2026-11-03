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
