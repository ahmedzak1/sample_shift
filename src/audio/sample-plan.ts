/** Start and end of a Sample within its Source Track, in seconds. */
export interface Region {
  start: number;
  end: number;
}

export interface SamplePlanInput {
  source: { title: string; durationSeconds: number };
  region: Region | null;
}

export interface SamplePlan {
  region: Region;
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

/** Works out what gets rendered and downloaded for a Sample. */
export function planSample({ source, region: requested }: SamplePlanInput): SamplePlan {
  const title = filenameTitle(source.title);
  const region = requested && normalizeRegion(requested, source.durationSeconds);
  if (!region) {
    return {
      region: { start: 0, end: source.durationSeconds },
      filename: `${title}.wav`,
    };
  }
  return {
    region,
    filename: `${title} - ${filenameTime(region.start)}-${filenameTime(region.end)}.wav`,
  };
}
