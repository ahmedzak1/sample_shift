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

/** Renders a Sample: takes the Region from the Source Track, fades its edges, and encodes it as a 24-bit WAV. */
export function renderSample(source: DecodedAudio, region: Region): Uint8Array {
  const startFrame = Math.round(region.start * source.sampleRate);
  const endFrame = Math.round(region.end * source.sampleRate);
  const length = Math.max(0, endFrame - startFrame);
  const fadeFrames = Math.min(Math.round(FADE_SECONDS * source.sampleRate), Math.floor(length / 2));

  const channels = source.channels.map((channel) => {
    const sampleChannel = channel.slice(startFrame, endFrame);
    for (let i = 0; i < fadeFrames; i++) {
      const gain = i / fadeFrames;
      sampleChannel[i] *= gain;
      sampleChannel[length - 1 - i] *= gain;
    }
    return sampleChannel;
  });

  return encodeWav({ sampleRate: source.sampleRate, channels });
}
