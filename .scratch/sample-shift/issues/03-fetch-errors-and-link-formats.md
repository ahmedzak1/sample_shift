# 03 — Fetch errors and link formats

**What to build:** the fetch accepts every usual YouTube link format and explains every failure in plain language. A progress state shows while `yt-dlp` works. The errors covered are: links that aren't YouTube; private, age-restricted, region-blocked or deleted videos; and `yt-dlp` or `ffmpeg` missing from your machine. There are no automatic retries.

**Blocked by:** 01 — Walking skeleton

**Status:** ready-for-agent

- [ ] Watch, youtu.be, shorts, and links with timestamp or playlist parameters all resolve to the right video ID
- [ ] Links that aren't YouTube are rejected with a clear message before any fetch
- [ ] Unavailable videos (private, age-restricted, region-blocked, deleted) show a plain-language message
- [ ] A missing `yt-dlp` or `ffmpeg` shows a message naming the tool to install
- [ ] A visible in-progress state while fetching
- [ ] API tests: each link format, the not-YouTube rejection, each Fetcher failure mapped to its own error response
