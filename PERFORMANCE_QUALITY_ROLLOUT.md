# Performance changes with zero research-quality regression

Branch: `feature/performance-quality-preserving` · Draft PR #67.

## What is enabled in this branch

**My Feed large-corpus ranking off the UI thread.** The worker imports exactly
`feed-core.js` and `author-follow.js` and runs their existing logic. It does
not substitute a new model, change weights, invent authors, impose hidden
record limits, modify paper links, or omit any followed topic. The Worker starts
when more than 1,500 paper records are present. Otherwise the previous
synchronous renderer is used.

**Safe fallback.** Browsers without Workers, blocked worker scripts, worker
exceptions, and timeouts use the same original ranking code. All paper content
and follow preferences remain in the browser; nothing is sent to a service.

**Avoid redundant work.** Paper title and abstract tokenization are cached by
object identity with explicit string comparisons so edits/revisions invalidate
the cache. Ranking results are memoized by the complete preferences and source
paper generation. Sorting, paging, selecting an archive/date range, and toggling
feed views reuse the validated full ranking rather than re-running all topic
matches. The visible cards still obey the existing 12-card progressive
rendering rule, without removing other matches.

## Tests / acceptance

- `node tests/feed-worker-parity.test.js`: 2,100 source-shaped records,
  byte-equivalent worker and previous ranking output, scores, reasons, author
  homonym exclusions, exact revisions, stale-generation handling, and token
  invalidation.
- `python scripts/smoke_feed_worker.py`: real Chromium at 390px, 1,800
  source-shaped records, normal Worker versus unavailable Worker, identical
  paper titles and counts, save control, archive filtering and no overflow.
- The existing Python, JavaScript, mobile Feed, search, and cross-page browser
  tests must remain green.
- Existing `localStorage` keys are neither renamed nor migrated. User notes,
  followed authors and topics, saved papers and the Research Desk are not
  modified.
- The old archive data fetching and source validation remain authoritative.

## What this does not yet solve

The full archive snapshots are still transferred and normalized in the
browser. These improvements target responsiveness and repeat ranking, not
a fabricated reduction in network bytes. The broader indexed-shard and local
cache changes from roadmap Phases 1–7 require independent retrieval
equivalence and coverage benchmarking before promotion.

For manual validation, test a mid-range Android device and desktop at
320/360/390/430px: first contentful result, scroll responsiveness during
source updates, save/undo, name ambiguity, the three archives, sorting and
filters. Record memory and INP/LCP with Chrome DevTools. No numerical speed
gain should be announced without before/after measurements on the same
device and network.

## Rollout and rollback

Ship only after both CI jobs succeed and manual mobile validation. To roll
back, revert this PR and redeploy the preceding verified Pages artifact.
The previous algorithm is still in `feed-core.js`; no user data change or
cleanup is necessary.
