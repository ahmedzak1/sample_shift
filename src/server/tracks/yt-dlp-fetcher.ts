import { execFile } from "node:child_process";
import { FetchFailure, type FetchedAudio, type Fetcher } from "./fetcher";
import { classifyYtDlpError, outputLines } from "./yt-dlp-errors";

const FETCH_TIMEOUT_MS = 5 * 60_000;
const PROBE_TIMEOUT_MS = 30_000;

/** Splits a command setting such as "python -m yt_dlp" into executable and leading args. */
function command(setting: string): [string, string[]] {
  const [exe, ...args] = setting.trim().split(/\s+/);
  return [exe, args];
}

interface Tool {
  /** Name shown to you if the tool is missing. */
  name: string;
  /** Command setting, e.g. "python -m yt_dlp". */
  setting: string;
  /** Turns the tool's stderr into a FetchFailure. */
  classify: (stderr: string) => FetchFailure;
}

function run(tool: Tool, args: string[], timeout: number): Promise<string> {
  const [exe, baseArgs] = command(tool.setting);
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
        if (!error) return resolve(stdout);
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          // With `python -m <module>`, it's Python itself that's missing.
          const missing = baseArgs[0] === "-m" ? `Python (needed to run ${tool.name})` : tool.name;
          reject(new FetchFailure("tool-missing", `${exe} could not be started`, missing));
        } else if (error.killed) {
          reject(new FetchFailure("timeout", `${tool.name} timed out after ${timeout / 1000}s`));
        } else {
          reject(tool.classify(stderr || error.message));
        }
      },
    );
  });
}

function lastLine(text: string): string {
  return text.trim().split(/\r?\n/).pop() ?? "";
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
  const ytDlp: Tool = { name: "yt-dlp", setting: options.ytDlp ?? "python -m yt_dlp", classify: classifyYtDlpError };
  const ffprobe: Tool = {
    name: "ffprobe (part of ffmpeg)",
    setting: options.ffprobe ?? "ffprobe",
    classify: (stderr) => new FetchFailure("failed", `ffprobe: ${lastLine(stderr)}`),
  };

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
      const info = JSON.parse(lastLine(stdout) || "{}");
      if (!info.filepath) throw new FetchFailure("failed", "yt-dlp finished without producing an audio file.");

      const rate = await run(
        ffprobe,
        ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate", "-of", "csv=p=0", info.filepath],
        PROBE_TIMEOUT_MS,
      );

      const sampleRate = Number.parseInt(rate.trim(), 10);
      if (!(sampleRate > 0)) throw new FetchFailure("failed", "ffprobe couldn't read the fetched audio's sample rate.");

      return {
        title: info.title ?? videoId,
        durationSeconds: Number(info.duration) || 0,
        sampleRate,
        audioFile: info.filepath,
      };
    },
  };
}
