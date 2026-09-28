# 06 — Key and tempo change on export

**What to build:** you enter the Original Key (with mode) and Original Tempo by hand; automatic estimation comes in ticket 08. You then pick a Target Key and Target Tempo. The Target Key picker only offers keys in the Original Key's mode and shows each one's relative key. Pitch Shift defaults to the smaller move, with a tritone going down (−6), and an octave toggle moves it ±12. The UI shows the Pitch Shift in semitones and the stretch as a percentage, and a reset button sets the targets back to the Original. The export is rendered by Rubber Band WASM in offline high-quality mode inside a Web Worker, so the UI stays responsive, and key and tempo change independently. The filename becomes `{title} - {start}-{end} - {Target Key} {Target Tempo}bpm.wav`. See CONTEXT.md for Pitch Shift and Target Key/Tempo.

**Blocked by:** 02 — Region selection and Region export

**Status:** ready-for-agent

- [ ] Original Key (with mode) and Original Tempo inputs
- [ ] Target Key picker limited to the Original Key's mode, each option showing its relative key
- [ ] Pitch Shift shown in semitones: the smaller move by default, a tritone gives −6, an octave toggle moves it ±12
- [ ] Target Tempo input, with the stretch shown as a percentage
- [ ] Reset sets the Target back to the Original
- [ ] The export is rendered offline in Rubber Band's high-quality mode in a Web Worker; the UI stays responsive, and progress is shown
- [ ] The filename includes the Target Key and Target Tempo
- [ ] Sample Plan tests: A→D = +5; a tritone = −6; the octave toggle; stretch ratio; same-mode key list and relative-key hints
- [ ] Sample Render tests (Node, real Rubber Band WASM): a sine shifted +3 semitones comes out at the expected frequency; output length = Region length × stretch ratio; no shift and no stretch gives close to the source
