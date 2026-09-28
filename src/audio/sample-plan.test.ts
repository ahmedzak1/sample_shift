import { describe, expect, it } from "vitest";
import { formatRegionTime, moveRegionEdge, parseRegionTime, planSample } from "./sample-plan";

describe("moveRegionEdge", () => {
  it("moves one edge of the Region to a typed time", () => {
    expect(moveRegionEdge({ start: 5, end: 10 }, "start", 7.5, 19)).toEqual({ start: 7.5, end: 10 });
    expect(moveRegionEdge({ start: 5, end: 10 }, "end", 30, 19)).toEqual({ start: 5, end: 19 });
  });

  it("creates a Region from the whole Source Track when there isn't one yet", () => {
    expect(moveRegionEdge(null, "start", 4, 19)).toEqual({ start: 4, end: 19 });
    expect(moveRegionEdge(null, "end", 12, 19)).toEqual({ start: 0, end: 12 });
  });

  it("refuses a time that would put the edges out of order or make the Region empty", () => {
    expect(moveRegionEdge({ start: 5, end: 10 }, "start", 10, 19)).toBeNull();
    expect(moveRegionEdge({ start: 5, end: 10 }, "end", 2, 19)).toBeNull();
  });
});

describe("Region times", () => {
  it("reads typed times as minutes:seconds or plain seconds", () => {
    expect(parseRegionTime("1:12.5")).toBe(72.5);
    expect(parseRegionTime(" 0:03 ")).toBe(3);
    expect(parseRegionTime("72.25")).toBe(72.25);
    expect(parseRegionTime("12:00:00")).toBeNull();
    expect(parseRegionTime("1:75")).toBeNull();
    expect(parseRegionTime("abc")).toBeNull();
    expect(parseRegionTime("")).toBeNull();
  });

  it("shows times as minutes:seconds to the millisecond", () => {
    expect(formatRegionTime(72.5)).toBe("1:12.500");
    expect(formatRegionTime(3)).toBe("0:03.000");
    expect(formatRegionTime(599.9996)).toBe("10:00.000");
  });
});

const zoo = { title: "Me at the zoo", durationSeconds: 19 };

describe("planSample", () => {
  it("makes the whole Source Track the Sample when there is no Region", () => {
    const plan = planSample({ source: zoo, region: null });

    expect(plan.region).toEqual({ start: 0, end: 19 });
    expect(plan.filename).toBe("Me at the zoo.wav");
  });

  it("names a Region's Sample after its start and end", () => {
    const song = { title: "Amen Brother", durationSeconds: 300 };

    expect(planSample({ source: song, region: { start: 72, end: 80.5 } }).filename).toBe(
      "Amen Brother - 1m12s-1m20.5s.wav",
    );
    expect(planSample({ source: song, region: { start: 3.25, end: 125.125 } }).filename).toBe(
      "Amen Brother - 0m03.25s-2m05.125s.wav",
    );
  });

  it("removes characters from the title that filenames can't contain", () => {
    const named = (title: string) => planSample({ source: { title, durationSeconds: 10 }, region: null }).filename;

    expect(named('AC/DC: "Back In Black" | Live?')).toBe("ACDC Back In Black Live.wav");
    expect(named("Intro...")).toBe("Intro.wav");
    expect(named("tab\there")).toBe("tab here.wav");
    expect(named("???")).toBe("Sample.wav");
  });

  it("keeps a Region inside its Source Track and puts its edges in order", () => {
    const song = { title: "Song", durationSeconds: 60 };

    expect(planSample({ source: song, region: { start: 20, end: 10 } }).region).toEqual({ start: 10, end: 20 });
    expect(planSample({ source: song, region: { start: -5, end: 90 } }).region).toEqual({ start: 0, end: 60 });
  });

  it("treats an empty Region as no Region", () => {
    const song = { title: "Song", durationSeconds: 60 };

    expect(planSample({ source: song, region: { start: 12, end: 12 } })).toEqual({
      region: { start: 0, end: 60 },
      filename: "Song.wav",
    });
  });
});
