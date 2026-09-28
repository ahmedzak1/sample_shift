import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FetchFailure, type Fetcher } from "./fetcher";
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

  it.each([
    "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "https://youtube.com/watch?v=jNQXAC9IVRw&t=42s",
    "https://www.youtube.com/watch?v=jNQXAC9IVRw&list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI&index=3",
    "https://www.youtube.com/watch?feature=share&v=jNQXAC9IVRw",
    "https://m.youtube.com/watch?v=jNQXAC9IVRw",
    "https://music.youtube.com/watch?v=jNQXAC9IVRw&si=abc",
    "https://youtu.be/jNQXAC9IVRw",
    "https://youtu.be/jNQXAC9IVRw?t=10&si=xyz",
    "https://www.youtube.com/shorts/jNQXAC9IVRw",
    "https://www.youtube.com/embed/jNQXAC9IVRw?start=5",
    "https://www.youtube.com/live/jNQXAC9IVRw",
    "www.youtube.com/watch?v=jNQXAC9IVRw",
    "  youtu.be/jNQXAC9IVRw  ",
  ])("resolves the YouTube link %s to its video", async (link) => {
    const { fetcher, calls } = fakeFetcher();

    const response = await createTracksApi({ fetcher, cacheDir }).createTrack(postTrack(link));

    expect(response.status).toBe(200);
    expect(calls).toEqual(["jNQXAC9IVRw"]);
  });

  it.each([
    "https://vimeo.com/76979871",
    "https://notyoutube.com/watch?v=jNQXAC9IVRw",
    "https://youtube.com.evil.example/watch?v=jNQXAC9IVRw",
    "https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI",
    "https://www.youtube.com/watch?v=tooShort",
    "hello",
  ])("rejects %s as not a YouTube video link, without fetching", async (link) => {
    const { fetcher, calls } = fakeFetcher();

    const response = await createTracksApi({ fetcher, cacheDir }).createTrack(postTrack(link));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: "not-youtube",
      error: "That isn't a YouTube video link. Paste a link like https://www.youtube.com/watch?v=… or https://youtu.be/…",
    });
    expect(calls).toEqual([]);
  });

  it.each([
    [new FetchFailure("private", "Private video"), 403, "private", "This video is private, so it can't be fetched."],
    [
      new FetchFailure("age-restricted", "Sign in to confirm your age"),
      403,
      "age-restricted",
      "This video is age-restricted, and YouTube won't hand it over without signing in.",
    ],
    [
      new FetchFailure("region-blocked", "not available in your country"),
      451,
      "region-blocked",
      "This video isn't available in your country.",
    ],
    [
      new FetchFailure("unavailable", "This video is unavailable"),
      404,
      "unavailable",
      "This video is unavailable. It may have been deleted, or the link is wrong.",
    ],
    [
      new FetchFailure("tool-missing", "No module named yt_dlp", "yt-dlp"),
      503,
      "tool-missing",
      "yt-dlp isn't installed or can't be found. Install it, then restart Sample Shift.",
    ],
    [
      new FetchFailure("tool-missing", "ffprobe and ffmpeg not found", "ffmpeg"),
      503,
      "tool-missing",
      "ffmpeg isn't installed or can't be found. Install it, then restart Sample Shift.",
    ],
    [
      new FetchFailure("timeout", "timed out after 300s"),
      504,
      "timeout",
      "Fetching took too long and was stopped. Try again in a moment.",
    ],
    [
      new FetchFailure("failed", "HTTP Error 429: Too Many Requests"),
      502,
      "fetch-failed",
      "Fetching from YouTube failed: HTTP Error 429: Too Many Requests",
    ],
  ] as const)("explains a %s fetch failure in plain language", async (failure, status, code, message) => {
    const fetcher: Fetcher = {
      async fetch() {
        throw failure;
      },
    };

    const response = await createTracksApi({ fetcher, cacheDir }).createTrack(
      postTrack("https://www.youtube.com/watch?v=jNQXAC9IVRw"),
    );

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ code, error: message });
  });

  it("does not cache a failed fetch", async () => {
    const failing: Fetcher = {
      async fetch() {
        throw new FetchFailure("timeout", "timed out");
      },
    };
    await createTracksApi({ fetcher: failing, cacheDir }).createTrack(postTrack("https://youtu.be/jNQXAC9IVRw"));

    const { fetcher, calls } = fakeFetcher();
    const response = await createTracksApi({ fetcher, cacheDir }).createTrack(postTrack("https://youtu.be/jNQXAC9IVRw"));

    expect(response.status).toBe(200);
    expect(calls).toEqual(["jNQXAC9IVRw"]);
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
