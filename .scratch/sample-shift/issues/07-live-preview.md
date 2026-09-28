# 07 — Live preview

**What to build:** playing the Region with the preview on applies the Target Key/Tempo in real time, using Rubber Band's real-time mode in an AudioWorklet. Changing the Target Key, octave toggle or Target Tempo during playback is heard straight away. The preview loops the Region, and an A/B toggle switches between the preview and the untransformed audio. It uses the same Sample Plan values as the export (ADR-0001).

**Blocked by:** 06 — Key and tempo change on export

**Status:** ready-for-agent

- [ ] Preview playback applies the Pitch Shift and stretch from the Sample Plan
- [ ] Changing a target during playback is heard without restarting
- [ ] The preview loops the Region
- [ ] An A/B toggle switches between the preview and the untransformed audio
- [ ] Checked by hand in the browser (no automated tests for this ticket, as agreed in the spec)
