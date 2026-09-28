import { FetchFailure, type FetchFailureKind } from "./fetcher";

/** yt-dlp's wording for each kind of failure, checked in order (region before the generic "unavailable"). */
const FAILURE_PATTERNS: [RegExp, FetchFailureKind][] = [
  [/private video/i, "private"],
  [/confirm your age|age[- ]restricted/i, "age-restricted"],
  [/(not made this video available|not available|blocked it) in your country/i, "region-blocked"],
  [/video (is )?unavailable|has been removed|no longer available|video does not exist/i, "unavailable"],
];

/** The lines of output, trimmed, without blanks. */
export function outputLines(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

/** Strips yt-dlp's `ERROR: [extractor] id:` prefix. */
function withoutPrefix(line: string): string {
  return line.replace(/^ERROR:\s*(\[[^\]]+\]\s*[\w-]+:\s*)?/, "");
}

/** Classifies yt-dlp's stderr output into a FetchFailure the Tracks API can explain. */
export function classifyYtDlpError(stderr: string): FetchFailure {
  const lines = outputLines(stderr);
  // Python fails before yt-dlp runs, so this line has no ERROR: prefix.
  if (lines.some((line) => /no module named yt_dlp/i.test(line))) {
    return new FetchFailure("tool-missing", lines.at(-1) ?? "", "yt-dlp");
  }

  // Only ERROR: lines count; yt-dlp also prints harmless warnings (e.g. about ffmpeg) before the real error.
  const errors = lines.filter((line) => line.startsWith("ERROR:"));
  const detail = withoutPrefix(errors.at(-1) ?? lines.at(-1) ?? "");
  const errorText = errors.join("\n");
  if (/ffmpeg not found|ffprobe and ffmpeg not found/i.test(errorText)) {
    return new FetchFailure("tool-missing", detail, "ffmpeg");
  }
  const match = FAILURE_PATTERNS.find(([pattern]) => pattern.test(errorText));
  return new FetchFailure(match?.[1] ?? "failed", detail);
}
