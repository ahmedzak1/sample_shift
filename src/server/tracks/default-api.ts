import path from "node:path";
import { createTracksApi } from "./tracks-api";
import { ytDlpFetcher } from "./yt-dlp-fetcher";

/** The Tracks API wired to the real yt-dlp Fetcher and the project's on-disk cache. */
export const tracksApi = createTracksApi({
  fetcher: ytDlpFetcher({
    ytDlp: process.env.YTDLP_CMD,
    ffprobe: process.env.FFPROBE_CMD,
    ffmpegLocation: process.env.FFMPEG_LOCATION,
  }),
  cacheDir: process.env.TRACK_CACHE_DIR ?? path.join(process.cwd(), ".cache", "tracks"),
});
