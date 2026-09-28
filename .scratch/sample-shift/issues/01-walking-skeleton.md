# 01 — Walking skeleton: fetch a Source Track and export it untransformed

**What to build:** a Next.js (TypeScript) app you start with one command on localhost. You paste a YouTube link. The server fetches the audio with `yt-dlp` and `ffmpeg` into a Source Track and caches it on disk by video ID. The page shows the Source Track as a waveform with play and pause. A Download button exports the whole Source Track as a 24-bit WAV at its sample rate, encoded in the browser, named after the video title. This sets up the three test seams (Sample Plan, Sample Render, Tracks API) and the test runner. See the spec (`.scratch/sample-shift/spec.md`) and ADR-0001: the server only fetches and caches.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Next.js app with the TypeScript test runner set up; tests run with one command
- [x] Tracks API route handlers run on the Node runtime; the Fetcher is an interface with a real implementation (`yt-dlp`/`ffmpeg`) and a fake for tests
- [x] Pasting a standard `youtube.com/watch?v=` link fetches the Source Track and shows its title and waveform
- [x] Fetching the same link again is served from the on-disk cache without calling the Fetcher
- [x] Play and pause work on the Source Track
- [x] Download saves a 24-bit WAV at the Source Track's sample rate, named `{title}.wav`
- [x] API tests (fake Fetcher, temporary cache directory): a cache miss calls the Fetcher; a cache hit doesn't
- [x] Sample Render test: a WAV exported from generated audio has a valid 24-bit header and the source sample rate

## Comments

- Implemented and checked end to end in the browser: fetching `jNQXAC9IVRw` took 9.9 s, and the cached repeat took 42 ms. The download was a 24-bit/48 kHz stereo WAV, `Me at the zoo.wav`.
- The Sample Plan module isn't built yet. Ticket 02 introduces it, as its own description says; this ticket set up the Sample Render and Tracks API seams.
- The Tracks API tests call `createTracksApi()` with a fake Fetcher. The Next.js route files are only one-line delegations, and they were checked in the browser run.
- On this machine yt-dlp runs as `python -m yt_dlp` (the default; override with `YTDLP_CMD`), because the standalone `yt-dlp.exe` hangs here.
