/** Audio fetched for a Source Track, written into the directory the Fetcher was given. */
export interface FetchedAudio {
  title: string;
  durationSeconds: number;
  sampleRate: number;
  /** Absolute path of the audio file inside the output directory. */
  audioFile: string;
}

/** Pulls a Source Track's audio from YouTube. */
export interface Fetcher {
  fetch(videoId: string, outDir: string): Promise<FetchedAudio>;
}

export type FetchFailureKind =
  | "private"
  | "age-restricted"
  | "region-blocked"
  | "unavailable"
  | "tool-missing"
  | "timeout"
  | "failed";

/** A Fetcher failure, classified so the Tracks API can explain it. */
export class FetchFailure extends Error {
  constructor(
    readonly kind: FetchFailureKind,
    /** The underlying tool's own wording. */
    readonly detail: string,
    /** For "tool-missing": the name to show you, e.g. "ffmpeg" or "Python (needed to run yt-dlp)". */
    readonly toolName?: string,
  ) {
    super(detail);
    this.name = "FetchFailure";
  }
}
