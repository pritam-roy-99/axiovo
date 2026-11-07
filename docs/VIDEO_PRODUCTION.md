# Axiovo official product walkthrough: recording and narration master

The homepage uses the 32-scene recording and English captions checked into `docs/assets/`. Its narration uses the Neerja Indian-English voice. GitHub Pages verifies and publishes the rendered recording as part of the site.

## Delivery specification

- **Format:** 1920×1080, 16:9, 30 fps, H.264 + AAC, captions in English. A mobile-specific recording may accompany the desktop walkthrough.
- **Duration:** ~2:30–3:00, paced for beginners. Short pauses after key interface actions.
- **Visual source:** Record the actual current deployed Axiovo site in a clean Chromium browser, not stock mockups. Use 125–150% browser zoom *if the UI needs it*. Screen recording must match functioning controls at recording time.
- **Narrator:** Natural, warm, confident, expressive female voice, fluent in **Indian English** with clear professional enunciation. Conversational and inviting, not exaggerated, breathy, flirtatious, or robotic.
- **Pronunciation:** Axiovo = “AK-see-oh-voh” (confirm brand pronunciation before final mix); arXiv = “archive”; bioRxiv = “bio archive”; ChemRxiv = “chem archive”; DOI = “dee-oh-eye”; PDF = “pee-dee-eff.”
- **Sound:** clean speech, no distracting background music; gentle compression, breaths retained, peaks controlled, target integrated loudness approximately −16 LUFS for the stereo mix. Avoid clipped plosives and noisy denoising.
- **Text legibility:** 1080p, cursor focus highlighted, zoom into subject menus, ≥24 px for editorial overlays. In UI, magnify selected regions rather than expecting viewers to read an entire crowded desktop.
- **Accuracy:** All search papers shown must actually come from Axiovo's source records. Verify every on-screen click; don't show outcomes the site cannot reproduce.
- **Accessibility:** narrated captions, editable narration script, sound-off comprehension, keyboard interactions where useful.

## Full narration and recording rundown

| Approx. time | Capture | Narration |
|---|---|---|
| 00:00–00:13 | Homepage with unified hero and tutorial. Slow zoom to Axiovo logo. | “Welcome to Axiovo, a research workspace designed to help you discover new papers, check their original sources, and keep your reading organized.” |
| 00:13–00:26 | Point to arXiv, bioRxiv and ChemRxiv cards. | “Start with one of three preprint archives: arXiv for physics, mathematics and computing; bioRxiv for life sciences; and ChemRxiv for chemistry.” |
| 00:26–00:47 | Visit arXiv Discover. Focus subject, subfield, subtopic inputs, type a few letters, choose suggestion. | “On the Discover page, choose a broad research subject. Then narrow down to a subfield and a specific topic. You can also type in the selection box to find a relevant subject more quickly.” |
| 00:47–01:08 | Open matching papers, inspect an authentic abstract, sort newest/oldest, open original record. | “Show matching papers and refine the results. Switch between relevance, newest, oldest, or citation-based ordering when available. Open the original paper to verify its title, authors, and source.” |
| 01:08–01:29 | Research Desk, type a real query, select archives, date filters, view results. | “Research Desk searches across the three archives from one place. Enter a keyword, paper title, author, or identifier. Choose your sources and dates, then review the records that Axiovo actually retrieved.” |
| 01:29–01:48 | Save a genuine paper, open My Library, filter and edit a note. | “When you find something useful, save it to your Library. You can return to saved papers, organize collections, add notes, and export references. Your local reading data stays in this browser.” |
| 01:48–02:07 | Follow author or subtopic on real interface; open My Feed, inspect recommendation reason and original source. | “Follow authors and research topics that matter to you. My Feed brings related papers together and helps you see why each recommendation was suggested.” |
| 02:07–02:27 | Research Assistant interface, source-linked question, and Research Tools screen. Avoid unverified generated claims. | “For deeper work, open Research Assistant to explore questions alongside source-linked evidence. Research Tools provides additional ways to read, compare, and work with the literature.” |
| 02:27–02:40 | Mobile layout, navigation, settings/night mode. | “Axiovo also works on smaller screens. Use the navigation to move between the research pages, and switch your appearance in Settings.” |
| 02:40–02:52 | Homepage with three archive links and Research Desk CTA. | “Ready to begin? Choose an archive, start a search, and follow the evidence. Welcome to Axiovo.” |

### Recording QA checklist
1. Confirm each destination loads successfully on desktop and mobile before recording.
2. Use current official archive categories; don't fabricate a paper list.
3. Every search, dropdown, Save, Follow and navigation click shown in the final cut must produce the on-screen result.
4. Keep mouse movements deliberate and scrolling modest; show controls at readable scale.
5. Narration must be reviewed by listening to arXiv, ChemRxiv, Axiovo and DOI pronunciations before export.
6. Generate accurate WebVTT captions from the **final** narration alignment, not the draft timings above.
7. Test playback on Chrome, Edge, Firefox and mobile browsers.
8. Publish the approved `axiovo-tour.mp4` and `axiovo-tour.vtt` into `docs/assets/`. The homepage automatically switches from the interactive tour to the video when valid media metadata loads.

**Note:** An interactive six-step onboarding walkthrough is live in `docs/home-tour.js` while the narrated recording is unavailable. It is not represented as a screen recording.
