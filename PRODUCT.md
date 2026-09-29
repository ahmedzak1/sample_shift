# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One user: the owner, a music producer, running the app on their own machine. They hear a part of a song on YouTube they want to sample, and need it in their DAW at the right key and tempo without going through a downloader, an editor, a key/BPM detector and a stretch tool in turn.

## Product Purpose

Sample Shift turns part of a YouTube song into a ready-to-use Sample in one place: paste a link, fetch the Source Track, select a Region, confirm the Estimate as the Original Key/Tempo, set a Target Key and Target Tempo while hearing a live preview, and download a 24-bit WAV. Success means the WAV drops straight into a DAW project at the right key and tempo, sounds clean, and trying settings by ear is fast.

## Positioning

Several single-purpose tools collapse into one localhost app, and you hear the result while you adjust it. Key and tempo change independently (no varispeed). The Pitch Shift takes the smaller move by default, the Target Key stays in the Original Key's mode, and the export is rendered in Rubber Band's high-quality offline mode, with a filename that records its source, Region and target settings.

## Operating Context

- Used both beside a DAW (the browser sharing the screen, so the window is often narrow or half-width) and full-window on its own. Layouts must work at both sizes.
- Mouse plus keyboard. The user expects DAW-like keyboard shortcuts (e.g. play/stop, loop, A/B, nudging Region edges). Today only Enter-to-commit on time fields exists, so shortcuts are a gap.
- Listening is central: live preview, looping and A/B against the untransformed Source Track.
- Workflow: fetch → select Region → Estimate → confirm or correct Original → set Target → preview → export.

## Capabilities and Constraints

- Personal use only, localhost only: no accounts, hosting or sharing. Downloading from YouTube is against its ToS and is accepted only on that basis.
- All audio work happens in the browser (ADR-0001). The server only fetches and caches Source Tracks with yt-dlp and ffmpeg.
- Next.js + TypeScript. Rubber Band WASM (GPL) for preview and export, essentia.js (AGPL) for the Estimate.
- Source Tracks are at most 15 minutes; longer videos need a Fetch Window (ticket 04).
- Only Source Tracks are cached; Samples are never saved. Export is 24-bit WAV only.
- Terminology is binding: use the `CONTEXT.md` glossary in UI text, and treat its _Avoid_ words (e.g. "semitones" alone, "original" for Source Track, "detected") as violations.
- Still to build: Fetch Window (04), recent Source Tracks (05), Beat Grid, Downbeat and snapping (09).
- Undecided: whether an export named after the Original Key/Tempo should drop those from its filename; whether the faster R2 engine is acceptable for export.

## Evidence on Hand

- `README.md`, `CONTEXT.md`, `docs/adr/0001-browser-side-audio-processing.md`, and the spec and tickets in `.scratch/sample-shift/`.
- No testimonials, users beyond the owner, or public claims exist; none should be invented.

## Product Principles

1. **The ear decides.** Anything that changes the sound should be audible right away, with a way to compare against the untransformed audio.
2. **Suggestions, never overrides.** The Estimate is only a starting point. The user's corrections stick until they explicitly ask for a new Estimate.
3. **Precision on demand.** Drag for speed, and use typed values, zoom and snapping when exactness matters.
4. **Ready for the DAW.** Output is lossless, click-free and named so it can be found and used without renaming.
5. **Never feel frozen.** Long fetches, Estimates and renders show progress, and the UI stays responsive.

## Accessibility & Inclusion

No product-specific needs beyond sensible defaults: readable contrast, full keyboard access (which also fits the shortcut-driven workflow), and respecting reduced motion.
