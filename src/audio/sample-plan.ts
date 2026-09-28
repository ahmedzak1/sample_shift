import { pitchShift, shortKeyName, type MusicalKey } from "./musical-key";

/** Start and end of a Sample within its Source Track, in seconds. */
export interface Region {
  start: number;
  end: number;
}

/** A key and tempo, either of which may not be set yet. Tempo is in BPM. */
export interface KeyAndTempo {
  key: MusicalKey | null;
  tempo: number | null;
}

/** The Original and Target Key and Tempo, and how many whole octaves to add to the Pitch Shift. */
export interface KeyTempoSettings {
  original: KeyAndTempo;
  target: KeyAndTempo;
  octaveOffset: number;
}

const NOT_SET: KeyAndTempo = { key: null, tempo: null };

export const NO_KEY_TEMPO_CHANGE: KeyTempoSettings = { original: NOT_SET, target: NOT_SET, octaveOffset: 0 };

export interface SamplePlanInput extends Partial<KeyTempoSettings> {
  source: { title: string; durationSeconds: number };
  region: Region | null;
}

export interface SamplePlan {
  region: Region;
  /** True when both keys are set (in the same mode), so the Pitch Shift applies. */
  changesKey: boolean;
  /** True when both tempos are set, so the stretch applies. */
  changesTempo: boolean;
  /** Pitch Shift in semitones; 0 leaves the key alone. */
  pitchShift: number;
  /** Output length ÷ input length; 1 leaves the tempo alone. */
  timeRatio: number;
  /** Target Tempo as a percentage of the Original Tempo. */
  tempoPercent: number;
  filename: string;
}

/** Reads a typed Region time: `m:ss.fff` or plain seconds. Returns null if it isn't one. */
export function parseRegionTime(text: string): number | null {
  const match = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(text.trim());
  if (!match) return null;
  const [, minutes, seconds] = match;
  if (minutes !== undefined && Number(seconds) >= 60) return null;
  return Number(minutes ?? 0) * 60 + Number(seconds);
}

/** Shows a Region time as `m:ss.fff`. */
export function formatRegionTime(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const minutes = Math.floor(ms / 60_000);
  const rest = (ms % 60_000) / 1000;
  return `${minutes}:${rest.toFixed(3).padStart(6, "0")}`;
}

/** A time as `1m05.25s`: filename-safe everywhere (Windows forbids `:`), to the millisecond. */
function filenameTime(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const minutes = Math.floor(ms / 60_000);
  const wholeSeconds = Math.floor((ms % 60_000) / 1000);
  const fraction = ms % 1000;
  const fractionText = fraction ? `.${String(fraction).padStart(3, "0").replace(/0+$/, "")}` : "";
  return `${minutes}m${String(wholeSeconds).padStart(2, "0")}${fractionText}s`;
}

/** The title with characters Windows, macOS and Linux reject in filenames removed. */
function filenameTitle(title: string): string {
  const cleaned = title
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/, "")
    .trim();
  return cleaned || "Sample";
}

/** Orders a Region's edges and clamps them to the Source Track; an empty Region becomes null. */
export function normalizeRegion(region: Region, durationSeconds: number): Region | null {
  const clamp = (t: number) => Math.min(durationSeconds, Math.max(0, t));
  const start = clamp(Math.min(region.start, region.end));
  const end = clamp(Math.max(region.start, region.end));
  return end > start ? { start, end } : null;
}

export type RegionEdge = keyof Region;

/**
 * Moves one edge of a Region to a typed time, clamped to the Source Track. With no Region yet, the
 * other edge is the matching end of the Source Track. Returns null if the edges would end up out of order.
 */
export function moveRegionEdge(
  region: Region | null,
  edge: RegionEdge,
  seconds: number,
  durationSeconds: number,
): Region | null {
  const moved = { ...(region ?? { start: 0, end: durationSeconds }) };
  moved[edge] = Math.min(durationSeconds, Math.max(0, seconds));
  return moved.end > moved.start ? moved : null;
}

/** A tempo for filenames: at most two decimals, trailing zeros dropped (90, 92.5). */
function filenameTempo(tempo: number): string {
  return String(Math.round(tempo * 100) / 100);
}

/** Works out what gets rendered and downloaded for a Sample. */
export function planSample({
  source,
  region: requested,
  original = NOT_SET,
  target = NOT_SET,
  octaveOffset = 0,
}: SamplePlanInput): SamplePlan {
  const region = (requested && normalizeRegion(requested, source.durationSeconds)) ?? null;

  // A key change needs both keys (in the same mode); a tempo change needs both tempos.
  const targetKey =
    original.key && target.key && original.key.mode === target.key.mode ? target.key : null;
  const targetTempo = original.tempo && target.tempo && original.tempo > 0 && target.tempo > 0 ? target.tempo : null;

  const nameParts = [filenameTitle(source.title)];
  if (region) nameParts.push(`${filenameTime(region.start)}-${filenameTime(region.end)}`);
  const targets = [
    ...(targetKey ? [shortKeyName(targetKey)] : []),
    ...(targetTempo ? [`${filenameTempo(targetTempo)}bpm`] : []),
  ];
  if (targets.length) nameParts.push(targets.join(" "));

  return {
    region: region ?? { start: 0, end: source.durationSeconds },
    changesKey: targetKey !== null,
    changesTempo: targetTempo !== null,
    pitchShift: targetKey ? pitchShift(original.key!, targetKey, octaveOffset) : 0,
    timeRatio: targetTempo ? original.tempo! / targetTempo : 1,
    tempoPercent: targetTempo ? Math.round((targetTempo / original.tempo!) * 1000) / 10 : 100,
    filename: `${nameParts.join(" - ")}.wav`,
  };
}
