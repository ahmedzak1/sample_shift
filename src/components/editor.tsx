"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatRegionTime,
  moveRegionEdge,
  normalizeRegion,
  parseRegionTime,
  NO_KEY_TEMPO_CHANGE,
  planSample,
  type KeyTempoSettings,
  type Region,
  type RegionEdge,
} from "@/audio/sample-plan";
import { renderInWorker } from "@/audio/render-in-worker";
import type { SourceTrack } from "@/tracks/source-track";
import { KeyTempoControls } from "./key-tempo-controls";
import { Waveform, type WaveformView } from "./waveform";

interface LoadedTrack {
  track: SourceTrack;
  buffer: AudioBuffer;
  context: AudioContext;
}

/** What's playing: where in the Source Track it started, and when (in context time). */
interface Playback {
  node: AudioBufferSourceNode;
  offset: number;
  startedAt: number;
  /** The bounds playback repeats within, or null when it plays through once. */
  loopBounds: Region | null;
}

/** The shortest stretch of the Source Track the waveform can zoom to, in seconds. */
const MIN_VIEW_SECONDS = 0.25;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Quick fetches (cache hits) finish before the counter would appear. */
const SHOW_ELAPSED_AFTER_SECONDS = 2;

/** A status line with a spinner and a seconds counter, since a first fetch can take half a minute. */
function FetchProgress({ message }: { message: string }) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.floor((now - startedAt) / 1000);
  return (
    <p className="status" role="status">
      <span className="spinner" aria-hidden="true" />
      {message}
      {seconds >= SHOW_ELAPSED_AFTER_SECONDS && <span className="elapsed"> {seconds}s</span>}
    </p>
  );
}

interface RegionTimeInputProps {
  label: string;
  value: number;
  /** Applies a typed time; returns false to refuse it, which puts the field back. */
  onCommit: (seconds: number) => boolean;
}

function RegionTimeInput({ label, value, onCommit }: RegionTimeInputProps) {
  const [text, setText] = useState(formatRegionTime(value));
  useEffect(() => setText(formatRegionTime(value)), [value]);
  const commit = () => {
    const t = parseRegionTime(text);
    if (t === null || !onCommit(t)) setText(formatRegionTime(value));
  };
  return (
    <label className="time-field">
      {label}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        inputMode="decimal"
        spellCheck={false}
      />
    </label>
  );
}

