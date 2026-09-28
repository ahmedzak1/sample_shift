import { RubberBandOption } from "rubberband-wasm";
import { pitchScale, type RubberBand, type ShiftAndStretch } from "./rubber-band";

/**
 * Real-time settings: the R2 ("faster") engine keeps up on the audio thread, and "high
 * consistency" lets the Pitch Shift change smoothly while it plays.
 */
const REAL_TIME =
  RubberBandOption.RubberBandOptionProcessRealTime |
  RubberBandOption.RubberBandOptionEngineFaster |
  RubberBandOption.RubberBandOptionPitchHighConsistency |
  RubberBandOption.RubberBandOptionChannelsTogether;

/** The most input frames fed to Rubber Band in one go. */
const MAX_BLOCK = 4096;

export interface PreviewSettings extends ShiftAndStretch {
  /** Play the untransformed Source Track audio (the other side of A/B). */
  bypass: boolean;
}

export const UNTRANSFORMED: PreviewSettings = { pitchShift: 0, timeRatio: 1, bypass: true };

/**
 * Plays the Region's audio with the Pitch Shift and stretch applied live, using Rubber Band's
 * real-time mode. It has no Web Audio code, so the AudioWorklet stays a thin wrapper. Positions
 * are frames into the audio it was given.
 */
export class PreviewEngine {
  private readonly state: number;
  private readonly pointers: number;
  private readonly buffers: number[];
  private readonly block: Float32Array[];
  private readPosition = 0;
  /** Output frames still to throw away after a reset (Rubber Band's start delay). */
  private discard = 0;
  /** Silent frames fed after the end, to flush Rubber Band's tail out. */
  private flushed = 0;
  private settings: PreviewSettings = UNTRANSFORMED;
  loop = false;

  constructor(
    private readonly rb: RubberBand,
    private readonly channels: Float32Array[],
    sampleRate: number,
  ) {
    this.state = rb.rubberband_new(sampleRate, channels.length, REAL_TIME, 1, 1);
    rb.rubberband_set_max_process_size(this.state, MAX_BLOCK);
    this.pointers = rb.malloc(channels.length * 4);
    this.buffers = channels.map((_, i) => {
      const ptr = rb.malloc(MAX_BLOCK * 4);
      rb.memWritePtr(this.pointers + i * 4, ptr);
      return ptr;
    });
    this.block = channels.map(() => new Float32Array(MAX_BLOCK));
    this.restart();
  }

  get length(): number {
    return this.channels[0]?.length ?? 0;
  }

  /** Roughly where in the audio the listener is, allowing for Rubber Band's latency. */
  get position(): number {
    if (this.settings.bypass) return this.readPosition;
    const latency = this.rb.rubberband_get_latency(this.state) / this.settings.timeRatio;
    return Math.max(0, this.readPosition - latency);
  }

  update(settings: PreviewSettings) {
    const wasBypassed = this.settings.bypass;
    // Rubber Band has read ahead of what's audible; switching to the untransformed side continues
    // from what the listener actually hears, not from how far it has read.
    if (!wasBypassed && settings.bypass) this.readPosition = Math.floor(this.position);
    this.settings = settings;
    this.rb.rubberband_set_pitch_scale(this.state, pitchScale(settings.pitchShift));
    this.rb.rubberband_set_time_ratio(this.state, settings.timeRatio);
    // Coming back from the untransformed side, start Rubber Band fresh from where we are.
    if (wasBypassed && !settings.bypass) this.restart();
  }

  seek(frame: number) {
    this.readPosition = Math.min(Math.max(0, Math.floor(frame)), this.length);
    this.restart();
  }

  /** Fills `output` (one array per channel, same length). Returns false once playback has ended. */
  render(output: Float32Array[]): boolean {
    const frames = output[0]?.length ?? 0;
    if (this.length === 0) {
      // Nothing to play (and nothing to loop): without this, a looping render would never fill.
      output.forEach((channel) => channel.fill(0));
      return false;
    }
    if (this.settings.bypass) return this.copyThrough(output, frames);

    let written = 0;
    while (written < frames) {
      const available = this.rb.rubberband_available(this.state);
      if (available > 0) {
        const count = Math.min(available, frames - written, MAX_BLOCK);
        const got = this.rb.rubberband_retrieve(this.state, this.pointers, count);
        if (this.discard > 0) {
          this.discard -= Math.min(this.discard, got);
          continue;
        }
        this.buffers.forEach((ptr, i) => output[i].set(this.rb.memReadF32(ptr, got), written));
        written += got;
        continue;
      }
      if (this.ended()) {
        output.forEach((channel) => channel.fill(0, written));
        return false;
      }
      this.feed(Math.min(MAX_BLOCK, Math.max(1, this.rb.rubberband_get_samples_required(this.state))));
    }
    return true;
  }

  dispose() {
    this.buffers.forEach((ptr) => this.rb.free(ptr));
    this.rb.free(this.pointers);
    this.rb.rubberband_delete(this.state);
  }

  private restart() {
    this.rb.rubberband_reset(this.state);
    this.flushed = 0;
    // Prime Rubber Band with the silence it asks for, and skip the delay that silence causes.
    const pad = this.rb.rubberband_get_preferred_start_pad(this.state);
    this.block.forEach((b) => b.fill(0));
    for (let left = pad; left > 0; left -= MAX_BLOCK) this.process(Math.min(MAX_BLOCK, left));
    this.discard = this.rb.rubberband_get_start_delay(this.state);
  }

  /** Past the end (not looping) with Rubber Band's tail flushed out. */
  private ended(): boolean {
    const tail = this.rb.rubberband_get_latency(this.state) + MAX_BLOCK;
    return !this.loop && this.readPosition >= this.length && this.flushed > tail;
  }

  /** Feeds `count` frames from the read position, wrapping when looping and padding with silence past the end. */
  private feed(count: number) {
    for (let i = 0; i < count; i++) {
      if (this.readPosition >= this.length && this.loop) this.readPosition = 0;
      const inside = this.readPosition < this.length;
      this.channels.forEach((channel, c) => (this.block[c][i] = inside ? channel[this.readPosition] : 0));
      if (inside) this.readPosition++;
      else this.flushed++;
    }
    this.process(count);
  }

  private process(count: number) {
    this.block.forEach((b, i) => this.rb.memWrite(this.buffers[i], b.subarray(0, count)));
    this.rb.rubberband_process(this.state, this.pointers, count, 0);
  }

  private copyThrough(output: Float32Array[], frames: number): boolean {
    for (let i = 0; i < frames; i++) {
      if (this.readPosition >= this.length) {
        if (!this.loop) {
          output.forEach((channel) => channel.fill(0, i));
          return false;
        }
        this.readPosition = 0;
      }
      this.channels.forEach((channel, c) => (output[c][i] = channel[this.readPosition]));
      this.readPosition++;
    }
    return true;
  }
}
