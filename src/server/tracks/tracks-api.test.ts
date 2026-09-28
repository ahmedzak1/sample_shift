import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Fetcher } from "./fetcher";
import { createTracksApi } from "./tracks-api";

const AUDIO_BYTES = new Uint8Array([1, 2, 3, 4, 5]);

function fakeFetcher() {
  const calls: string[] = [];
  const fetcher: Fetcher = {
    async fetch(videoId, outDir) {
      calls.push(videoId);
      const audioFile = path.join(outDir, "audio.flac");
      await writeFile(audioFile, AUDIO_BYTES);
      return { title: "Me at the zoo", durationSeconds: 19, sampleRate: 48000, audioFile };
    },
  };
  return { fetcher, calls };
}

function postTrack(url: string): Request {
  return new Request("http://localhost/api/tracks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

describe("Tracks API", () => {
  let cacheDir: string;

  beforeEach(async () => {
    cacheDir = await mkdtemp(path.join(tmpdir(), "sample-shift-cache-"));
  });

  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("fetches a Source Track from a YouTube link on a cache miss", async () => {
    const { fetcher, calls } = fakeFetcher();
    const api = createTracksApi({ fetcher, cacheDir });

    const response = await api.createTrack(postTrack("https://www.youtube.com/watch?v=jNQXAC9IVRw"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: "jNQXAC9IVRw",
      title: "Me at the zoo",
      durationSeconds: 19,
      sampleRate: 48000,
      audioUrl: "/api/tracks/jNQXAC9IVRw/audio",
    });
    expect(calls).toEqual(["jNQXAC9IVRw"]);
  });

  it("serves a previously fetched Source Track from the on-disk cache without fetching again", async () => {
    const first = fakeFetcher();
    await createTracksApi({ fetcher: first.fetcher, cacheDir }).createTrack(
      postTrack("https://www.youtube.com/watch?v=jNQXAC9IVRw"),
    );

    const second = fakeFetcher();
    const response = await createTracksApi({ fetcher: second.fetcher, cacheDir }).createTrack(
      postTrack("https://www.youtube.com/watch?v=jNQXAC9IVRw"),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).title).toBe("Me at the zoo");
    expect(second.calls).toEqual([]);
  });

  it("fetches again when a cached Source Track's audio file has gone missing", async () => {
    const first = fakeFetcher();
    await createTracksApi({ fetcher: first.fetcher, cacheDir }).createTrack(
      postTrack("https://www.youtube.com/watch?v=jNQXAC9IVRw"),
    );
    await rm(path.join(cacheDir, "jNQXAC9IVRw", "audio.flac"));

    const second = fakeFetcher();
    const api = createTracksApi({ fetcher: second.fetcher, cacheDir });
    const response = await api.createTrack(postTrack("https://www.youtube.com/watch?v=jNQXAC9IVRw"));

    expect(response.status).toBe(200);
    expect(second.calls).toEqual(["jNQXAC9IVRw"]);
    expect(new Uint8Array(await (await api.getAudio("jNQXAC9IVRw")).arrayBuffer())).toEqual(AUDIO_BYTES);
  });

  it("answers 404 for audio of a Source Track that isn't cached", async () => {
    const { fetcher } = fakeFetcher();
    const response = await createTracksApi({ fetcher, cacheDir }).getAudio("jNQXAC9IVRw");

    expect(response.status).toBe(404);
  });

  it("serves the fetched Source Track's audio", async () => {
    const { fetcher } = fakeFetcher();
    const api = createTracksApi({ fetcher, cacheDir });
    await api.createTrack(postTrack("https://www.youtube.com/watch?v=jNQXAC9IVRw"));

    const response = await api.getAudio("jNQXAC9IVRw");

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(AUDIO_BYTES);
  });
});
