# Spec: Sample Shift

Status: ready-for-agent

## Problem Statement

When I hear a part of a song on YouTube that I want to sample, getting it into my DAW at the right key and tempo means going through several tools: a YouTube downloader, an audio editor to cut the part out, a key and BPM detector, and a time-stretch/pitch-shift tool. Each step exports a file, loses a bit of quality, and makes trying things slow. I want one place where I paste a link, pick the part, set the key and tempo I need while hearing the result, and download a file that's ready to use.

## Solution

Sample Shift is a personal web app that runs on my own machine (localhost). I paste a YouTube link, and the app fetches the audio as a Source Track, caching it so repeat visits load instantly. It shows a waveform with a Beat Grid, and I drag out a Region that snaps to beats and bars. The app suggests an Estimate of the key and tempo, which I confirm or correct as the Original Key/Tempo. I pick a Target Key (same mode) and Target Tempo, hear a live preview while I adjust, and download the Sample as a 24-bit WAV rendered in high quality. The filename records its source, Region and target settings.

## User Stories

### Fetching a Source Track

1. As a producer, I want to paste a YouTube link and fetch its audio, so that I can sample from any song on YouTube.
2. As a producer, I want to see that a fetch is in progress, so that I know the app hasn't frozen while `yt-dlp` works.
3. As a producer, I want fetched Source Tracks cached on disk by video ID, so that pasting the same link again loads instantly.
4. As a producer, I want a list of recent Source Tracks, so that I can reopen a song without finding the link again.
5. As a producer, I want to be asked for a Fetch Window when a video is longer than 15 minutes, so that I can sample from long DJ sets and live recordings without crashing the browser.
6. As a producer, I want only the Fetch Window to be downloaded and treated as the Source Track, so that long videos stay fast and light.
7. As a producer, I want a Source Track fetched with a Fetch Window to be cached separately from the same video fetched with a different window, so that the cache never gives me the wrong part.
8. As a producer, I want a clear message when a video is private, age-restricted, region-blocked or deleted, so that I understand why it can't be fetched.
9. As a producer, I want a clear message when the link isn't a YouTube link, so that I catch mistakes early.
10. As a producer, I want a clear message when `yt-dlp` or `ffmpeg` is missing on my machine, so that I know what to install.
11. As a producer, I want the Source Track to accept all the usual YouTube link formats (watch, youtu.be, shorts, links with timestamps or playlist parameters), so that I don't have to clean up links by hand.

### Viewing and selecting a Region

12. As a producer, I want to see the Source Track as a waveform, so that I can find sections visually.
13. As a producer, I want to play the Source Track and see a playhead, so that I can find the part I want by ear.
14. As a producer, I want to drag on the waveform to create a Region, so that I can pick the part I want to sample.
15. As a producer, I want to drag the Region's edges to adjust it, so that I can refine my selection.
16. As a producer, I want to type exact start and end times for the Region, so that I have precise control.
17. As a producer, I want to play just the Region, untransformed, so that I can check the selection before changing it.
18. As a producer, I want to loop Region playback, so that I can hear whether it loops cleanly.
19. As a producer, I want to zoom the waveform, so that I can place Region edges precisely.
20. As a producer, I want to clear the Region, so that the Sample goes back to being the whole Source Track.

### Beat Grid and Downbeat

21. As a producer, I want a Beat Grid drawn over the waveform based on the Original Tempo, so that I can see where beats and bars fall.
22. As a producer, I want to move the Downbeat marker, so that the Beat Grid lines up with the song's actual first beat.
23. As a producer, I want Region edges to snap to beats or bars, so that my Samples loop cleanly.
24. As a producer, I want to choose whether snapping goes to beats or to bars, so that I can match how I'll slice the Sample.
25. As a producer, I want to hold a modifier key to turn snapping off temporarily, so that I can handle songs whose tempo drifts.
26. As a producer, I want the Beat Grid to update when I correct the Original Tempo, so that the grid always matches what I've confirmed.

### Estimate and Original Key/Tempo

