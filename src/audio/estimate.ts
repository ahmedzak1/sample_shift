import { sameKey, type Mode, type MusicalKey } from "./musical-key";
import { withOriginalKey, withOriginalTempo, type KeyTempoSettings, type Region } from "./sample-plan";

/** The Estimate of a key and tempo: only ever a suggestion. */
export interface Estimate {
  key: MusicalKey | null;
  tempo: number | null;
}

/** Which Original values you've corrected by hand; an Estimate never overwrites those. */
export interface Corrections {
  key: boolean;
  tempo: boolean;
}

export const NO_CORRECTIONS: Corrections = { key: false, tempo: false };

/** What an Estimate was made from. */
export type EstimateScope = "Region" | "Source Track";

/** A Region shorter than this gives an Estimate too little to go on. */
export const MIN_ESTIMATE_SECONDS = 4;

/** How close to a whole BPM an estimated tempo must be to snap to it. */
const WHOLE_TEMPO_SNAP = 0.15;

const LETTER_TONICS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Reads an estimated key such as "C#" + "minor" or "Bb" + "major". */
export function parseEstimatedKey(name: string, scale: string): MusicalKey | null {
  const match = /^([A-G])([#b]?)$/.exec(name.trim());
  if (!match || (scale !== "major" && scale !== "minor")) return null;
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return { tonic: (LETTER_TONICS[match[1]] + accidental + 12) % 12, mode: scale as Mode };
}

/** An estimated tempo as the Estimate shows it: a whole BPM when it's that close, else one decimal. */
export function estimateTempo(tempo: number): number | null {
  if (!(tempo > 0)) return null;
  const whole = Math.round(tempo);
  return Math.abs(tempo - whole) <= WHOLE_TEMPO_SNAP ? whole : Math.round(tempo * 10) / 10;
}

/**
 * Puts an Estimate into the Original Key and Tempo, except values you've corrected. Targets follow
 * the same rules as when you change the Original yourself (withOriginalKey / withOriginalTempo).
 */
export function applyEstimate(settings: KeyTempoSettings, corrections: Corrections, estimate: Estimate): KeyTempoSettings {
  let next = settings;
  if (!corrections.key && estimate.key && !sameKey(estimate.key, next.original.key)) next = withOriginalKey(next, estimate.key);
  if (!corrections.tempo && estimate.tempo && estimate.tempo !== next.original.tempo) {
    next = withOriginalTempo(next, estimate.tempo);
  }
  return next;
}

export function isTooShortForEstimate(region: Region): boolean {
  return region.end - region.start < MIN_ESTIMATE_SECONDS;
}
