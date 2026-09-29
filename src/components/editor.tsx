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
import {
  applyEstimate,
  isTooShortForEstimate,
  NO_CORRECTIONS,
  type Corrections,
  type Estimate,
} from "@/audio/estimate";
import { sameKey } from "@/audio/musical-key";
import { estimateInWorker } from "@/audio/estimate-in-worker";
import { PreviewPlayer } from "@/audio/preview-player";
import { renderInWorker } from "@/audio/render-in-worker";
import { changesKeyOrTempo, decodedAudioFrom, regionAudio } from "@/audio/sample-render";
import type { SourceTrack } from "@/tracks/source-track";
import { KeyTempoControls, type EstimateStatus } from "./key-tempo-controls";
import { Waveform, type WaveformView } from "./waveform";

interface LoadedTrack {
  track: SourceTrack;
  buffer: AudioBuffer;
  context: AudioContext;
  /** Plays the Sample with the Target Key and Tempo applied live (or untransformed, for A/B). */
  player: PreviewPlayer;
}

/** A/B: hear the Sample with the Target Key and Tempo, or the untransformed Source Track. */
type Listen = "target" | "source-track";

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
  const [estimateStatus, setEstimateStatus] = useState<EstimateStatus>({ state: "none" });
  /** Original values you've corrected by hand; read from a ref because Estimates finish later. */
  const corrections = useRef<Corrections>(NO_CORRECTIONS);
  /** Increases with every Estimate started, so a late one for an old Region is ignored. */
  const estimateRun = useRef(0);
  /** The whole-Source-Track Estimate, reused when the Region is cleared. */
  const trackEstimate = useRef<Estimate | null>(null);
  /** Export progress from 0 to 1, or null when no export is running. */
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [view, setView] = useState<WaveformView>({ start: 0, duration: 1 });
  // The preview loops the Region by default: that's how a Sample is auditioned.
  const [looping, setLooping] = useState(true);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [listen, setListen] = useState<Listen>("target");

  /** Mirrors `playing` for the player's callbacks, which outlive a render. */
  const playingRef = useRef(false);
  /** Where playback resumes from when nothing is playing, and the latest position while it plays. */
  const cursor = useRef(0);
  /** Start of what's playing, for the player's end callback (created before the Region was chosen). */
  const playingFrom = useRef(0);

  useEffect(() => () => {
    loaded?.player.dispose();
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
      const buffer = await context.decodeAudioData(audio).catch((e) => {
        void context.close();
        throw e;
      });
      setStatus("Starting the audio engine…");
      const player = await PreviewPlayer.create(context, buffer.numberOfChannels, {
        onPosition: (seconds) => {
          if (!playingRef.current) return;
          cursor.current = seconds;
          setPlayhead(seconds);
        },
        onEnded: () => endPlayback(),
        onError: (message) => setError(`Playback failed: ${message}`),
      }).catch((e) => {
        void context.close();
        throw e;
      });
      cursor.current = 0;
      setRegion(null);
      setKeyTempo(NO_KEY_TEMPO_CHANGE);
      corrections.current = NO_CORRECTIONS;
      trackEstimate.current = null;
      setView({ start: 0, duration: buffer.duration });
      setPlayhead(null);
      setLoaded({ track, buffer, context, player });
      void runEstimate(buffer, null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStatus(null);
    }
  }

  /** What plays: the Region, or the whole Source Track without one. */
  function playRegion(): Region {
    return region ?? { start: 0, end: loaded?.buffer.duration ?? 0 };
  }

  function setPlayingState(value: boolean) {
    playingRef.current = value;
    setPlaying(value);
  }

  function play(from: number = cursor.current) {
    if (!loaded) return;
    const { context, buffer, player } = loaded;
    void context.resume();
    const bounds = playRegion();
    const offset = from >= bounds.start && from < bounds.end ? from : bounds.start;
    // Only the Region's audio goes to the audio thread; it's copied again only when the Region changes.
    player.load(bounds, (r) => regionAudio(decodedAudioFrom(buffer), r));
    player.play(offset);
    playingFrom.current = bounds.start;
    cursor.current = offset;
    setPlayhead(offset);
    setPlayingState(true);
  }

  function endPlayback() {
    setPlayingState(false);
    cursor.current = playingFrom.current;
    setPlayhead(null);
  }

  function pause() {
    if (!loaded || !playingRef.current) return;
    loaded.player.stop();
    setPlayingState(false);
    setPlayhead(cursor.current);
  }

  function stop() {
    loaded?.player.stop();
    setPlayingState(false);
  }

  function seek(t: number) {
    cursor.current = t;
    setPlayhead(t);
    if (playingRef.current) play(t);
  }

  function changeRegion(next: Region | null) {
    if (playingRef.current) stop();
    setRegion(next);
    if (next) {
      cursor.current = next.start;
      setPlayhead(next.start);
    }
    if (loaded) void runEstimate(loaded.buffer, next);
  }

  /**
   * Estimates key and tempo for `estimated` (the Region, or the whole Source Track when null,
   * reusing its Estimate once made) and applies it to the Original values you haven't corrected.
   * `discardCorrections` is "New Estimate": your corrections go too, but only once it succeeds.
   */
  async function runEstimate(buffer: AudioBuffer, estimated: Region | null, discardCorrections = false) {
    const run = ++estimateRun.current;
    const scope = estimated ? "Region" : "Source Track";
    const tooShort = estimated !== null && isTooShortForEstimate(estimated);
    setEstimateStatus({ state: "running", scope, tooShort });
    try {
      const estimate =
        !estimated && trackEstimate.current && !discardCorrections
          ? trackEstimate.current
          : await estimateInWorker(buffer, estimated ?? { start: 0, end: buffer.duration });
      if (run !== estimateRun.current) return;
      if (!estimated) trackEstimate.current = estimate;
      if (discardCorrections) corrections.current = NO_CORRECTIONS;
      setKeyTempo((current) => applyEstimate(current, corrections.current, estimate));
      setEstimateStatus({ state: "done", scope, tooShort, estimate });
    } catch (e) {
      if (run !== estimateRun.current) return;
      setEstimateStatus({ state: "failed", scope, message: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Settings changes from the panel; editing an Original value by hand makes it a correction. */
  function changeKeyTempo(next: KeyTempoSettings) {
    const { original } = keyTempo;
    corrections.current = {
      key: corrections.current.key || !sameKey(next.original.key, original.key),
      tempo: corrections.current.tempo || next.original.tempo !== original.tempo,
    };
    setKeyTempo(next);
  }

  function onRegionDrag(next: Region, done: boolean) {
    if (!loaded) return;
    if (!done) {
      if (playingRef.current) stop();
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

  // Loop, A/B and the Target Key and Tempo all apply to what's playing, without restarting it.
  useEffect(() => {
    loaded?.player.setLoop(looping);
  }, [loaded, looping]);


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

  const previewChanges = plan !== null && changesKeyOrTempo(plan);
  const pitchShift = plan?.pitchShift ?? 0;
  const timeRatio = plan?.timeRatio ?? 1;
  useEffect(() => {
    loaded?.player.update({ pitchShift, timeRatio, bypass: listen === "source-track" || !previewChanges });
  }, [loaded, pitchShift, timeRatio, listen, previewChanges]);

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
            <KeyTempoControls
              settings={keyTempo}
              onChange={changeKeyTempo}
              plan={plan}
              estimate={estimateStatus}
              onNewEstimate={() => void runEstimate(loaded.buffer, region, true)}
            />
          )}

          <div className="controls">
            <button type="button" onClick={playing ? pause : () => play()}>
              {playing ? "Pause" : region ? "Play Region" : "Play"}
            </button>
            <label className="toggle">
              <input type="checkbox" checked={looping} onChange={() => setLooping(!looping)} />
              Loop
            </label>
            <span className="listen" role="radiogroup" aria-label="Listen to">
              <button
                type="button"
                role="radio"
                aria-checked={listen === "target" && previewChanges}
                className={listen === "target" && previewChanges ? "on" : ""}
                disabled={!previewChanges}
                onClick={() => setListen("target")}
              >
                Target
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={listen === "source-track" || !previewChanges}
                className={listen === "source-track" || !previewChanges ? "on" : ""}
                disabled={!previewChanges}
                onClick={() => setListen("source-track")}
              >
                Source Track
              </button>
            </span>
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
