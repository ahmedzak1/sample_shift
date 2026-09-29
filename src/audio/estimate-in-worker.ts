import { estimateTempo, parseEstimatedKey, type Estimate } from "./estimate";
import type { EstimateRequest, EstimateResponse } from "./estimate.worker";
import type { Region } from "./sample-plan";

/** The rate Essentia's key and tempo algorithms expect by default. */
const ESTIMATE_SAMPLE_RATE = 44100;
/** A whole-Source-Track Estimate looks at this much from the middle of it, to stay quick on long tracks. */
const MAX_ESTIMATE_SECONDS = 120;

/** An Estimate that doesn't answer in this long is given up on (and its worker replaced). */
const ESTIMATE_TIMEOUT_MS = 120_000;

interface InFlight {
  id: number;
  resolve: (estimate: Estimate) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

let worker: Worker | null = null;
let inFlight: InFlight | null = null;
let nextId = 0;

/** Ends the Estimate in flight, if any, and throws its worker away so the next one starts clean. */
function abandon(error: Error) {
  const request = inFlight;
  inFlight = null;
  worker?.terminate();
  worker = null;
  if (request) {
    clearTimeout(request.timer);
    request.reject(error);
  }
}

function estimateWorker(): Worker {
  if (worker) return worker;
  worker = new Worker("/estimate-worker.js");
  worker.onmessage = ({ data }: MessageEvent<EstimateResponse>) => {
    const request = inFlight;
    if (!request || data.id !== request.id) return;
    inFlight = null;
    clearTimeout(request.timer);
    if (data.type === "error") request.reject(new Error(data.message));
    else request.resolve({ key: parseEstimatedKey(data.key, data.scale), tempo: estimateTempo(data.tempo) });
  };
  // A worker that fails to load or crashes is replaced on the next Estimate, instead of leaving it waiting forever.
  worker.onerror = (event) => abandon(new Error(event.message || "The Estimate worker failed to start or crashed."));
  return worker;
}

/** The part of `region` analysed: all of it, or its middle MAX_ESTIMATE_SECONDS. */
function analysedPart(region: Region): Region {
  const length = region.end - region.start;
  if (length <= MAX_ESTIMATE_SECONDS) return region;
  const start = region.start + (length - MAX_ESTIMATE_SECONDS) / 2;
  return { start, end: start + MAX_ESTIMATE_SECONDS };
}

/** Mixes `region` down to mono and resamples it for Essentia, using the browser's own resampler. */
async function monoForEstimate(buffer: AudioBuffer, region: Region): Promise<Float32Array> {
  const part = analysedPart(region);
  const offline = new OfflineAudioContext(1, Math.ceil((part.end - part.start) * ESTIMATE_SAMPLE_RATE), ESTIMATE_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0, part.start, part.end - part.start);
  return (await offline.startRendering()).getChannelData(0);
}

/**
 * Estimates the key and tempo of `region` of the Source Track, in a Web Worker. Starting a new
 * Estimate cancels the one in flight (it rejects), so the latest Region never waits behind an old one.
 */
export async function estimateInWorker(buffer: AudioBuffer, region: Region): Promise<Estimate> {
  const mono = await monoForEstimate(buffer, region);
  if (inFlight) abandon(new Error("A newer Estimate replaced this one."));
  return new Promise<Estimate>((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => abandon(new Error("The Estimate took too long.")), ESTIMATE_TIMEOUT_MS);
    inFlight = { id, resolve, reject, timer };
    const request: EstimateRequest = { id, mono };
    estimateWorker().postMessage(request, [mono.buffer]);
  });
}
