"use client";

import { useEffect, useRef } from "react";
import { decodedAudioFrom } from "@/audio/sample-render";

interface WaveformProps {
  buffer: AudioBuffer;
  /** Playhead position in seconds, or null to hide it. */
  playhead: number | null;
}

/** Draws the Source Track as min/max peaks per pixel column, with a playhead. */
export function Waveform({ buffer, playhead }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.floor(canvas.clientWidth * ratio);
    const height = Math.floor(canvas.clientHeight * ratio);
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const styles = getComputedStyle(canvas);
    ctx.clearRect(0, 0, width, height);

    const { channels } = decodedAudioFrom(buffer);
    const mid = height / 2;
    ctx.fillStyle = styles.getPropertyValue("--wave");
    for (let x = 0; x < width; x++) {
      let min = 0;
      let max = 0;
      // Spread the whole track across the width so column x lines up with the playhead's time scale.
      const start = Math.floor((x * buffer.length) / width);
      const end = Math.max(start + 1, Math.floor(((x + 1) * buffer.length) / width));
      for (const data of channels) {
        for (let i = start; i < end; i++) {
          if (data[i] < min) min = data[i];
          if (data[i] > max) max = data[i];
        }
      }
      ctx.fillRect(x, mid - max * mid, 1, Math.max(1, (max - min) * mid));
    }

    if (playhead !== null) {
      ctx.fillStyle = styles.getPropertyValue("--accent");
      ctx.fillRect(Math.round((playhead / buffer.duration) * width), 0, Math.max(1, ratio), height);
    }
  }, [buffer, playhead]);

  return <canvas ref={canvasRef} className="waveform" aria-label="Source Track waveform" />;
}
