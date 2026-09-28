# 04 — Long videos: the 15-minute rule and Fetch Window

**What to build:** when a video is longer than 15 minutes, the app asks for a Fetch Window (a start and end, at most 15 minutes) instead of fetching it all. Only that section is downloaded (`yt-dlp --download-sections`), and it becomes the Source Track. The cache key includes the Fetch Window, so different windows of the same video are separate entries.

**Blocked by:** 01 — Walking skeleton

**Status:** ready-for-agent

- [ ] Fetching a video over 15 minutes without a Fetch Window gives a "window required" response, and the UI asks for one
- [ ] A Fetch Window longer than 15 minutes is rejected
- [ ] With a valid Fetch Window, only that section is fetched and shown as the Source Track
- [ ] The same video with different Fetch Windows gives separate cache entries; the same window hits the cache
- [ ] API tests (fake Fetcher reporting a long duration): window required, window too long, window cached separately
