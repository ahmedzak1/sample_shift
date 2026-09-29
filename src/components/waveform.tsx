"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodedAudioFrom } from "@/audio/sample-render";
import type { Region, RegionEdge } from "@/audio/sample-plan";
import { hueColour } from "./key-colour";

/** The stretch of the Source Track currently shown, in seconds. */
export interface WaveformView {
  start: number;
  duration: number;
}

interface WaveformProps {
  buffer: AudioBuffer;
  view: WaveformView;
  region: Region | null;
  /** Playhead position in seconds, or null to hide it. */
  playhead: number | null;
  /** The editor's hue, for the Region; null draws it in ink. */
  hue: number | null;
  /** Called continuously while a Region is dragged, and with `done` once the drag ends. */
  onRegionChange: (region: Region, done: boolean) => void;
  onSeek: (seconds: number) => void;
}

/** How close (CSS px) the pointer must be to a Region edge to grab it. */
const EDGE_GRAB_PX = 6;
/** A press that moves less than this (CSS px) is a click, not a drag. */
const CLICK_SLOP_PX = 3;

type Drag = { anchor: number; startX: number; moved: boolean };

/** The Region spanning a drag's anchor and the pointer's time, edges in order. */
function regionBetween(anchor: number, t: number): Region {
  return { start: Math.min(anchor, t), end: Math.max(anchor, t) };
}

/** Seconds between ruler marks, from the finest; the first that leaves room for a label is used. */
const RULER_STEPS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];

/** A ruler label: m:ss, with as many decimals as the spacing needs. */
function rulerLabel(seconds: number, spacing: number): string {
  const decimals = spacing >= 1 ? 0 : spacing >= 0.1 ? 1 : 2;
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(decimals).padStart(decimals ? decimals + 3 : 2, "0");
  return `${m}:${s}`;
}

/** min/max peaks per pixel column for the visible part of the Source Track. */
function computePeaks(buffer: AudioBuffer, view: WaveformView, columns: number): Float32Array {
  const { channels } = decodedAudioFrom(buffer);
  const peaks = new Float32Array(columns * 2);
  const first = view.start * buffer.sampleRate;
  const perColumn = (view.duration * buffer.sampleRate) / columns;
  for (let x = 0; x < columns; x++) {
    const start = Math.max(0, Math.floor(first + x * perColumn));
    const end = Math.min(buffer.length, Math.max(start + 1, Math.floor(first + (x + 1) * perColumn)));
    let min = 0;
    let max = 0;
    for (const data of channels) {
      for (let i = start; i < end; i++) {
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];
      }
    }
    peaks[x * 2] = min;
    peaks[x * 2 + 1] = max;
  }
  return peaks;
}

/**
 * Draws the visible part of the Source Track with the Region and playhead.
 * Drag to create a Region, drag near an edge to move that edge, click to move the playhead.
 */
