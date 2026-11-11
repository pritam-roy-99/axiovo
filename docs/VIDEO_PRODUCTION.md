# Axiovo tutorial: synchronized video and interactive guide

The refreshed homepage shows **Watch tutorial video** and **Interactive step-by-step guide** in one fixed, responsive stage immediately below the selector. Both modes occupy the same space on desktop and mobile. The guide has ten current research-workflow steps.

## New recorded tutorial
A GitHub Actions workflow (`.github/workflows/build-release-tour.yml`) builds the media from Axiovo's **actual current pages**, rather than using mockups. A successful rebuild publishes `docs/assets/axiovo-tour.mp4`, captions `axiovo-tour.vtt`, and the authoritative timestamped chapter manifest `axiovo-tour-build.json`. The tutorial page reads its chapters from the manifest, keeping the navigation synchronized when the recorded duration changes.

Recording specification:
- 1280 × 720 (HD), 16:9, 24 fps H.264, AAC 128 kb/s, high-quality CRF 24.
- Same Indian-English female neural narrator: `en-IN-NeerjaNeural`, with technical terms adjusted for pronunciation.
- Normalized speech around −16 LUFS, no distracting music, accurate WebVTT captions.
- 37 source-page scenes covering four archives, subject and topic selection, announcement and version awareness, Research Desk, Library, following, Research Assistant, ProofLab, page appearance and the help robot.
- Original linked scientific records and locally available features only. Explain coverage limitations rather than fabricating source completeness or unavailable AI features.

## Build and deployment
The video workflow runs when its source or workflow changes on `main`, or via manual workflow dispatch. It regenerates the video even when an older recording already exists, validates the MP4, metadata and captions, and commits them only after a successful build. It explicitly requests the GitHub Pages deployment workflow because commits made using `GITHUB_TOKEN` do not trigger downstream push workflows.

If recording or narration fails, the old verified MP4 stays in the repository; the new recording must not be claimed as published. The homepage's interactive guide remains available independently of media playback.

## QA
1. Verify a shared stage under the buttons at mobile widths 320–844 and desktop 1360. The video and interactive content must never jump above or below the selector.
2. Verify that switching to the guide pauses the video, hides its companion card, displays ten working interactive steps, and switching back restores the player in the same stage.
3. Verify browser Back, refresh, PWA offline shell and local saved papers are unaffected.
4. Verify each scene represents current Axiovo controls. Test the narrated pronunciation, captions, and source-linked claims.
5. Confirm the video-build workflow and the following GitHub Pages deployment both report success before claiming the updated recording is live.
