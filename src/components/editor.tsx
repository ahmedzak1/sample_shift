"use client";

import { useEffect, useRef, useState } from "react";
import { decodedAudioFrom, renderSample } from "@/audio/sample-render";
import type { SourceTrack } from "@/tracks/source-track";
import { Waveform } from "./waveform";

interface LoadedTrack {
  track: SourceTrack;
  buffer: AudioBuffer;
  context: AudioContext;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Editor() {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedTrack | null>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);

  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  /** context.currentTime minus the playback position playback started from. */
  const playStartedAt = useRef(0);
  const pausedAt = useRef(0);
  const animationFrame = useRef(0);

  const playing = playhead !== null && sourceNode.current !== null;

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
      pausedAt.current = 0;
      setLoaded({ track, buffer, context });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStatus(null);
    }
  }

  function tick() {
    if (!loaded) return;
    setPlayhead(loaded.context.currentTime - playStartedAt.current);
    animationFrame.current = requestAnimationFrame(tick);
  }

  function play() {
    if (!loaded) return;
    const { context, buffer } = loaded;
    void context.resume();
    const node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(context.destination);
    node.onended = () => {
      if (sourceNode.current !== node) return;
      sourceNode.current = null;
      pausedAt.current = 0;
      cancelAnimationFrame(animationFrame.current);
      setPlayhead(null);
    };
    node.start(0, pausedAt.current);
    sourceNode.current = node;
    playStartedAt.current = context.currentTime - pausedAt.current;
    animationFrame.current = requestAnimationFrame(tick);
  }

  function pause() {
    if (!loaded || !sourceNode.current) return;
    pausedAt.current = loaded.context.currentTime - playStartedAt.current;
    stop();
    setPlayhead(pausedAt.current);
  }

  function stop() {
    const node = sourceNode.current;
    sourceNode.current = null;
    node?.stop();
    cancelAnimationFrame(animationFrame.current);
    setPlayhead(null);
  }

  function download() {
    if (!loaded) return;
    const { buffer, track } = loaded;
    const wav = renderSample(decodedAudioFrom(buffer));
    const url = URL.createObjectURL(new Blob([wav as BlobPart], { type: "audio/wav" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${track.title}.wav`;
    a.click();
    // Revoking straight after click() can cancel the download in Firefox and Safari.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <>
      <form onSubmit={fetchTrack}>
        <input
          type="url"
          required
          placeholder="Paste a YouTube link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          aria-label="YouTube link"
        />
        <button type="submit" className="primary" disabled={status !== null}>
          Fetch
        </button>
      </form>
      {status && <p className="status">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {loaded && (
        <section className="track">
          <h2>{loaded.track.title}</h2>
          <p className="meta">
            {formatTime(loaded.buffer.duration)} · {loaded.buffer.sampleRate / 1000} kHz ·{" "}
            {loaded.buffer.numberOfChannels === 1 ? "mono" : "stereo"}
          </p>
          <Waveform buffer={loaded.buffer} playhead={playhead ?? (pausedAt.current || null)} />
          <div className="controls">
            <button type="button" onClick={playing ? pause : play}>
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" className="primary" onClick={download}>
              Download WAV
            </button>
          </div>
        </section>
      )}
    </>
  );
}
