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