export function Editor() {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedTrack | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [keyTempo, setKeyTempo] = useState<KeyTempoSettings>(NO_KEY_TEMPO_CHANGE);
  /** Export progress from 0 to 1, or null when no export is running. */
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [view, setView] = useState<WaveformView>({ start: 0, duration: 1 });
  const [looping, setLooping] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const playback = useRef<Playback | null>(null);
  /** Where playback resumes from when nothing is playing. */
  const cursor = useRef(0);
  const animationFrame = useRef(0);

  useEffect(() => () => {
    cancelAnimationFrame(animationFrame.current);
    loaded?.context.close();
  }, [loaded]);

  async function fetchTrack(event: React.FormEvent) {
    event.preventDefault();
    stop();
    setError(null);
    setStatus("Fetching audio from YouTube…");
    try {
      const response = await fetch("/api/tracks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: link }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Fetching from YouTube failed.");
      const track = body as SourceTrack;

      setStatus("Decoding audio…");
      const audio = await (await fetch(track.audioUrl)).arrayBuffer();
      // Decode at the Source Track's own rate so the export keeps it.
      const context = new AudioContext({ sampleRate: track.sampleRate });
      const buffer = await context.decodeAudioData(audio);
      cursor.current = 0;
      setRegion(null);
      setKeyTempo(NO_KEY_TEMPO_CHANGE);
      setView({ start: 0, duration: buffer.duration });
      setPlayhead(null);
      setLoaded({ track, buffer, context });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStatus(null);
    }
  }

  /** Current position of what's playing, wrapping inside the loop bounds. */
  function position(p: Playback, now: number): number {
    const t = p.offset + (now - p.startedAt);
    if (!p.loopBounds) return t;
    const length = p.loopBounds.end - p.loopBounds.start;
    return t < p.loopBounds.end ? t : p.loopBounds.start + ((t - p.loopBounds.start) % length);
  }

  function tick() {
    const p = playback.current;
    if (!p || !loaded) return;
    setPlayhead(position(p, loaded.context.currentTime));
    animationFrame.current = requestAnimationFrame(tick);
  }

  function play(from: number = cursor.current, repeat: boolean = looping) {
    if (!loaded) return;
    stop();
    const { context, buffer } = loaded;
    void context.resume();
    const bounds = region ?? { start: 0, end: buffer.duration };
    const offset = from >= bounds.start && from < bounds.end ? from : bounds.start;

    const node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(context.destination);
    const loopBounds = repeat ? bounds : null;
    if (loopBounds) {
      node.loop = true;
      node.loopStart = loopBounds.start;
      node.loopEnd = loopBounds.end;
      node.start(0, offset);
    } else {
      node.start(0, offset, bounds.end - offset);
    }
    node.onended = () => {
      if (playback.current?.node !== node) return;
      playback.current = null;
      cursor.current = bounds.start;
      cancelAnimationFrame(animationFrame.current);
      setPlaying(false);
      setPlayhead(null);
    };
    playback.current = { node, offset, startedAt: context.currentTime, loopBounds };
    setPlaying(true);
    animationFrame.current = requestAnimationFrame(tick);
  }

  function pause() {
    const p = playback.current;
    if (!loaded || !p) return;
    cursor.current = position(p, loaded.context.currentTime);
    stop();
    setPlayhead(cursor.current);
  }

  function stop() {
    const p = playback.current;
    playback.current = null;
    p?.node.stop();
    cancelAnimationFrame(animationFrame.current);
    setPlaying(false);
  }

  function seek(t: number) {
    cursor.current = t;
    setPlayhead(t);
    if (playback.current) play(t);
  }

  function changeRegion(next: Region | null) {
    if (playback.current) stop();
    setRegion(next);
    if (next) {
      cursor.current = next.start;
      setPlayhead(next.start);
    }
  }

  function onRegionDrag(next: Region, done: boolean) {
    if (!loaded) return;
    if (!done) {
      if (playback.current) stop();
      setRegion(next);
      return;
    }
    changeRegion(normalizeRegion(next, loaded.buffer.duration));
  }

  function setRegionEdge(edge: RegionEdge, t: number): boolean {
    if (!loaded) return false;
    const next = moveRegionEdge(region, edge, t, loaded.buffer.duration);
    if (next) changeRegion(next);
    return next !== null;
  }

  function toggleLoop() {
    const next = !looping;
    setLooping(next);
    if (playback.current && loaded) play(position(playback.current, loaded.context.currentTime), next);
  }

  function zoom(factor: number) {
    if (!loaded) return;
    const total = loaded.buffer.duration;
    setView((current) => {
      const duration = Math.min(total, Math.max(Math.min(MIN_VIEW_SECONDS, total), current.duration / factor));
      // Zoom around the middle of what's on screen, so zooming never jumps elsewhere in the track.
      const focus = current.start + current.duration / 2;
      return { start: Math.min(total - duration, Math.max(0, focus - duration / 2)), duration };
    });
  }

  function zoomToRegion() {
    if (!loaded || !region) return;
    const total = loaded.buffer.duration;
    const pad = (region.end - region.start) * 0.1;
    const start = Math.max(0, region.start - pad);
    const duration = Math.min(total - start, Math.max(MIN_VIEW_SECONDS, region.end - region.start + 2 * pad));
    setView({ start, duration });
  }

  const plan = loaded
    ? planSample({
        source: { title: loaded.track.title, durationSeconds: loaded.buffer.duration },
        region,
        ...keyTempo,
      })
    : null;

  async function download() {
    if (!loaded || !plan || exportProgress !== null) return;
    setExportError(null);
    setExportProgress(0);
    try {
      const wav = await renderInWorker(loaded.buffer, plan, setExportProgress);
      const url = URL.createObjectURL(new Blob([wav as BlobPart], { type: "audio/wav" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = plan.filename;
      a.click();
      // Revoking straight after click() can cancel the download in Firefox and Safari.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    } finally {
      setExportProgress(null);
    }
  }

  const total = loaded?.buffer.duration ?? 0;
  const zoomed = loaded !== null && view.duration < total;

  return (
    <>
      <form onSubmit={fetchTrack}>
        {/* Plain text, not type="url": links without https:// (e.g. youtu.be/…) are fine. */}
        <input
          type="text"
          inputMode="url"
          required
          placeholder="Paste a YouTube link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          aria-label="YouTube link"
          disabled={status !== null}
          spellCheck={false}
          autoComplete="off"
        />
        <button type="submit" className="primary" disabled={status !== null}>
          Fetch
        </button>
      </form>
      {status && <FetchProgress message={status} />}
      {error && <p className="error" role="alert">{error}</p>}

      {loaded && (
        <section className="track">
          <h2>{loaded.track.title}</h2>
          <p className="meta">
            {formatDuration(total)} · {loaded.buffer.sampleRate / 1000} kHz ·{" "}
            {loaded.buffer.numberOfChannels === 1 ? "mono" : "stereo"}
          </p>

          <Waveform
            buffer={loaded.buffer}
            view={view}
            region={region}
            playhead={playhead}
            onRegionChange={onRegionDrag}
            onSeek={seek}
          />
          <div className="zoom">
            <button type="button" onClick={() => zoom(2)} disabled={view.duration <= MIN_VIEW_SECONDS} aria-label="Zoom in">
              +
            </button>
            <button type="button" onClick={() => zoom(0.5)} disabled={!zoomed} aria-label="Zoom out">
              −
            </button>
            <button type="button" onClick={zoomToRegion} disabled={!region}>
              Zoom to Region
            </button>
            {zoomed && (
              <input
                type="range"
                aria-label="Scroll waveform"
                min={0}
                max={total - view.duration}
                step="any"
                value={view.start}
                onChange={(e) => setView({ ...view, start: Number(e.target.value) })}
              />
            )}
          </div>

          <div className="region">
            <RegionTimeInput label="Start" value={region?.start ?? 0} onCommit={(t) => setRegionEdge("start", t)} />
            <RegionTimeInput label="End" value={region?.end ?? total} onCommit={(t) => setRegionEdge("end", t)} />
            {region ? (
              <>
                <span className="meta">Length {formatRegionTime(region.end - region.start)}</span>
                <button type="button" onClick={() => changeRegion(null)}>
                  Clear Region
                </button>
              </>
            ) : (
              <span className="meta">No Region yet — drag on the waveform or type a time. The whole Source Track is the Sample.</span>
            )}
          </div>

          {plan && (
            <KeyTempoControls settings={keyTempo} onChange={setKeyTempo} plan={plan} />
          )}

          <div className="controls">
            <button type="button" onClick={playing ? pause : () => play()}>
              {playing ? "Pause" : region ? "Play Region" : "Play"}
            </button>
            <label className="toggle">
              <input type="checkbox" checked={looping} onChange={toggleLoop} />
              Loop
            </label>
            <button type="button" className="primary" onClick={download} disabled={exportProgress !== null}>
              {exportProgress === null ? "Download Sample" : `Rendering… ${Math.round(exportProgress * 100)}%`}
            </button>
          </div>
          {exportProgress !== null && (
            <progress className="export-progress" value={exportProgress} max={1} aria-label="Export progress" />
          )}
          {plan && <p className="meta filename">Saves as {plan.filename}</p>}
          {exportError && (
            <p className="error" role="alert">
              {exportError}
            </p>
          )}
        </section>
      )}
    </>
  );
}
