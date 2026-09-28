# 02 — Region selection and Region export

**What to build:** you can drag on the waveform to create a Region, drag its edges to adjust it, or type exact start and end times. You can zoom the waveform, and play or loop just the Region, untransformed. Clearing the Region makes the Sample the whole Source Track again. Download exports only the Region, with ~5 ms fades at each edge, named `{title} - {start}-{end}.wav`. This ticket introduces the pure Sample Plan module, which handles Region and filename rules.

**Blocked by:** 01 — Walking skeleton

**Status:** done

- [x] Drag to create a Region; drag its edges to adjust; type exact start and end times
- [x] Zoom the waveform
- [x] Play the Region and loop it
- [x] Clearing the Region means the whole Source Track is exported
- [x] The export contains only the Region, with ~5 ms fades in and out
- [x] Filename is `{title} - {start}-{end}.wav`, with characters that aren't allowed in filenames removed from the title
- [x] Sample Plan tests: filename formatting (times, removing bad characters), no Region means the whole Source Track
- [x] Sample Render tests: output length equals Region length; the first and last ~5 ms ramp from and to silence

## Comments

- Filename times are written `1m12s-1m20.5s`, because Windows forbids `:` in filenames. With no Region the filename stays `{title}.wav`. **Open for ticket 06:** decide what a whole-track export with a Target Key/Tempo is called (e.g. `{title} - Am 90bpm.wav`).
- Typed times work before a Region exists (typing an edge creates a Region from the other end of the Source Track). A time that would put the edges out of order is refused and the field reverts (`moveRegionEdge` in Sample Plan).
- Control characters in titles become spaces rather than being removed, so words don't run together. Other characters that aren't allowed are removed.
- Extras beyond the ticket: clicking the waveform moves the playhead, a Zoom to Region button, and a scroll slider when zoomed.
- Checked in the browser: drag creates a Region, dragging an edge adjusts it, typed times work, the Region export is correct (`Me at the zoo - 0m05s-0m10.575s.wav`, 5.57 s, starts at silence), Loop repeats, and zoom and scroll work.
