# 08 — Estimate of key and tempo

**What to build:** essentia.js runs in a Web Worker and produces an Estimate of key (with mode) and tempo, first for the whole Source Track when it loads, then for the Region once you finish selecting it. The Estimate fills in the Original Key/Tempo. Your manual corrections stick when the Region changes, until you explicitly ask for a new Estimate. The tempo input gets ×2 and ÷2 buttons for half-time and double-time mistakes, and the app warns when a Region is too short (under ~4 s) for a reliable Estimate.

**Blocked by:** 06 — Key and tempo change on export

**Status:** done (one check left for you, see Comments)

- [x] Estimate of the Source Track runs when it loads, without freezing the UI
- [x] Estimate of the Region runs after you finish selecting it
- [x] The Estimate fills in the Original Key/Tempo unless you've corrected them
- [x] Corrections stay when the Region changes; asking for a new Estimate replaces them
- [x] ×2 and ÷2 buttons on the Original Tempo
- [x] A warning shows when the Region is too short for a reliable Estimate
- [ ] Checked by hand against a few songs with known key and tempo (no automated accuracy tests)

## Comments

- essentia.js 0.1.3 (**AGPL-3.0**, noted in ADR-0001): KeyExtractor for the key, PercivalBpmEstimator for the tempo, in a classic Web Worker that esbuild bundles into `public/estimate-worker.js` (`scripts/prepare-public.mjs`; gitignored). The page first mixes the audio to mono 44.1 kHz with an `OfflineAudioContext`.
- **Only the middle 120 s is analysed** for a whole Source Track (or a Region longer than that), to keep the Estimate quick on long tracks.
- Estimated tempos within 0.15 BPM of a whole number snap to it (99.86 → 100).
- The pure rules have unit tests: reading Essentia's key names, tempo snapping, `applyEstimate`, and the shared `withOriginalKey` / `withOriginalTempo` rule. A target you haven't touched follows the Original, one you've chosen stays, and a change of mode resets the Target Key and octave offset. These are the same rules for your own edits and for an Estimate.
- A new Estimate cancels the one in flight. A worker that won't load or crashes is replaced, with a clear message. Requests time out after 2 minutes. "New Estimate" drops your corrections only once it succeeds.
- Checked in the browser: synthetic grooves came back as A minor @ 99.86, Eb major @ 128.00, F# minor @ 86.86. On load the Estimate fills the Original and Target. A hand-corrected tempo survived a Region Estimate. A 3 s Region showed the warning. New Estimate and ×2 worked. A Region chosen during the whole-track Estimate finished in 1.4 s. Recovery from a missing worker file worked.
- **Still to do (you):** try a few songs whose key and tempo you know. I didn't fetch copyrighted songs from YouTube myself. Only this box is left unticked.