export function Waveform({ buffer, view, region, playhead, hue, onRegionChange, onSeek }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const [pixelWidth, setPixelWidth] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      setPixelWidth(Math.floor(canvas.clientWidth * (window.devicePixelRatio || 1)));
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const peaks = useMemo(
    () => (pixelWidth > 0 ? computePeaks(buffer, view, pixelWidth) : null),
    [buffer, view, pixelWidth],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !peaks) return;
    const ratio = window.devicePixelRatio || 1;
    const width = pixelWidth;
    const height = Math.floor(canvas.clientHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    const styles = getComputedStyle(canvas);
    const xAt = (t: number) => ((t - view.start) / view.duration) * width;

    ctx.clearRect(0, 0, width, height);
    const ink = styles.getPropertyValue("--ink");
    const inkFaint = styles.getPropertyValue("--ink-faint");
    const regionFill = hue === null ? styles.getPropertyValue("--rule") : hueColour(hue, "wash");
    const regionEdge = hue === null ? ink : hueColour(hue, "strong");
    const inRegion = (x: number) => !region || (x >= xAt(region.start) && x <= xAt(region.end));

    if (region) {
      ctx.fillStyle = regionFill;
      ctx.fillRect(xAt(region.start), 0, xAt(region.end) - xAt(region.start), height);
    }

    // The centre line, then the waveform: in ink inside the Region, faint outside it.
    const mid = height / 2;
    ctx.fillStyle = inkFaint;
    ctx.fillRect(0, Math.round(mid), width, Math.max(1, ratio / 2));
    for (let x = 0; x < width; x++) {
      const min = peaks[x * 2];
      const max = peaks[x * 2 + 1];
      ctx.fillStyle = inRegion(x) ? ink : inkFaint;
      ctx.fillRect(x, mid - max * mid * 0.92, 1, Math.max(1, (max - min) * mid * 0.92));
    }

    // A time ruler along the bottom, so Region edges can be read against it.
    const perSecond = width / view.duration;
    const spacing = RULER_STEPS.find((s) => s * perSecond >= 84 * ratio) ?? 600;
    ctx.font = `650 ${11 * ratio}px ${styles.fontFamily}`;
    ctx.textBaseline = "bottom";
    for (let i = Math.ceil(view.start / spacing); i * spacing <= view.start + view.duration; i++) {
      const t = i * spacing;
      const x = Math.round(xAt(t));
      ctx.fillStyle = inkFaint;
      ctx.fillRect(x, height - 7 * ratio, ratio, 7 * ratio);
      // Leave out a label a Region edge would run through.
      const label = rulerLabel(t, spacing);
      const labelEnd = x + 6 * ratio + ctx.measureText(label).width;
      if (region && [region.start, region.end].some((e) => xAt(e) >= x - 2 * ratio && xAt(e) <= labelEnd)) continue;
      ctx.fillStyle = styles.getPropertyValue("--ink-3");
      ctx.fillText(label, x + 4 * ratio, height - 2 * ratio);
    }

    if (region) {
      ctx.fillStyle = regionEdge;
      for (const t of [region.start, region.end]) {
        const x = Math.round(xAt(t));
        ctx.fillRect(x - ratio, 0, 2 * ratio, height);
        // A tab at the top of each edge, to show it can be grabbed.
        ctx.fillRect(t === region.start ? x - ratio : x - 7 * ratio, 0, 8 * ratio, 10 * ratio);
      }
    }
    if (playhead !== null) {
      ctx.fillStyle = ink;
      ctx.fillRect(Math.round(xAt(playhead)) - ratio / 2, 0, Math.max(1, ratio * 1.5), height);
    }
  }, [peaks, pixelWidth, view, region, playhead, hue]);

  function timeAt(clientX: number): number {
    const rect = canvasRef.current!.getBoundingClientRect();
    const t = view.start + ((clientX - rect.left) / rect.width) * view.duration;
    return Math.min(buffer.duration, Math.max(0, t));
  }

  function edgeNear(clientX: number): RegionEdge | null {
    if (!region) return null;
    const rect = canvasRef.current!.getBoundingClientRect();
    const xOf = (t: number) => rect.left + ((t - view.start) / view.duration) * rect.width;
    if (Math.abs(clientX - xOf(region.start)) <= EDGE_GRAB_PX) return "start";
    if (Math.abs(clientX - xOf(region.end)) <= EDGE_GRAB_PX) return "end";
    return null;
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const edge = edgeNear(event.clientX);
    // Grabbing an edge anchors the drag at the opposite edge.
    const anchor = edge === "start" ? region!.end : edge === "end" ? region!.start : timeAt(event.clientX);
    drag.current = { anchor, startX: event.clientX, moved: edge !== null };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const current = drag.current;
    if (!current) {
      event.currentTarget.style.cursor = edgeNear(event.clientX) ? "ew-resize" : "crosshair";
      return;
    }
    if (!current.moved && Math.abs(event.clientX - current.startX) < CLICK_SLOP_PX) return;
    current.moved = true;
    const t = timeAt(event.clientX);
    onRegionChange(regionBetween(current.anchor, t), false);
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    if (!current.moved) {
      onSeek(timeAt(event.clientX));
      return;
    }
    const t = timeAt(event.clientX);
    onRegionChange(regionBetween(current.anchor, t), true);
  }

  return (
    <canvas
      ref={canvasRef}
      className="waveform"
      aria-label="Source Track waveform. Drag to select a Region."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
    />
  );
}
