# Contributing to Axiovo

Thank you for helping improve Axiovo, a free, open-source research discovery and reading workspace.

## Ways to contribute

- Report reproducible bugs, especially paper-ID resolution, missing source links, mobile layout, accessibility and browser storage issues.
- Improve source metadata accuracy, research-topic navigation, documentation and automated tests.
- Suggest additional public scholarly sources with documentation of API access, usage limits, licensing, attribution and data provenance.
- Translate or clarify user guidance.

## Before proposing a change

1. Search [existing issues](https://github.com/pritam-roy-99/axiovo/issues) and review the [README](README.md).
2. Open a focused issue explaining the expected behavior, current behavior, reproduction steps and affected browser or device.
3. Avoid sharing private research notes, API credentials, access tokens or personal information in issues and test fixtures.
4. For code changes, keep original-source links and evidence caveats intact. Do not claim complete archive coverage or verified scientific correctness.
5. Run relevant tests identified in [AXIOVO_QA.md](AXIOVO_QA.md) and [UPGRADE_QA.md](UPGRADE_QA.md). Explain any tests you could not run.

## Pull request checklist

- [ ] Change is small enough to review and has a clear purpose.
- [ ] Desktop and narrow-screen layouts were checked where applicable.
- [ ] Existing localStorage data and saved user content are preserved.
- [ ] No secret keys or private user material are committed.
- [ ] Public scholarly metadata is source-linked, with meaningful error states.
- [ ] Relevant automated tests and manual verification steps are documented.

The maintainer may request revisions or decline changes that compromise source accuracy, privacy, accessibility, security or maintainability.

Axiovo is an independent project and is not affiliated with the archives whose records it links.
