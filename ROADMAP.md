# ResearchLens integrated product roadmap
Last reviewed: 2026-11-03

## Product principle
ResearchLens should connect **discover → evaluate → organize → follow up** for researchers in any discipline. New capabilities should make existing workflows easier, not add redundant standalone pages.

## Stage 1: Personal relevance and research questions (implemented in this branch)
- Transparent, explainable scoring of papers from the existing local arXiv metadata snapshot. Signals: chosen topics, followed topics, manually entered interests, exact followed authors, paper title/abstract overlap, research-question terms and recency. Saved papers are demoted.
- Browser-local project tracker with research questions, keywords, progress statuses, attached arXiv IDs, import/export backups.
- One-click save to the existing feed reading list; jump from a recommendation to the current Copilot by arXiv ID.
- UI says exactly what data are searched and warns that lexical similarity cannot establish novelty or proof correctness.
- Regression tests for ranking, identifier normalization, exclusions and project schema.

Success criteria: a researcher can create a question, select relevant interests, see reasons for suggested papers, attach an indexed paper to a question, and restore questions from export. No external service credentials are needed.

## Stage 2: Reliable literature coverage and search
- Persistent historical arXiv metadata via OAI-PMH, incremental harvesting with resumption tokens, idempotent version handling and source timestamps.
- Semantic and lexical hybrid retrieval with explicit source/coverage controls. Benchmark against a curated field-specific evaluation set before claiming improved recall.
- OpenAlex/Crossref reconciliation using DOI/arXiv ID and careful duplicate handling.
- Author/field subscriptions, notification options and explicit freshness indicators.
- Preserve a clearly separated source-of-truth record and enriched metadata; display preprint v1 and publication dates separately.

Dependencies: robust ingestion storage, query indexes and source API terms/rate limits. Static GitHub Pages alone cannot host a complete searchable archive.

## Stage 3: PDF reading and comparison
- PDF.js-based in-page reader with accessible page navigation, highlights, notes and reliable cross-page anchors.
- Structured comparison of mathematical assumptions, data, methods, claims and limitations with explicit page citations.
- AI should use retrieved passages and abstain from unsupported claims; benchmark citation faithfulness and include full-text licensing checks.
- Zotero-compatible BibTeX/RIS import/export and project collections.

Dependencies: indexed full text, user-granted document access, PDF licenses and compute for retrieval/inference.

## Stage 4: Researcher identity, sync and community
- Optional accounts, ORCID linkage, synchronized reading/project notes, permission controls, data export/deletion and private-by-default data.
- Versioned paper discussions, author responses, abuse reporting, moderation and provenance for claims.
- Shared project folders and collaboration with clear role controls.

Dependencies: authenticated backend and moderation; never expose private manuscripts or API keys from static pages.

## Stage 5: Advanced research assistance
- Citation network visualizations, claim maps and structured follow-up experiments.
- Domain-sensitive literature reviews with confidence limits, evaluation of factual accuracy, scientific counterexamples and field-specific benchmarks.
- Scheduled, user-consented alerts for new papers matching active research questions.

## Cross-cutting quality requirements
- Accessible controls, keyboard navigation, good mobile performance and light/dark contrast.
- End-to-end browser tests, unit tests, graceful external API failures and no false source/coverage claims.
- Visible retrieval timestamp, paper version and third-party metadata provenance.
- Treat citations, social votes and AI assessments as different signals. Never imply that votes or keyword similarity prove scientific correctness.

## Current limitations
The Stage 1 ranking is **lexical, local and heuristic**: it only searches papers currently in `docs/data/feed.json`. It is neither a true embedding-based recommender nor a semantic literature review service. The research questions and personal keywords are in browser localStorage; they do not sync or trigger notifications. Project IDs and linked article IDs can be exported/imported, but there is no collaboration or external researcher verification yet.
