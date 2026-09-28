import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { SourceTrack } from "@/tracks/source-track";
import { FetchFailure, type Fetcher, type FetchFailureKind } from "./fetcher";
import { parseVideoId, VIDEO_ID } from "./youtube-link";

export interface TracksApiDeps {
  fetcher: Fetcher;
  cacheDir: string;
}

/** What the cache stores per Source Track, next to its audio file. */
interface TrackMeta {
  id: string;
  title: string;
  durationSeconds: number;
  sampleRate: number;
  /** Audio file name inside the track's cache directory. */
  audioFile: string;
  fetchedAt: string;
}

const AUDIO_TYPES: Record<string, string> = {
  ".flac": "audio/flac",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
  ".opus": "audio/ogg",
};

/** Error codes the browser can tell apart; `error` is the plain-language message to show. */
export type TracksErrorCode =
  | "not-youtube"
  | "invalid-id"
  | "not-cached"
  | Exclude<FetchFailureKind, "failed">
  | "fetch-failed";

function jsonError(status: number, code: TracksErrorCode, message: string): Response {
  return Response.json({ code, error: message }, { status });
}

const NOT_YOUTUBE_MESSAGE =
  "That isn't a YouTube video link. Paste a link like https://www.youtube.com/watch?v=… or https://youtu.be/…";

const FAILURE_RESPONSES: Record<
  FetchFailureKind,
  { status: number; code: TracksErrorCode; message: (failure: FetchFailure) => string }
> = {
  private: { status: 403, code: "private", message: () => "This video is private, so it can't be fetched." },
  "age-restricted": {
    status: 403,
    code: "age-restricted",
    message: () => "This video is age-restricted, and YouTube won't hand it over without signing in.",
  },
  "region-blocked": { status: 451, code: "region-blocked", message: () => "This video isn't available in your country." },
  unavailable: {
    status: 404,
    code: "unavailable",
    message: () => "This video is unavailable. It may have been deleted, or the link is wrong.",
  },
  "tool-missing": {
    status: 503,
    code: "tool-missing",
    message: (f) => `${f.toolName ?? "A required tool"} isn't installed or can't be found. Install it, then restart Sample Shift.`,
  },
  timeout: { status: 504, code: "timeout", message: () => "Fetching took too long and was stopped. Try again in a moment." },
  failed: { status: 502, code: "fetch-failed", message: (f) => `Fetching from YouTube failed: ${f.detail}` },
};

/** Turns anything a fetch threw into a plain-language error response. */
function fetchFailureResponse(error: unknown): Response {
  const failure =
    error instanceof FetchFailure
      ? error
      : new FetchFailure("failed", error instanceof Error ? error.message : String(error));
  const { status, code, message } = FAILURE_RESPONSES[failure.kind];
  return jsonError(status, code, message(failure));
}

export function createTracksApi({ fetcher, cacheDir }: TracksApiDeps) {
  const trackDir = (id: string) => path.join(cacheDir, id);

  /** A cached Source Track's metadata, or null unless both its metadata and audio file are present. */
  async function readMeta(id: string): Promise<TrackMeta | null> {
    try {
      const meta: TrackMeta = JSON.parse(await readFile(path.join(trackDir(id), "meta.json"), "utf8"));
      await stat(path.join(trackDir(id), meta.audioFile));
      return meta;
    } catch {
      return null;
    }
  }

  /** Fetches into a scratch directory, then renames it into place so the cache never holds a half-written track. */
  async function fetchIntoCache(id: string): Promise<TrackMeta> {
    const partialDir = path.join(cacheDir, `${id}.partial-${process.pid}-${Date.now()}`);
    await mkdir(partialDir, { recursive: true });
    try {
      const fetched = await fetcher.fetch(id, partialDir);
      const meta: TrackMeta = {
        id,
        title: fetched.title,
        durationSeconds: fetched.durationSeconds,
        sampleRate: fetched.sampleRate,
        audioFile: path.basename(fetched.audioFile),
        fetchedAt: new Date().toISOString(),
      };
      await writeFile(path.join(partialDir, "meta.json"), JSON.stringify(meta, null, 2));
      // Clear out an incomplete entry (e.g. its audio file was deleted) so the rename can land.
      await rm(trackDir(id), { recursive: true, force: true });
      await rename(partialDir, trackDir(id));
      return meta;
    } catch (error) {
      await rm(partialDir, { recursive: true, force: true });
      // A concurrent fetch of the same track may have won the rename.
      const existing = await readMeta(id);
      if (existing) return existing;
      throw error;
    }
  }

  return {
    async createTrack(request: Request): Promise<Response> {
      const body = await request.json().catch(() => null);
      const id = parseVideoId(body?.url);
      if (!id) return jsonError(400, "not-youtube", NOT_YOUTUBE_MESSAGE);

      let meta: TrackMeta;
      try {
        meta = (await readMeta(id)) ?? (await fetchIntoCache(id));
      } catch (error) {
        return fetchFailureResponse(error);
      }

      return Response.json({
        id: meta.id,
        title: meta.title,
        durationSeconds: meta.durationSeconds,
        sampleRate: meta.sampleRate,
        audioUrl: `/api/tracks/${meta.id}/audio`,
      } satisfies SourceTrack);
    },

    async getAudio(id: string): Promise<Response> {
      if (!VIDEO_ID.test(id)) return jsonError(400, "invalid-id", "Invalid track id.");
      const meta = await readMeta(id);
      if (!meta) return jsonError(404, "not-cached", "No cached Source Track with that id.");

      const file = path.join(trackDir(id), meta.audioFile);
      const { size } = await stat(file);
      const body = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
      return new Response(body, {
        headers: {
          "content-type": AUDIO_TYPES[path.extname(file)] ?? "application/octet-stream",
          "content-length": String(size),
        },
      });
    },
  };
}
