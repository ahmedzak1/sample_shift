import type { PreviewSettings } from "./preview-engine";
import type { PreviewCommand, PreviewEvent } from "./preview.worklet";
import type { Region } from "./sample-plan";
import type { DecodedAudio } from "./sample-render";

export type { PreviewSettings };

interface PreviewPlayerEvents {
  /** Where playback is, in Source Track seconds. */
  onPosition: (seconds: number) => void;
  onEnded: () => void;
  onError: (message: string) => void;
}

/**
 * Main-thread side of the live preview: plays audio through the "sample-preview" AudioWorklet,
 * which applies the Pitch Shift and stretch with Rubber Band's real-time mode.
 */
export class PreviewPlayer {
  /** The Region (or whole Source Track) whose audio the worklet holds. */
  private loaded: Region | null = null;
  /** Increases with every play and stop; events from an earlier one are ignored. */
  private playId = 0;
  /** Where the current play's audio starts in the Source Track, for converting positions. */
  private playingFrom = 0;

  private constructor(
    private readonly node: AudioWorkletNode,
    private readonly sampleRate: number,
    events: PreviewPlayerEvents,
  ) {
    node.port.onmessage = ({ data }: MessageEvent<PreviewEvent>) => {
      if ((data.type === "position" || data.type === "ended") && data.playId !== this.playId) return;
      if (data.type === "position") events.onPosition(this.playingFrom + data.frame / this.sampleRate);
      else if (data.type === "ended") events.onEnded();
      else if (data.type === "error") events.onError(data.message);
    };
  }

  /** Loads the worklet and Rubber Band into `context`, for audio with `channelCount` channels. */
  static async create(context: AudioContext, channelCount: number, events: PreviewPlayerEvents): Promise<PreviewPlayer> {
    const [, wasm] = await Promise.all([
      context.audioWorklet.addModule("/preview-worklet.js"),
      fetch("/rubberband.wasm").then((r) => r.arrayBuffer()),
    ]);
    const node = new AudioWorkletNode(context, "sample-preview", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [channelCount],
    });
    node.connect(context.destination);

    const ready = new Promise<void>((resolve, reject) => {
      node.port.onmessage = ({ data }: MessageEvent<PreviewEvent>) => {
        if (data.type === "ready") resolve();
        else if (data.type === "error") reject(new Error(data.message));
      };
    });
    const init: PreviewCommand = { type: "init", wasm };
    node.port.postMessage(init, [wasm]);
    await ready;
    return new PreviewPlayer(node, context.sampleRate, events);
  }

  /**
   * Gives the worklet the audio of `region` (the Region, or the whole Source Track). `audioOf` is
   * only called when the Region has changed, so the same audio isn't copied again.
   */
  load(region: Region, audioOf: (region: Region) => DecodedAudio) {
    if (this.loaded && this.loaded.start === region.start && this.loaded.end === region.end) return;
    const audio = audioOf(region);
    this.loaded = region;
    this.send({ type: "load", channels: audio.channels }, audio.channels.map((c) => c.buffer));
  }

  /** Starts playing the loaded audio from `seconds` in the Source Track. */
  play(seconds: number) {
    const from = this.loaded?.start ?? 0;
    this.playingFrom = from;
    this.send({ type: "play", fromFrame: Math.round((seconds - from) * this.sampleRate), playId: ++this.playId });
  }

  stop() {
    this.send({ type: "stop", playId: ++this.playId });
  }

  update(settings: PreviewSettings) {
    this.send({ type: "update", settings });
  }

  setLoop(loop: boolean) {
    this.send({ type: "loop", loop });
  }

  dispose() {
    this.stop();
    this.node.disconnect();
    this.node.port.close();
  }

  private send(command: PreviewCommand, transfer: Transferable[] = []) {
    this.node.port.postMessage(command, transfer);
  }
}
