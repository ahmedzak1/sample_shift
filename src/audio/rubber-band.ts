import { RubberBandInterface, RubberBandOption } from "rubberband-wasm";
import type { DecodedAudio } from "./sample-render";

export type RubberBand = RubberBandInterface;

/** Compiles and starts Rubber Band from its .wasm (bytes, or an already-compiled module). */
export async function loadRubberBand(wasm: BufferSource | WebAssembly.Module): Promise<RubberBand> {
  const module = wasm instanceof WebAssembly.Module ? wasm : await WebAssembly.compile(wasm);
  return RubberBandInterface.initialize(module);
}

/** Rubber Band's pitch scale for a Pitch Shift in semitones. */
export function pitchScale(pitchShift: number): number {
  return 2 ** (pitchShift / 12);
}

export interface ShiftAndStretch {
  pitchShift: number;
  /** Output length ÷ input length. */
  timeRatio: number;
}

/** Offline, highest-quality settings: the R3 ("finer") engine, with channels processed together to keep the stereo image. */
const OFFLINE_HIGH_QUALITY =
  RubberBandOption.RubberBandOptionProcessOffline |
  RubberBandOption.RubberBandOptionEngineFiner |
  RubberBandOption.RubberBandOptionChannelsTogether;

const BLOCK_FRAMES = 8192;
/** How many empty polls to allow after the final block before deciding Rubber Band has stalled. */
const MAX_EMPTY_POLLS = 10_000;

/**
 * Changes key and tempo independently with Rubber Band in offline mode. It studies the whole
 * input first, then processes it, so the result is the best quality Rubber Band offers.
 */
export function shiftAndStretch(
  rb: RubberBand,
  audio: DecodedAudio,
  { pitchShift, timeRatio }: ShiftAndStretch,
  onProgress?: (fraction: number) => void,
): DecodedAudio {
  const channelCount = audio.channels.length;
  const frames = audio.channels[0]?.length ?? 0;
  const state = rb.rubberband_new(audio.sampleRate, channelCount, OFFLINE_HIGH_QUALITY, timeRatio, pitchScale(pitchShift));
  rb.rubberband_set_expected_input_duration(state, frames);
  rb.rubberband_set_max_process_size(state, BLOCK_FRAMES);

  // Rubber Band takes an array of per-channel pointers.
  const pointers = rb.malloc(channelCount * 4);
  const buffers = audio.channels.map((_, i) => {
    const ptr = rb.malloc(BLOCK_FRAMES * 4);
    rb.memWritePtr(pointers + i * 4, ptr);
    return ptr;
  });
  const output: Float32Array[][] = audio.channels.map(() => []);

  const feed = (step: "study" | "process", from: number) => {
    const count = Math.min(BLOCK_FRAMES, frames - from);
    audio.channels.forEach((channel, i) => rb.memWrite(buffers[i], channel.subarray(from, from + count)));
    const final = from + count >= frames ? 1 : 0;
    if (step === "study") rb.rubberband_study(state, pointers, count, final);
    else rb.rubberband_process(state, pointers, count, final);
    return count;
  };

  const retrieve = (available: number) => {
    const got = rb.rubberband_retrieve(state, pointers, Math.min(BLOCK_FRAMES, available));
    buffers.forEach((ptr, i) => output[i].push(rb.memReadF32(ptr, got).slice()));
  };

  try {
    for (let from = 0; from < frames; ) from += feed("study", from);
    onProgress?.(0.1);

    for (let from = 0; from < frames; ) {
      from += feed("process", from);
      for (let available; (available = rb.rubberband_available(state)) > 0; ) retrieve(available);
      onProgress?.(0.1 + (0.9 * from) / frames);
    }
    // After the final block, keep collecting until Rubber Band reports it's done (-1).
    for (let emptyPolls = 0; ; ) {
      const available = rb.rubberband_available(state);
      if (available < 0) break;
      if (available > 0) retrieve(available);
      else if (++emptyPolls > MAX_EMPTY_POLLS) throw new Error("Rubber Band stopped before finishing the Sample.");
    }
  } finally {
    buffers.forEach((ptr) => rb.free(ptr));
    rb.free(pointers);
    rb.rubberband_delete(state);
  }

  return {
    sampleRate: audio.sampleRate,
    channels: output.map((chunks) => {
      const joined = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
      let at = 0;
      for (const chunk of chunks) {
        joined.set(chunk, at);
        at += chunk.length;
      }
      return joined;
    }),
  };
}
