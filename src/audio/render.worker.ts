/// <reference lib="webworker" />
// Renders a Sample off the main thread, so the page stays responsive during a long offline render.
import { loadRubberBand, type RubberBand } from "./rubber-band";
import { changesKeyOrTempo, renderSample, type DecodedAudio, type RenderPlan } from "./sample-render";

export interface RenderRequest {
  audio: DecodedAudio;
  plan: RenderPlan;
}

export type RenderMessage =
  | { type: "progress"; fraction: number }
  | { type: "done"; wav: Uint8Array }
  | { type: "error"; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
let rubberBand: Promise<RubberBand> | null = null;

function post(message: RenderMessage, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

scope.onmessage = async ({ data }: MessageEvent<RenderRequest>) => {
  try {
    const needsRubberBand = changesKeyOrTempo(data.plan);
    if (needsRubberBand) {
      rubberBand ??= WebAssembly.compileStreaming(fetch("/rubberband.wasm")).then(loadRubberBand);
    }
    const wav = renderSample(data.audio, data.plan, needsRubberBand ? await rubberBand! : undefined, (fraction) =>
      post({ type: "progress", fraction }),
    );
    post({ type: "done", wav }, [wav.buffer]);
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
