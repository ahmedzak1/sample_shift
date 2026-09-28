// The live-preview AudioWorklet. Bundled on its own into public/preview-worklet.js by
// scripts/prepare-public.mjs, because it runs in the audio thread's separate global scope.
import { PreviewEngine, UNTRANSFORMED, type PreviewSettings } from "./preview-engine";
import { loadRubberBand, type RubberBand } from "./rubber-band";

// The AudioWorkletGlobalScope isn't in TypeScript's DOM types.
declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processor: new () => AudioWorkletProcessor): void;

export type PreviewCommand =
  | { type: "init"; wasm: ArrayBuffer }
  | { type: "load"; channels: Float32Array[] }
  | { type: "play"; fromFrame: number; playId: number }
  | { type: "stop"; playId: number }
  | { type: "update"; settings: PreviewSettings }
  | { type: "loop"; loop: boolean };

export type PreviewEvent =
  | { type: "ready" }
  | { type: "position"; frame: number; playId: number }
  | { type: "ended"; playId: number }
  | { type: "error"; message: string };

/** How often (in 128-frame blocks) to report the position: about every 20 ms at 48 kHz. */
const POSITION_EVERY_BLOCKS = 8;

class SamplePreviewProcessor extends AudioWorkletProcessor {
  private rubberBand: RubberBand | null = null;
  private engine: PreviewEngine | null = null;
  private settings: PreviewSettings = UNTRANSFORMED;
  /** Which play the position and ended events belong to, so the page can ignore late ones. */
  private playId = 0;
  private loop = false;
  private playing = false;
  private blocks = 0;

  constructor() {
    super();
    this.port.onmessage = ({ data }: MessageEvent<PreviewCommand>) => this.handle(data);
  }

  private send(event: PreviewEvent) {
    this.port.postMessage(event);
  }

  private async handle(command: PreviewCommand) {
    try {
      switch (command.type) {
        case "init":
          this.rubberBand = await loadRubberBand(await WebAssembly.compile(command.wasm));
          this.send({ type: "ready" });
          break;
        case "load":
          if (!this.rubberBand) throw new Error("The preview isn't ready yet.");
          this.playing = false;
          this.engine?.dispose();
          this.engine = new PreviewEngine(this.rubberBand, command.channels, sampleRate);
          this.engine.update(this.settings);
          this.engine.loop = this.loop;
          break;
        case "play":
          this.playId = command.playId;
          this.engine?.seek(command.fromFrame);
          this.playing = this.engine !== null;
          break;
        case "stop":
          this.playId = command.playId;
          this.playing = false;
          break;
        case "update":
          this.settings = command.settings;
          this.engine?.update(command.settings);
          break;
        case "loop":
          this.loop = command.loop;
          if (this.engine) this.engine.loop = command.loop;
          break;
      }
    } catch (error) {
      this.send({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    if (!this.playing || !this.engine) {
      output.forEach((channel) => channel.fill(0));
      return true;
    }
    const stillPlaying = this.engine.render(output);
    if (++this.blocks % POSITION_EVERY_BLOCKS === 0 || !stillPlaying) {
      this.send({ type: "position", frame: this.engine.position, playId: this.playId });
    }
    if (!stillPlaying) {
      this.playing = false;
      this.send({ type: "ended", playId: this.playId });
    }
    return true;
  }
}

registerProcessor("sample-preview", SamplePreviewProcessor);
