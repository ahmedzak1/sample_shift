# All key/tempo processing runs in the browser; the server only fetches audio

Sample Shift is a personal tool that runs on localhost, and it needs a live preview while you drag the key and tempo controls. We chose one engine for both preview and export: Rubber Band compiled to WebAssembly, running in the browser. Preview uses its real-time mode, and export renders the Sample offline in its high-quality mode. The server's only job is to fetch the Source Track's audio from YouTube.

## Considered Options

- **Preview in the browser, export on the server** (server-side Rubber Band): the export sounds cleaner, but you'd audition one engine and download another, and there'd be two processing paths to maintain.
- **Real-time mode for export too**: the preview and export would match exactly, but the export would keep the real-time mode's artifacts.

## Consequences

- Most of the app's logic is frontend code, and the server stays a thin fetcher: Next.js route handlers (Node runtime) that call `yt-dlp` and `ffmpeg` and serve the cached Source Tracks. Estimating key and tempo (essentia.js) also runs in the browser.
- Rubber Band is GPL-licensed and essentia.js (used for the Estimate) is AGPL-licensed. That's fine for a personal tool, but both need a second look if this is ever distributed or hosted for others.
