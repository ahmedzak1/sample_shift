import { describe, expect, it } from "vitest";
import { keyName, pitchShift, shortKeyName, targetKeyOptions, type MusicalKey } from "./musical-key";

const key = (tonic: number, mode: MusicalKey["mode"] = "minor"): MusicalKey => ({ tonic, mode });
const C = 0, D = 2, E = 4, F = 5, FSharp = 6, G = 7, A = 9, B = 11;

describe("pitchShift", () => {
  it("takes the smaller of the two possible moves", () => {
    expect(pitchShift(key(A), key(D))).toBe(5); // up a fourth, not down a fifth
    expect(pitchShift(key(C, "major"), key(G, "major"))).toBe(-5); // down a fourth, not up a fifth
    expect(pitchShift(key(E), key(F))).toBe(1);
    expect(pitchShift(key(C), key(B))).toBe(-1);
    expect(pitchShift(key(G), key(G))).toBe(0);
  });

  it("goes down at a tritone", () => {
    expect(pitchShift(key(C), key(FSharp))).toBe(-6);
    expect(pitchShift(key(FSharp), key(C))).toBe(-6);
  });

  it("moves the Pitch Shift by whole octaves", () => {
    expect(pitchShift(key(A), key(D), 1)).toBe(17);
    expect(pitchShift(key(A), key(D), -1)).toBe(-7);
    expect(pitchShift(key(C), key(FSharp), 1)).toBe(6);
  });
});

describe("key names", () => {
  it("spells keys the way musicians usually do", () => {
    expect([...Array(12).keys()].map((t) => shortKeyName(key(t, "major")))).toEqual(
      ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
    );
    expect([...Array(12).keys()].map((t) => shortKeyName(key(t, "minor")))).toEqual(
      ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"],
    );
  });

  it("writes the full name with the mode", () => {
    expect(keyName(key(A, "minor"))).toBe("A minor");
    expect(keyName(key(FSharp, "major"))).toBe("F# major");
  });
});

describe("targetKeyOptions", () => {
  it("offers the twelve keys in the Original Key's mode, each with its relative key", () => {
    const options = targetKeyOptions(key(A, "minor"));

    expect(options).toHaveLength(12);
    expect(options.every((o) => o.key.mode === "minor")).toBe(true);
    expect(options[9]).toEqual({ key: key(A, "minor"), label: "A minor", relative: "C major" });
    expect(options[4]).toEqual({ key: key(E, "minor"), label: "E minor", relative: "G major" });
  });

  it("gives major keys their relative minor", () => {
    expect(targetKeyOptions(key(C, "major"))[0]).toEqual({ key: key(C, "major"), label: "C major", relative: "A minor" });
    expect(targetKeyOptions(key(C, "major"))[5].relative).toBe("D minor"); // F major
  });
});