27. As a producer, I want an Estimate of key and tempo for the whole Source Track as soon as it loads, so that I have a starting point straight away.
28. As a producer, I want the Estimate re-run on the Region once I finish selecting it, so that songs that change key or tempo partway through still give accurate values.
29. As a producer, I want the Original Key/Tempo to start from the Estimate, so that I don't have to enter them myself.
30. As a producer, I want to correct the Original Key (including its mode), so that detection mistakes such as a relative major/minor mix-up don't spoil my Sample.
31. As a producer, I want to correct the Original Tempo, including quick ×2 and ÷2 buttons, so that I can fix half-time or double-time detection errors.
32. As a producer, I want my corrections to stay when I adjust the Region, so that the app never overwrites what I've confirmed.
33. As a producer, I want to request a new Estimate explicitly, so that I can throw away my corrections when I want to.
34. As a producer, I want to be warned when the Region is too short for a reliable Estimate, so that I don't trust a bad number.

### Target Key/Tempo and Pitch Shift

35. As a producer, I want to pick a Target Key from a list restricted to the Original Key's mode, so that the result is always exactly the key I chose.
36. As a producer, I want each key in the picker to show its relative key, so that I can match against tracks in the other mode.
37. As a producer, I want the Pitch Shift to default to the smaller of the two possible moves, so that the Sample changes as little as possible.
38. As a producer, I want to move the Pitch Shift up or down an octave, so that I can choose to shift up or down.
39. As a producer, I want to see the Pitch Shift in semitones next to the Target Key, so that I know how far the audio is being moved.
40. As a producer, I want to set a Target Tempo in BPM, so that the Sample fits my project's tempo.
41. As a producer, I want to see the resulting stretch as a percentage, so that I can judge how hard the audio is being pushed.
42. As a producer, I want key and tempo to change independently, so that changing one never changes the other.
43. As a producer, I want a quick reset of the Target Key/Tempo to the Original Key/Tempo, so that I can compare against the untouched audio.

### Live preview

44. As a producer, I want to hear the Region with the Target Key/Tempo applied while I play it, so that I can judge the result by ear.
45. As a producer, I want the preview to update as I change the Target Key/Tempo during playback, so that trying settings is quick.
46. As a producer, I want the preview to loop the Region, so that I can hear how the Sample works as a loop.
47. As a producer, I want to switch between the preview and the untransformed audio, so that I can A/B the change.

### Export

48. As a producer, I want to download the Sample as a 24-bit WAV at the Source Track's sample rate, so that it drops straight into my DAW without further loss.
49. As a producer, I want the export rendered in Rubber Band's high-quality offline mode, so that the file sounds at least as clean as the preview.
50. As a producer, I want short fades (~5 ms) at each edge of the export, so that the Sample never clicks.
51. As a producer, I want the filename to follow `{title} - {start}-{end} - {Target Key} {Target Tempo}bpm.wav`, so that I can tell my Samples apart in my downloads folder.
52. As a producer, I want characters that aren't allowed in filenames removed from the title, so that the download always saves.
53. As a producer, I want to see that the export is in progress, so that I know a longer render is still running.
54. As a producer, I want to export the whole Source Track when there's no Region, so that I can re-key and re-tempo an entire song.
55. As a producer, I want the rest of the UI to stay responsive during estimation and export, so that the app never feels frozen.

## Implementation Decisions

- **Architecture (ADR-0001):** all estimation, preview and export happen in the browser. The server only fetches and caches Source Tracks.
- **Stack:** one Next.js app in TypeScript. The API is Next.js route handlers on the **Node runtime** (not Edge) because they spawn child processes. The editor is made of client components; server rendering isn't used for it.
- **External requirements:** `yt-dlp` and `ffmpeg` must be installed on your machine. The server checks for them and reports clearly when one is missing.
- **Modules:**
  - **Fetcher (server):** an interface around `yt-dlp` and `ffmpeg`. Given a video ID and an optional Fetch Window, it returns metadata (title, duration) and an audio file. The real version shells out; the test version is a fake. When a Fetch Window is given, only that section is downloaded.
  - **Source Track Cache (server):** stores fetched audio and metadata on disk, keyed by video ID plus Fetch Window. It also backs the recent-tracks list.
  - **Tracks API (server):** handles creating/fetching a Source Track from a link (parsing the link into a video ID and applying the 15-minute rule, which asks for a Fetch Window when needed), listing recent Source Tracks, and streaming a cached Source Track's audio. It maps failures (not a YouTube link, unavailable video, window required, tools missing) to distinct error responses with plain-language messages.
  - **Sample Plan (shared, pure):** the heart of the domain rules. Given the Region, Downbeat, Original Key/Tempo, Target Key/Tempo, snap setting and octave adjustment, it works out: the Pitch Shift in semitones (smaller move by default, ±12 adjustable); the time-stretch ratio; the Beat Grid positions; the snapped Region edges; the allowed Target Keys (same mode) with their relative-key hints; and the export filename. No audio or browser APIs.
  - **Estimator (client, Web Worker):** runs essentia.js over the decoded audio (whole Source Track, then the Region) and returns an Estimate of key (with mode) and tempo. Flags Regions too short for a reliable Estimate.
  - **Preview Engine (client, AudioWorklet):** Rubber Band WASM in real-time mode, applying the Sample Plan's Pitch Shift and stretch ratio to Region playback, and picking up parameter changes during playback.
  - **Sample Render (client, Web Worker):** Rubber Band WASM in offline high-quality mode. Given decoded Source Track audio and a Sample Plan, it returns 24-bit WAV bytes at the source sample rate with ~5 ms fades at each edge.
  - **Editor UI (client):** waveform, Region editing, Beat Grid/Downbeat, Estimate/Original/Target controls, preview transport, export.
