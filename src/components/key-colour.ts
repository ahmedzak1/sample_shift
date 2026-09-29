import type { MusicalKey } from "@/audio/musical-key";

/**
 * Every tonic owns a hue, evenly spaced around the key wheel (C at the top, a semitone per 30°),
 * so the Target Key's colour tells you where it sits on the wheel.
 */
const C_HUE = 20;

export function tonicHue(tonic: number): number {
  return C_HUE + tonic * 30;
}

export type KeyTone = "fill" | "tint" | "wash" | "strong";

const TONES: Record<KeyTone, [lightness: number, chroma: number]> = {
  fill: [0.74, 0.15],
  tint: [0.87, 0.08],
  wash: [0.95, 0.035],
  strong: [0.52, 0.16],
};

/** A key's colour as a CSS colour, e.g. for canvas drawing where CSS variables can't reach. */
export function hueColour(hue: number, tone: KeyTone, alpha = 1): string {
  const [l, c] = TONES[tone];
  return `oklch(${l} ${c} ${hue}${alpha < 1 ? ` / ${alpha}` : ""})`;
}

/**
 * The hue the editor is tinted with: the Target Key's, reached by turning from the Original Key
 * the way the Pitch Shift goes, so a hue transition sweeps the same way as the wheel's arc.
 * Null when there's no key change to show.
 */
export function editorHue(original: MusicalKey | null, pitchShiftWithinOctave: number): number | null {
  return original ? tonicHue(original.tonic) + pitchShiftWithinOctave * 30 : null;
}
