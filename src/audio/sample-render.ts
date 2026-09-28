import { shiftAndStretch, type RubberBand } from "./rubber-band";
import type { Region } from "./sample-plan";

/** Decoded audio of a Source Track: one Float32Array per channel, samples in [-1, 1]. */
export interface DecodedAudio {
  sampleRate: number;
  channels: Float32Array[];
}

/** Views a browser AudioBuffer's channels as DecodedAudio (no copy: callers must not modify them). */
export function decodedAudioFrom(buffer: AudioBuffer): DecodedAudio {
  return {
    sampleRate: buffer.sampleRate,
    channels: Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i)),
  };
}

const BYTES_PER_PCM_VALUE = 3; // 24-bit
const HEADER_BYTES = 44;

/** Encodes audio as a 24-bit PCM WAV at its own sample rate. */
export function encodeWav(audio: DecodedAudio): Uint8Array {
  const channelCount = audio.channels.length;
  const frames = audio.channels[0]?.length ?? 0;
  const blockAlign = channelCount * BYTES_PER_PCM_VALUE;
  const dataBytes = frames * blockAlign;

  const wav = new Uint8Array(HEADER_BYTES + dataBytes);
  const view = new DataView(wav.buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) wav[offset + i] = text.charCodeAt(i);
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, wav.byteLength - 8, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BYTES_PER_PCM_VALUE * 8, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = HEADER_BYTES;
  for (let frame = 0; frame < frames; frame++) {
    for (const channel of audio.channels) {
      const value = Math.max(-1, Math.min(1, channel[frame]));
      const int = Math.round(value < 0 ? value * 0x800000 : value * 0x7fffff);
      wav[offset++] = int & 0xff;
      wav[offset++] = (int >> 8) & 0xff;
      wav[offset++] = (int >> 16) & 0xff;
    }
  }

  return wav;
}

const FADE_SECONDS = 0.005;

/** What renderSample needs from a SamplePlan. */
export interface RenderPlan {
  region: Region;
  /** Defaults to 0 (key unchanged). */
  pitchShift?: number;
  /** Output length ÷ input length; defaults to 1 (tempo unchanged). */
  timeRatio?: number;
}

/** Whether rendering this plan changes key or tempo, and so needs Rubber Band. */
export function changesKeyOrTempo({ pitchShift = 0, timeRatio = 1 }: RenderPlan): boolean {
  return pitchShift !== 0 || timeRatio !== 1;
}

/** The part of the audio inside the Region. */
export function regionAudio(source: DecodedAudio, region: Region): DecodedAudio {
  const startFrame = Math.round(region.start * source.sampleRate);
  const endFrame = Math.round(region.end * source.sampleRate);
  return { sampleRate: source.sampleRate, channels: source.channels.map((c) => c.slice(startFrame, endFrame)) };
}

/** Fades both ends of each channel in place, over about 5 ms, so the Sample's edges don't click. */
function fadeEdges(audio: DecodedAudio): void {
  for (const channel of audio.channels) {
    const length = channel.length;
    const fadeFrames = Math.min(Math.round(FADE_SECONDS * audio.sampleRate), Math.floor(length / 2));
    for (let i = 0; i < fadeFrames; i++) {
      const gain = i / fadeFrames;
      channel[i] *= gain;
      channel[length - 1 - i] *= gain;
    }
  }
}

/**
 * Renders a Sample: takes the Region from the Source Track, applies the Pitch Shift and stretch
 * with Rubber Band (only needed when the plan changes key or tempo), fades the edges, and encodes
 * a 24-bit WAV at the Source Track's sample rate.
 */
export function renderSample(
  source: DecodedAudio,
  { region, pitchShift = 0, timeRatio = 1 }: RenderPlan,
  rubberBand?: RubberBand,
  onProgress?: (fraction: number) => void,
): Uint8Array {
  let audio = regionAudio(source, region);
  if (changesKeyOrTempo({ region, pitchShift, timeRatio })) {
    if (!rubberBand) throw new Error("Changing key or tempo needs Rubber Band.");
    audio = shiftAndStretch(rubberBand, audio, { pitchShift, timeRatio }, onProgress);
  }
  fadeEdges(audio);
  return encodeWav(audio);
}
