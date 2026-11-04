# Optional Litveyra social backend setup

This is an optional upgrade beyond the currently working GitHub Issues comments and reactions. GitHub Pages cannot securely host user identities or write access to a shared database by itself.

## Hosted authentication and user content

1. Create a Supabase project (free tier may be sufficient for a beta, subject to provider limits).
2. Open SQL Editor and execute the schema in supabase/schema.sql. For optional private research backups also run supabase/user_data.sql.
3. Enable GitHub OAuth in Supabase Authentication > Providers; configure the GitHub OAuth application callback URL exactly as Supabase specifies.
4. In Supabase Authentication > URL Configuration, allow your GitHub Pages URLs, including https://pritam-roy-99.github.io/researchlens/paper.html and https://pritam-roy-99.github.io/researchlens/profiles.html and https://pritam-roy-99.github.io/researchlens/lab.html.
5. Copy your project's HTTPS URL and public/publishable anon key into docs/social-config.js. Never put a service_role secret, Supabase secret key or GitHub OAuth client secret into this public repository.
6. Deploy. The native comment and endorse panel on individual paper pages will appear automatically, and the researcher workspace will enable public profiles, GitHub sign-in, and follows.

Before allowing unrestricted public use, add content moderation, abuse/rate protection and a way for moderators to remove harmful comments. Row-level security prevents one user from modifying another user's content, but does not prevent spam or abuse.

## Data model

- research_profiles: opt-in public researcher cards or private cards
- paper_votes: one reversible endorsement per authenticated user per paper
- paper_comments: public read, authenticated write; owners may edit/delete
- profile_follows: follower relationships and unfollow controls
- research_user_data: opt-in owner-only workspace backups, after running supabase/user_data.sql

RLS is enabled for all tables. Do not disable it.

## What works without this setup?

- Public homepage, local feed, arXiv search links and date filters
- Local reading list and recommendations
- Personal profile stored only in browser storage
- GitHub Issues-based public comments and reactions, using GitHub accounts
- Day and night theme
- AI Lab deterministic literature report and optional WebGPU model

## Private sync caveats

Backups are explicit, not continuous. Row-level security only grants the signed-in owner access to their private payload. Restores overwrite corresponding browser-local keys after confirmation. See [RESEARCH_TOOLS_SETUP.md](RESEARCH_TOOLS_SETUP.md).

## Still planned

Verified identities; ORCID OAuth; publication claiming; native notifications; direct messaging; moderation tools; comprehensive full arXiv metadata indexing.

The hosted account service is scaffolded but not configured in the deployed site until the repository owner supplies their Supabase project details.
