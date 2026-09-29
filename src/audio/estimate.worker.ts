// Estimates key and tempo with essentia.js off the main thread. Bundled on its own into
// public/estimate-worker.js by scripts/prepare-public.mjs (Essentia's Emscripten loader is
// kept out of the app's bundler).
import { EssentiaWASM } from "essentia.js/dist/essentia-wasm.es.js";
import Essentia from "essentia.js/dist/essentia.js-core.es.js";

export interface EstimateRequest {
  id: number;
  /** Mono audio at ESTIMATE_SAMPLE_RATE. */
  mono: Float32Array;
}

export type EstimateResponse =
  | { id: number; type: "done"; key: string; scale: string; tempo: number }
  | { id: number; type: "error"; message: string };

let essentia: InstanceType<typeof Essentia> | null = null;

self.onmessage = ({ data }: MessageEvent<EstimateRequest>) => {
  let response: EstimateResponse;
  try {
    essentia ??= new Essentia(EssentiaWASM);
    const signal = essentia.arrayToVector(data.mono);
    try {
      const key = essentia.KeyExtractor(signal);
      const tempo = essentia.PercivalBpmEstimator(signal);
      response = { id: data.id, type: "done", key: key.key, scale: key.scale, tempo: tempo.bpm };
    } finally {
      signal.delete();
    }
  } catch (error) {
    // Essentia's WebAssembly throws bare numbers, which mean nothing to you.
    const message = error instanceof Error ? error.message : "Essentia couldn't analyse this audio.";
    response = { id: data.id, type: "error", message };
  }
  self.postMessage(response);
};
