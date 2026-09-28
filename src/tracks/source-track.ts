/** A cached Source Track as the Tracks API describes it to the browser. */
export interface SourceTrack {
  id: string;
  title: string;
  durationSeconds: number;
  sampleRate: number;
  audioUrl: string;
}
