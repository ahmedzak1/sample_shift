# 01 — Walking skeleton: fetch a Source Track and export it untransformed

**What to build:** a Next.js (TypeScript) app you start with one command on localhost. You paste a YouTube link. The server fetches the audio with `yt-dlp` and `ffmpeg` into a Source Track and caches it on disk by video ID. The page shows the Source Track as a waveform with play and pause. A Download button exports the whole Source Track as a 24-bit WAV at its sample rate, encoded in the browser, named after the video title. This sets up the three test seams (Sample Plan, Sample Render, Tracks API) and the test runner. See the spec (`.scratch/sample-shift/spec.md`) and ADR-0001: the server only fetches and caches.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Next.js app with the TypeScript test runner set up; tests run with one command
- [ ] Tracks API route handlers run on the Node runtime; the Fetcher is an interface with a real implementation (`yt-dlp`/`ffmpeg`) and a fake for tests
- [ ] Pasting a standard `youtube.com/watch?v=` link fetches the Source Track and shows its title and waveform
- [ ] Fetching the same link again is served from the on-disk cache without calling the Fetcher
- [ ] Play and pause work on the Source Track
- [ ] Download saves a 24-bit WAV at the Source Track's sample rate, named `{title}.wav`
- [ ] API tests (fake Fetcher, temporary cache directory): a cache miss calls the Fetcher; a cache hit doesn't
- [ ] Sample Render test: a WAV exported from generated audio has a valid 24-bit header and the source sample rate
