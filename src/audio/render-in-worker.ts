import type { RenderMessage, RenderRequest } from "./render.worker";
import { decodedAudioFrom, regionAudio, type RenderPlan } from "./sample-render";

/**
 * Renders a Sample in a Web Worker. Only the Region's audio is copied to the worker, so a short
 * Sample from a long Source Track stays cheap.
 */
export function renderInWorker(
  buffer: AudioBuffer,
  plan: RenderPlan,
  onProgress: (fraction: number) => void,
): Promise<Uint8Array> {
  const audio = regionAudio(decodedAudioFrom(buffer), plan.region);
  const request: RenderRequest = {
    audio,
    plan: { ...plan, region: { start: 0, end: plan.region.end - plan.region.start } },
  };
  const worker = new Worker(new URL("./render.worker.ts", import.meta.url), { type: "module" });

  return new Promise<Uint8Array>((resolve, reject) => {
    worker.onmessage = ({ data }: MessageEvent<RenderMessage>) => {
      if (data.type === "progress") return onProgress(data.fraction);
      worker.terminate();
      if (data.type === "done") resolve(data.wav);
      else reject(new Error(data.message));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "The render worker failed."));
    };
    worker.postMessage(request, audio.channels.map((c) => c.buffer));
  });
}
