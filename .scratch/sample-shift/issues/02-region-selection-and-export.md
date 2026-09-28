# 02 — Region selection and Region export

**What to build:** you can drag on the waveform to create a Region, drag its edges to adjust it, or type exact start and end times. You can zoom the waveform, and play or loop just the Region, untransformed. Clearing the Region makes the Sample the whole Source Track again. Download exports only the Region, with ~5 ms fades at each edge, named `{title} - {start}-{end}.wav`. This ticket introduces the pure Sample Plan module, which handles Region and filename rules.

**Blocked by:** 01 — Walking skeleton

**Status:** ready-for-agent

- [ ] Drag to create a Region; drag its edges to adjust; type exact start and end times
- [ ] Zoom the waveform
- [ ] Play the Region and loop it
- [ ] Clearing the Region means the whole Source Track is exported
- [ ] The export contains only the Region, with ~5 ms fades in and out
- [ ] Filename is `{title} - {start}-{end}.wav`, with characters that aren't allowed in filenames removed from the title
- [ ] Sample Plan tests: filename formatting (times, removing bad characters), no Region means the whole Source Track
- [ ] Sample Render tests: output length equals Region length; the first and last ~5 ms ramp from and to silence
