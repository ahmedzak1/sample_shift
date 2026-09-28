import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { SourceTrack } from "@/tracks/source-track";
import type { Fetcher } from "./fetcher";

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

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const AUDIO_TYPES: Record<string, string> = {
  ".flac": "audio/flac",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
  ".opus": "audio/ogg",
};

function parseVideoId(link: unknown): string | null {
  if (typeof link !== "string") return null;
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const isYouTube = url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com");
  const id = url.searchParams.get("v");
  return isYouTube && id && VIDEO_ID.test(id) ? id : null;
}

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
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
      if (!id) return jsonError(400, "That doesn't look like a YouTube video link.");

      let meta: TrackMeta;
      try {
        meta = (await readMeta(id)) ?? (await fetchIntoCache(id));
      } catch (error) {
        return jsonError(502, error instanceof Error ? error.message : "Fetching from YouTube failed.");
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
      if (!VIDEO_ID.test(id)) return jsonError(400, "Invalid track id.");
      const meta = await readMeta(id);
      if (!meta) return jsonError(404, "No cached Source Track with that id.");

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
