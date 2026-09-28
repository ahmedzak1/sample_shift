"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodedAudioFrom } from "@/audio/sample-render";
import type { Region, RegionEdge } from "@/audio/sample-plan";

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
export function Waveform({ buffer, view, region, playhead, onRegionChange, onSeek }: WaveformProps) {
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
    if (region) {
      ctx.fillStyle = styles.getPropertyValue("--region");
      ctx.fillRect(xAt(region.start), 0, xAt(region.end) - xAt(region.start), height);
    }

    const mid = height / 2;
    ctx.fillStyle = styles.getPropertyValue("--wave");
    for (let x = 0; x < width; x++) {
      const min = peaks[x * 2];
      const max = peaks[x * 2 + 1];
      ctx.fillRect(x, mid - max * mid, 1, Math.max(1, (max - min) * mid));
    }

    if (region) {
      ctx.fillStyle = styles.getPropertyValue("--region-edge");
      for (const t of [region.start, region.end]) ctx.fillRect(Math.round(xAt(t)) - ratio, 0, 2 * ratio, height);
    }
    if (playhead !== null) {
      ctx.fillStyle = styles.getPropertyValue("--accent");
      ctx.fillRect(Math.round(xAt(playhead)), 0, Math.max(1, ratio), height);
    }
  }, [peaks, pixelWidth, view, region, playhead]);

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
