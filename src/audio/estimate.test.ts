import { describe, expect, it } from "vitest";
import { applyEstimate, estimateTempo, isTooShortForEstimate, parseEstimatedKey } from "./estimate";
import { NO_KEY_TEMPO_CHANGE, type KeyTempoSettings } from "./sample-plan";

const aMinor = { tonic: 9, mode: "minor" as const };
const dMinor = { tonic: 2, mode: "minor" as const };
const eMinor = { tonic: 4, mode: "minor" as const };
const cMajor = { tonic: 0, mode: "major" as const };
const noCorrections = { key: false, tempo: false };

describe("parseEstimatedKey", () => {
  it("reads sharps and flats", () => {
    expect(parseEstimatedKey("A", "minor")).toEqual(aMinor);
    expect(parseEstimatedKey("C#", "minor")).toEqual({ tonic: 1, mode: "minor" });
    expect(parseEstimatedKey("Bb", "major")).toEqual({ tonic: 10, mode: "major" });
    expect(parseEstimatedKey("Ab", "major")).toEqual({ tonic: 8, mode: "major" });
  });

  it("gives up on anything it can't read", () => {
    expect(parseEstimatedKey("H", "minor")).toBeNull();
    expect(parseEstimatedKey("A", "dorian")).toBeNull();
  });
});

describe("estimateTempo", () => {
  it("snaps to a whole BPM when the estimate is that close", () => {
    expect(estimateTempo(99.93)).toBe(100);
    expect(estimateTempo(127.88)).toBe(128);
  });

  it("keeps one decimal otherwise", () => {
    expect(estimateTempo(92.47)).toBe(92.5);
  });

  it("has no tempo for a non-positive estimate", () => {
    expect(estimateTempo(0)).toBeNull();
  });
});

describe("applyEstimate", () => {
  it("fills in the Original Key and Tempo, and starts the targets there", () => {
    const next = applyEstimate(NO_KEY_TEMPO_CHANGE, noCorrections, { key: aMinor, tempo: 100 });

    expect(next.original).toEqual({ key: aMinor, tempo: 100 });
    expect(next.target).toEqual({ key: aMinor, tempo: 100 });
  });

  it("keeps targets you've chosen, moving ones you haven't touched", () => {
    const before: KeyTempoSettings = {
      original: { key: aMinor, tempo: 100 },
      target: { key: dMinor, tempo: 100 },
      octaveOffset: 1,
    };

    const next = applyEstimate(before, noCorrections, { key: eMinor, tempo: 120 });

    expect(next.original).toEqual({ key: eMinor, tempo: 120 });
    expect(next.target).toEqual({ key: dMinor, tempo: 120 }); // chosen key kept; untouched tempo moved
    expect(next.octaveOffset).toBe(1);
  });

  it("never overwrites your corrections", () => {
    const before: KeyTempoSettings = {
      original: { key: aMinor, tempo: 50 },
      target: { key: aMinor, tempo: 50 },
      octaveOffset: 0,
    };

    const next = applyEstimate(before, { key: true, tempo: true }, { key: eMinor, tempo: 100 });

    expect(next).toEqual(before);
  });

  it("resets the Target Key when the estimated mode changes", () => {
    const before: KeyTempoSettings = {
      original: { key: aMinor, tempo: null },
      target: { key: dMinor, tempo: null },
      octaveOffset: -1,
    };

    const next = applyEstimate(before, noCorrections, { key: cMajor, tempo: null });

    expect(next.original.key).toEqual(cMajor);
    expect(next.target.key).toEqual(cMajor);
    expect(next.octaveOffset).toBe(0);
  });

  it("leaves a value alone when the Estimate has nothing for it", () => {
    const before: KeyTempoSettings = { original: { key: aMinor, tempo: 100 }, target: { key: aMinor, tempo: 100 }, octaveOffset: 0 };

    expect(applyEstimate(before, noCorrections, { key: null, tempo: null })).toEqual(before);
  });
});

describe("isTooShortForEstimate", () => {
  it("warns about Regions shorter than 4 seconds", () => {
    expect(isTooShortForEstimate({ start: 10, end: 13.5 })).toBe(true);
    expect(isTooShortForEstimate({ start: 10, end: 14 })).toBe(false);
  });
});
