/** Decoded audio of a Source Track: one Float32Array per channel, samples in [-1, 1]. */
export interface DecodedAudio {
  sampleRate: number;
  channels: Float32Array[];
}

/** Copies a browser AudioBuffer's channels into DecodedAudio. */
export function decodedAudioFrom(buffer: AudioBuffer): DecodedAudio {
  return {
    sampleRate: buffer.sampleRate,
    channels: Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i)),
  };
}

const BYTES_PER_PCM_VALUE = 3; // 24-bit
const HEADER_BYTES = 44;

/** Renders a Sample to a 24-bit PCM WAV at the Source Track's sample rate. */
export function renderSample(source: DecodedAudio): Uint8Array {
  const channelCount = source.channels.length;
  const frames = source.channels[0]?.length ?? 0;
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
  view.setUint32(24, source.sampleRate, true);
  view.setUint32(28, source.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BYTES_PER_PCM_VALUE * 8, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = HEADER_BYTES;
  for (let frame = 0; frame < frames; frame++) {
    for (const channel of source.channels) {
      const value = Math.max(-1, Math.min(1, channel[frame]));
      const int = Math.round(value < 0 ? value * 0x800000 : value * 0x7fffff);
      wav[offset++] = int & 0xff;
      wav[offset++] = (int >> 8) & 0xff;
      wav[offset++] = (int >> 16) & 0xff;
    }
  }

  return wav;
}
