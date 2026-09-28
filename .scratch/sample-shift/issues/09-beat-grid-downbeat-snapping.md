# 09 — Beat Grid, Downbeat and snapping

**What to build:** a Beat Grid is drawn over the waveform from the Original Tempo and a Downbeat marker you can drag. Region edges snap to beats or bars (your choice), and holding a modifier key turns snapping off temporarily. The grid redraws when the Original Tempo or Downbeat changes. Grid and snapping logic live in the Sample Plan module.

**Blocked by:** 06 — Key and tempo change on export

**Status:** ready-for-agent

- [ ] The Beat Grid shows beat and bar lines from the Original Tempo and the Downbeat
- [ ] The Downbeat marker can be dragged, and the grid follows
- [ ] Region edges snap to beats or bars, depending on the setting
- [ ] Holding a modifier key turns snapping off while dragging
- [ ] The grid updates when the Original Tempo changes
- [ ] Sample Plan tests: grid positions from tempo and Downbeat (including a Downbeat after 0), snapping to the nearest beat or bar, snapping off leaves edges unchanged
