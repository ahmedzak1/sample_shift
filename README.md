# Sample Shift

A personal web app, run on your own machine, for turning part of a YouTube song into a sample: paste a link, pick the part you want, change its key and tempo while you listen, and download it as a WAV.

- **Fetch** the audio of a YouTube link (watch, youtu.be, shorts, embed and live links). It's cached on disk, so fetching the same link again is instant.
- **Select a Region** by dragging on the waveform or typing exact times, with zoom, looping playback and click-free 5 ms fades on export.
- **Estimate** the key and tempo automatically (for the whole track, then for your Region). Correct the Estimate by hand if it's wrong, including ÷2 and ×2 for half- or double-time mistakes.
- **Change key and tempo independently**: pick a Target Key (always in the same mode, with relative-key hints) and a Target Tempo. The Pitch Shift takes the smaller move, with ±1 octave buttons.
- **Live preview** that applies your Target Key and Tempo as you play, with an A/B toggle against the untransformed Source Track.
- **Download** a 24-bit WAV at the Source Track's sample rate, rendered in Rubber Band's high-quality offline mode, and named after what it is, e.g. `Song - 1m12s-1m20s - Dm 90bpm.wav`.

## Requirements

- **Node.js** 22 or later
- **Python** 3 with **yt-dlp** installed through pip:

  ```bash
  python -m pip install --user "yt-dlp[default]"
  ```

- **ffmpeg** (with `ffprobe`) on your PATH
- **Deno** on your PATH. yt-dlp uses it as a JavaScript runtime for YouTube.

On Windows, `winget install Gyan.FFmpeg` and `winget install DenoLand.Deno` cover the last two. Open a new terminal afterwards so the PATH changes apply.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

`npm install`, `npm run dev` and `npm run build` all run `scripts/prepare-public.mjs` first. It copies Rubber Band's `.wasm` into `public/` and bundles the preview AudioWorklet and the Estimate worker there. If you change `src/audio/preview.worklet.ts`, `src/audio/preview-engine.ts` or `src/audio/estimate.worker.ts` while the dev server is running, re-run it:

```bash
node scripts/prepare-public.mjs
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app on localhost:3000 |
| `npm test` | Run the unit tests (Vitest) |
| `npm run typecheck` | Type-check with TypeScript |
| `npm run build` | Production build |

## Configuration

These are all optional. Set them in the environment or in a `.env.local` file.

| Variable | Default | Purpose |
|---|---|---|
| `YTDLP_CMD` | `python -m yt_dlp` | How to run yt-dlp. The standalone `yt-dlp.exe` hangs on some Windows machines, which is why it goes through Python. |
| `FFPROBE_CMD` | `ffprobe` | How to run ffprobe |
| `FFMPEG_LOCATION` | *(yt-dlp finds it)* | Passed to yt-dlp's `--ffmpeg-location` |
| `TRACK_CACHE_DIR` | `.cache/tracks` | Where fetched Source Tracks are cached |

## How it works

- **Server** (Next.js route handlers, Node runtime): only fetches and caches Source Tracks with yt-dlp and ffmpeg (`src/server/tracks/`).
- **Browser**: does all the audio work ([ADR-0001](docs/adr/0001-browser-side-audio-processing.md)).
  - **Export:** [Rubber Band](https://breakfastquay.com/rubberband/) (WebAssembly) in offline high-quality mode, in a Web Worker (`src/audio/sample-render.ts`, `rubber-band.ts`, `render.worker.ts`).
  - **Live preview:** Rubber Band in real-time mode, in an AudioWorklet (`src/audio/preview-engine.ts`, `preview.worklet.ts`, `preview-player.ts`).
  - **Estimate:** key and tempo from [essentia.js](https://mtg.github.io/essentia.js/), in a Web Worker (`src/audio/estimate*.ts`).
- **Domain rules**: Region, filename, Pitch Shift and the Estimate rules are pure functions with unit tests (`src/audio/sample-plan.ts`, `musical-key.ts`, `estimate.ts`).

## Project docs

- [`CONTEXT.md`](CONTEXT.md): the glossary (Source Track, Sample, Region, Estimate, Original/Target Key and Tempo, Pitch Shift, …). Code and tickets use these terms.
- [`docs/adr/`](docs/adr/): architecture decisions.
- [`.scratch/sample-shift/`](.scratch/sample-shift/): the spec and the tickets, with notes on what was built and checked.

## Status

Tickets 01–03 and 06–08 are done. Still to come:

- **04:** long videos (over 15 minutes) with a Fetch Window
- **05:** a recent Source Tracks list
- **09:** a Beat Grid, a Downbeat marker and snapping Region edges to beats or bars

## Notes

- **Personal use only.** Downloading audio from YouTube is against YouTube's Terms of Service. Sample Shift is meant to run on your own machine, for your own use.
- **Licences of the audio libraries.** Rubber Band is GPL-licensed and essentia.js is AGPL-licensed. That's fine for personal use, but it matters if you ever distribute or host this.