- **State:** Sample state (Region, Downbeat, Original/Target, octave adjustment) lives only in the browser session. Corrections to the Original Key/Tempo persist until you ask for a new Estimate. Nothing about Samples is saved on the server.
- **Limits:** a Source Track can be at most 15 minutes long; longer videos require a Fetch Window of 15 minutes or less.
- **Licensing:** Rubber Band is GPL. That's acceptable for a personal tool; it needs a second look if this is ever distributed.

## Testing Decisions

- Good tests check external behaviour through a module's public interface: the inputs you give and the outputs you get back. They don't check internal structure or call sequences, and they don't mock the module being tested.
- **Seam 1: Sample Plan (pure unit tests).** This is where most of the tests live. Cases include: Pitch Shift choosing the smaller move (e.g. A→D gives +5, not −7), a tritone defaulting to −6 (down), the octave adjustment; the stretch ratio; Target Keys limited to the same mode, and the relative-key hints; Beat Grid positions from tempo and Downbeat; snapping to beats or bars, with snapping off; Region cleared means the whole Source Track; filename format, including removing characters that aren't allowed and formatting times.
- **Seam 2: Sample Render (in Node with the real Rubber Band WASM).** Use generated test signals: a sine at a known frequency shifted +3 semitones comes out at the expected frequency (within tolerance); output length matches Region length × stretch ratio; WAV header says 24-bit and the source sample rate; the first and last ~5 ms ramp from and to silence; no stretch and no shift gives a result that matches the source closely.
- **Seam 3: Tracks API (HTTP-level against the route handlers, with a fake Fetcher and a temporary cache directory).** Cases include: link parsing across YouTube URL formats; rejecting links that aren't YouTube; a cache miss calls the Fetcher and a hit doesn't; a Fetch Window gets its own cache entry; over 15 minutes without a Fetch Window gives a "window required" error; Fetcher failures and missing tools map to distinct plain-language errors; the recent-tracks list order.
- **No automated tests** for the Preview Engine, Estimator accuracy or the Editor UI; they're checked by hand in the browser.
- **Prior art:** none. This is a new repo, and these tests set the patterns.

## Out of Scope

- Hosting or running the app anywhere other than your own machine; user accounts; sharing.
- Saving or reopening Samples (only Source Tracks are cached).
- Turntable-style linked key and tempo (varispeed).
- Export formats other than 24-bit WAV (no MP3 or FLAC).
- Snapping Region edges to transients.
- Changing a Sample's mode (major ↔ minor).
- Handling songs with a drifting tempo beyond turning snapping off.
- Sources other than YouTube.

## Further Notes

- Glossary: `CONTEXT.md` (Source Track, Fetch Window, Sample, Region, Beat Grid, Downbeat, Estimate, Original/Target Key and Tempo, Pitch Shift). Use these terms in code and tickets.
- Decision record: `docs/adr/0001-browser-side-audio-processing.md`.
- Downloading from YouTube is against its Terms of Service; this is accepted only because it's a personal tool on your own machine.
- Suggested first ticket (a thin end-to-end slice): paste a link, fetch and cache it, show the waveform, select a Region, and export it untransformed as a 24-bit WAV.
