# 06 — Key and tempo change on export

**What to build:** you enter the Original Key (with mode) and Original Tempo by hand; automatic estimation comes in ticket 08. You then pick a Target Key and Target Tempo. The Target Key picker only offers keys in the Original Key's mode and shows each one's relative key. Pitch Shift defaults to the smaller move, with a tritone going down (−6), and an octave toggle moves it ±12. The UI shows the Pitch Shift in semitones and the stretch as a percentage, and a reset button sets the targets back to the Original. The export is rendered by Rubber Band WASM in offline high-quality mode inside a Web Worker, so the UI stays responsive, and key and tempo change independently. The filename becomes `{title} - {start}-{end} - {Target Key} {Target Tempo}bpm.wav`. See CONTEXT.md for Pitch Shift and Target Key/Tempo.

**Blocked by:** 02 — Region selection and Region export

**Status:** done

- [x] Original Key (with mode) and Original Tempo inputs
- [x] Target Key picker limited to the Original Key's mode, each option showing its relative key
- [x] Pitch Shift shown in semitones: the smaller move by default, a tritone gives −6, an octave toggle moves it ±12
- [x] Target Tempo input, with the stretch shown as a percentage
- [x] Reset sets the Target back to the Original
- [x] The export is rendered offline in Rubber Band's high-quality mode in a Web Worker; the UI stays responsive, and progress is shown
- [x] The filename includes the Target Key and Target Tempo
- [x] Sample Plan tests: A→D = +5; a tritone = −6; the octave toggle; stretch ratio; same-mode key list and relative-key hints
- [x] Sample Render tests (Node, real Rubber Band WASM): a sine shifted +3 semitones comes out at the expected frequency; output length = Region length × stretch ratio; no shift and no stretch gives close to the source

## Comments

- Rubber Band comes from the npm package `rubberband-wasm` (v3.3.0, GPLv2 C-API bindings): offline mode, the R3 "finer" engine, channels processed together. `scripts/copy-rubberband-wasm.mjs` copies the .wasm into `public/` (run on postinstall/predev/prebuild; the copy is gitignored).
- Only the Region's audio is sent to the render worker. With no Pitch Shift and no stretch, Rubber Band is skipped and the export is the untouched source.
- Speed: a 19 s track rendered in 5.3 s (about 3.6× faster than real time), so a 5-minute song takes about 1½ minutes, with a progress bar. If that's too slow, the R2 "faster" engine is an option.
- Filenames (as you decided): short key names, and only the targets that are set, e.g. `Song - 1m12s-1m20s - Dm 90bpm.wav`, `Song - Dm 90bpm.wav`, `Song - 90bpm.wav`. Setting an Original Key or Tempo also starts the Target at the same value, so an untouched export after Reset is still named e.g. `Song - Am 100bpm.wav`.
- The octave offset goes from −1 to +1 octave.
- After review: renamed the field to `pitchShift` (glossary); Sample Plan now reports `changesKey`/`changesTempo` and the panel reads those instead of deciding for itself; there's one shared `changesKeyOrTempo` check and one `keysInMode` helper; Rubber Band stalling is now an error instead of silently cutting the end off; the Pitch Shift sits next to the Target Key.
- Checked in the browser: A minor 100 → D minor 90 on 0:05–0:10 gave a 5.556 s file named `… - Dm 90bpm.wav`; the tritone goes down and the octave offset applies; reset works; a key-only shift keeps the length.
