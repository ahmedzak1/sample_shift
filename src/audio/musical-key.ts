export type Mode = "major" | "minor";

/** A key: its tonic as a pitch class (0 = C … 11 = B) and its mode. */
export interface MusicalKey {
  tonic: number;
  mode: Mode;
}

/** Whether two keys (either possibly not set) are the same key. */
export function sameKey(a: MusicalKey | null, b: MusicalKey | null): boolean {
  return a?.tonic === b?.tonic && a?.mode === b?.mode;
}

/** Tonic spellings per mode, as usually written (Bb major, but G# minor). */
const TONIC_NAMES: Record<Mode, string[]> = {
  major: ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
  minor: ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"],
};

/** A key's name, e.g. "A minor". */
export function keyName(key: MusicalKey): string {
  return `${TONIC_NAMES[key.mode][key.tonic]} ${key.mode}`;
}

/** A key's short name, e.g. "Am" or "Bb". */
export function shortKeyName(key: MusicalKey): string {
  return TONIC_NAMES[key.mode][key.tonic] + (key.mode === "minor" ? "m" : "");
}

/** The key with the same notes in the other mode (C major ↔ A minor). */
function relativeKey(key: MusicalKey): MusicalKey {
  return key.mode === "major"
    ? { tonic: (key.tonic + 9) % 12, mode: "minor" }
    : { tonic: (key.tonic + 3) % 12, mode: "major" };
}

export interface TargetKeyOption {
  key: MusicalKey;
  label: string;
  /** The relative key's name, so a minor Sample can be matched against a major track and vice versa. */
  relative: string;
}

/** The twelve keys in a mode, from C up. */
export function keysInMode(mode: Mode): MusicalKey[] {
  return [...Array(12).keys()].map((tonic) => ({ tonic, mode }));
}

/** The Target Keys on offer: all twelve in the Original Key's mode, each with its relative key. */
export function targetKeyOptions(original: MusicalKey): TargetKeyOption[] {
  return keysInMode(original.mode).map((key) => ({ key, label: keyName(key), relative: keyName(relativeKey(key)) }));
}

/**
 * The Pitch Shift in semitones from the Original Key to the Target Key: the smaller of the two
 * possible moves, going down at a tritone, then moved by `octaveOffset` whole octaves.
 */
export function pitchShift(original: MusicalKey, target: MusicalKey, octaveOffset = 0): number {
  const up = (((target.tonic - original.tonic) % 12) + 12) % 12; // 0…11
  const smaller = up >= 6 ? up - 12 : up; // -6…5
  return smaller + 12 * octaveOffset;
}
