# ResearchLens Research Tools: Setup and Scientific Limitations

This release exposes a single **Research Tools** page, `docs/lab.html`, with four staged capabilities on GitHub Pages.

## Stage 2: archive metadata + live literature search

`scripts/oai_harvest.py` uses the official arXiv OAI-PMH base URL
`https://oaipmh.arxiv.org/oai`, the `arXiv` metadata format, `ListRecords`, and
`resumptionToken`. It harvests records modified in a recent bounded window,
normalizes IDs, retains source datestamps and deduplicates them.

The standalone scheduled workflow `.github/workflows/oai.yml` runs daily. It
keeps a **rolling 4,000-record maximum** in `docs/data/oai-recent.json`, which
Research Tools searches alongside the original arXiv Atom snapshot.
The OAI datestamp is a metadata modification time, NOT initial submission time.
The importer intentionally does not claim the entire historical arXiv archive.
For wider historical search, the page queries OpenAlex directly, with live
service limits. An official complete initial arXiv harvest requires durable
database storage, resumable multi-run bootstrap and search infrastructure.

To test the OAI parser locally:
```sh
python -m unittest discover -s tests -v
OAI_LOOKBACK_DAYS=2 OAI_MAX_PAGES=20 python -m scripts.oai_harvest
```
This request does not download PDFs. It updates only public metadata.

## Stage 3: PDF reading and comparison

- Upload **your own PDF file** (maximum 40 MB) to render it locally via PDF.js.
  The PDF bytes are kept in browser memory, not uploaded to ResearchLens.
- Page-specific notes are saved in browser localStorage, keyed by a SHA-256
  digest of the local PDF. Export notes as JSON before clearing browser data.
- arXiv IDs open the original arXiv PDF in another tab; cross-origin PDF
  rendering from arXiv is intentionally not assumed.
- Compare two arXiv identifiers present in the local metadata; the interface
  displays original bibliographic/abstract data side by side. Researchers may
  write checked assumptions, theorem statements, limitations and page
  citations manually and export those notes as Markdown.
- This is **not** PDF-grounded LLM question answering, automated theorem
  verification, or a validated novelty-checking system. These capabilities
  still require retrieval, evaluation and model-inference infrastructure.

PDF.js module and worker are pinned to version 4.10.38 from cdnjs. A network
connection is required to load the module initially. Do not use the feature
on sensitive unpublished manuscripts unless you trust your browser/device
and any loaded third-party assets.

## Stage 4: optional researcher accounts, collaboration and cloud sync

Existing GitHub-Issues-based comments remain operational without setup.
Optional native profiles, paper votes, comments and follows already use
`supabase/schema.sql`; their security depends on enabling authentication,
row-level security and public-content moderation.

To add private sync:
1. Create and configure a Supabase project using `SOCIAL_SETUP.md`.
2. Run `supabase/schema.sql` and then `supabase/user_data.sql` in SQL Editor.
3. Enable GitHub OAuth with a callback/redirect allow-list covering
   `https://pritam-roy-99.github.io/researchlens/lab.html`.
4. Put only the **public** project URL and publishable/anon key in
   `docs/social-config.js`. Never include a service-role or OAuth secret.
5. Sign in on Research Tools, then explicitly choose **Back up** or **Restore**.

Backups are opt-in. Only one user's `research_workspace` JSON document can be
read or written by that account under Supabase row-level security. The current
client caps backup size at 900 KB; users should still export local backups.
Restoring overwrites keys contained in the cloud backup after confirmation.
No automatic background synchronization, offline conflict resolution or
moderation service is promised. Cloud storage remains disabled until configured.

## Stage 5: citation maps and research alerts

- Enter an OpenAlex work ID or DOI and view a limited neighborhood of
  bibliographic references and incoming citing papers via OpenAlex work APIs.
- Graph labels are tied to live source records. If a link is missing it means
  it was not returned by the service, **not** that the paper has no citations.
- Visit-time research updates compare local metadata with project keywords,
  field topics and explicitly entered interests. Users can mark records as
  seen, but there are **no push, email or continuously running alerts**.

## Next engineering dependencies

1. A persistent complete arXiv metadata database and true hybrid lexical +
   embedding-based retrieval with an evaluation benchmark.
2. Full-text indexing with license checks, anchored citations, structured
   claim extraction and proof counterexample evaluation.
3. Backend account provisioning, moderation, rate limiting, audits,
   conflict-aware cloud sync and user data deletion/export workflows.
4. Server-run subscriptions and user-consented notifications.

The site does not claim these advanced features are deployed today.
