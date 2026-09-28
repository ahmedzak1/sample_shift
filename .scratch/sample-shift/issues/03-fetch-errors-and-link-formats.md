# 03 — Fetch errors and link formats

**What to build:** the fetch accepts every usual YouTube link format and explains every failure in plain language. A progress state shows while `yt-dlp` works. The errors covered are: links that aren't YouTube; private, age-restricted, region-blocked or deleted videos; and `yt-dlp` or `ffmpeg` missing from your machine. There are no automatic retries.

**Blocked by:** 01 — Walking skeleton

**Status:** done

- [x] Watch, youtu.be, shorts, and links with timestamp or playlist parameters all resolve to the right video ID
- [x] Links that aren't YouTube are rejected with a clear message before any fetch
- [x] Unavailable videos (private, age-restricted, region-blocked, deleted) show a plain-language message
- [x] A missing `yt-dlp` or `ffmpeg` shows a message naming the tool to install
- [x] A visible in-progress state while fetching
- [x] API tests: each link format, the not-YouTube rejection, each Fetcher failure mapped to its own error response

## Comments

- Link formats: watch (any parameter order, with timestamps, playlists, `si=`), m./music. subdomains, youtu.be, shorts, embed and live links, with or without `https://`. Playlist-only links, and links to anything other than a single video, are rejected before any fetch.
- Each failure gets its own code and plain-language message: not-youtube 400, private 403, age-restricted 403, region-blocked 451, unavailable 404, tool-missing 503 (naming yt-dlp, ffmpeg, ffprobe, or Python when `python -m yt_dlp` can't start), timeout 504. Anything else is a 502 that shows yt-dlp's own wording.
- An extra test seam was added with your approval: `classifyYtDlpError`, a pure function tested with real yt-dlp messages. It looks only at `ERROR:` lines, so a harmless ffmpeg warning can't hide the real reason.
- The link field is now plain text instead of `type="url"`, so links without a scheme get past the browser. There's a spinner and a seconds counter while fetching.
- Checked against the real yt-dlp: a Vimeo link is rejected; a video that doesn't exist gives "This video is unavailable…"; `youtu.be/…` without a scheme loads; a missing yt-dlp command or module comes back as tool-missing. The private, age-restricted and region-blocked cases were only checked through the classifier, using yt-dlp's known wording.
- Not done: there's no up-front check for missing tools when the app starts. A missing tool is reported the first time a fetch needs it.
