# 08 — Estimate of key and tempo

**What to build:** essentia.js runs in a Web Worker and produces an Estimate of key (with mode) and tempo, first for the whole Source Track when it loads, then for the Region once you finish selecting it. The Estimate fills in the Original Key/Tempo. Your manual corrections stick when the Region changes, until you explicitly ask for a new Estimate. The tempo input gets ×2 and ÷2 buttons for half-time and double-time mistakes, and the app warns when a Region is too short (under ~4 s) for a reliable Estimate.

**Blocked by:** 06 — Key and tempo change on export

**Status:** ready-for-agent

- [ ] Estimate of the Source Track runs when it loads, without freezing the UI
- [ ] Estimate of the Region runs after you finish selecting it
- [ ] The Estimate fills in the Original Key/Tempo unless you've corrected them
- [ ] Corrections stay when the Region changes; asking for a new Estimate replaces them
- [ ] ×2 and ÷2 buttons on the Original Tempo
- [ ] A warning shows when the Region is too short for a reliable Estimate
- [ ] Checked by hand against a few songs with known key and tempo (no automated accuracy tests)
