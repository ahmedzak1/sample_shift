import { execFile } from "node:child_process";
import type { FetchedAudio, Fetcher } from "./fetcher";

const FETCH_TIMEOUT_MS = 5 * 60_000;
const PROBE_TIMEOUT_MS = 30_000;

/** Splits a command setting such as "python -m yt_dlp" into executable and leading args. */
function command(setting: string): [string, string[]] {
  const [exe, ...args] = setting.trim().split(/\s+/);
  return [exe, args];
}

function run(setting: string, args: string[], timeout: number): Promise<string> {
  const [exe, baseArgs] = command(setting);
  return new Promise((resolve, reject) => {
    execFile(
      exe,
      [...baseArgs, ...args],
      {
        timeout,
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
      },
      (error, stdout, stderr) => {
        if (error) {
          const detail = stderr.trim().split("\n").filter(Boolean).pop() ?? error.message;
          reject(new Error(error.killed ? `${exe} timed out after ${timeout / 1000}s` : detail));
        } else {
          resolve(stdout);
        }
      },
    );
  });
}

export interface YtDlpFetcherOptions {
  /** How to invoke yt-dlp. Defaults to `python -m yt_dlp`; the standalone yt-dlp.exe hangs on some machines. */
  ytDlp?: string;
  ffprobe?: string;
  /** Passed to yt-dlp's --ffmpeg-location when set. */
  ffmpegLocation?: string;
}

/** Fetches a Source Track with yt-dlp, converting the best audio stream to FLAC so browsers can decode it losslessly. */
export function ytDlpFetcher(options: YtDlpFetcherOptions = {}): Fetcher {
  const ytDlp = options.ytDlp ?? "python -m yt_dlp";
  const ffprobe = options.ffprobe ?? "ffprobe";

  return {
    async fetch(videoId, outDir): Promise<FetchedAudio> {
      const stdout = await run(
        ytDlp,
        [
          "--no-playlist",
          "--no-progress",
          "--format", "bestaudio",
          "--extract-audio",
          "--audio-format", "flac",
          "--output", `${outDir}/audio.%(ext)s`,
          "--no-simulate",
          "--print", "after_move:%(.{title,duration,filepath})j",
          ...(options.ffmpegLocation ? ["--ffmpeg-location", options.ffmpegLocation] : []),
          `https://www.youtube.com/watch?v=${videoId}`,
        ],
        FETCH_TIMEOUT_MS,
      );
      const info = JSON.parse(stdout.trim().split("\n").pop() ?? "{}");
      if (!info.filepath) throw new Error("yt-dlp finished without producing an audio file.");

      const rate = await run(
        ffprobe,
        ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate", "-of", "csv=p=0", info.filepath],
        PROBE_TIMEOUT_MS,
      );

      const sampleRate = Number.parseInt(rate.trim(), 10);
      if (!(sampleRate > 0)) throw new Error("ffprobe couldn't read the fetched audio's sample rate.");

      return {
        title: info.title ?? videoId,
        durationSeconds: Number(info.duration) || 0,
        sampleRate,
        audioFile: info.filepath,
      };
    },
  };
}
