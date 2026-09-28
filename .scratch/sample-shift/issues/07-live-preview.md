# 07 — Live preview

**What to build:** playing the Region with the preview on applies the Target Key/Tempo in real time, using Rubber Band's real-time mode in an AudioWorklet. Changing the Target Key, octave toggle or Target Tempo during playback is heard straight away. The preview loops the Region, and an A/B toggle switches between the preview and the untransformed audio. It uses the same Sample Plan values as the export (ADR-0001).

**Blocked by:** 06 — Key and tempo change on export

**Status:** done

- [x] Preview playback applies the Pitch Shift and stretch from the Sample Plan
- [x] Changing a target during playback is heard without restarting
- [x] The preview loops the Region
- [x] An A/B toggle switches between the preview and the untransformed audio
- [x] Checked by hand in the browser (no automated tests for this ticket, as agreed in the spec)

## Comments

- All playback goes through one AudioWorklet (`sample-preview`), which wraps `PreviewEngine`: Rubber Band's real-time mode (R2 "faster" engine, high-consistency pitch, channels together). The untransformed side of A/B ("Source Track") is a bypass inside the same engine, so switching keeps your place. esbuild bundles the worklet into `public/` via `scripts/prepare-public.mjs` (postinstall/predev/prebuild; gitignored). **If you edit the worklet code while `npm run dev` is running, re-run `node scripts/prepare-public.mjs`.**
- Loop is now on by default, because the preview loops the Region.
- Checked by hand in the browser (real clicks, an analyser tapped on the worklet):
  - Playhead rate follows the Target Tempo live: 0.896× at 90/100 BPM, 0.501× after changing to 50 mid-play, 0.994× on the Source Track side.
  - The pitch of a 440 Hz test tone follows the Pitch Shift: +3 gives 523.2 Hz; all cases were within about ±25 cents (a quarter semitone) with the errors scattered both ways.
  - The loop wraps within the Region; playback without Loop ends by itself; Pause is silent.
- After review: each play and stop gets an id, so late "ended" or position messages can't reset the UI or make the playhead jump; switching Target → Source Track continues from what you hear rather than from how far Rubber Band has read ahead; a zero-length Region can't hang the audio thread; the AudioContext is closed if the audio engine fails to start; the A/B side is named "Source Track" (the glossary).
- Known limits: loading a new Region (creating Rubber Band) and seeking happen on the audio thread and can cause one short glitch. With no Region the whole Source Track is copied to the audio thread once (about 100 MB for a 5-minute stereo track). The preview uses the faster R2 engine; the export keeps the higher-quality offline R3 engine.
