import { describe, expect, it } from "vitest";
import { renderSample } from "./sample-render";

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

describe("renderSample", () => {
  it("exports a Source Track as a 24-bit PCM WAV at its own sample rate", () => {
    const frames = 100;
    const source = {
      sampleRate: 44100,
      channels: [new Float32Array(frames), new Float32Array(frames)],
    };

    const wav = renderSample(source);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

    expect(ascii(wav, 0, 4)).toBe("RIFF");
    expect(ascii(wav, 8, 4)).toBe("WAVE");
    expect(ascii(wav, 12, 4)).toBe("fmt ");
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(2); // channels
    expect(view.getUint32(24, true)).toBe(44100); // sample rate
    expect(view.getUint32(28, true)).toBe(264600); // byte rate: 44100 * 2 ch * 3 bytes
    expect(view.getUint16(32, true)).toBe(6); // block align: 2 ch * 3 bytes
    expect(view.getUint16(34, true)).toBe(24); // bits per sample
    expect(ascii(wav, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(600); // 100 frames * 6 bytes
    expect(view.getUint32(4, true)).toBe(wav.byteLength - 8);
    expect(wav.byteLength).toBe(44 + 600);
  });

  it("writes samples interleaved as 24-bit little-endian, clipping out-of-range values", () => {
    const source = {
      sampleRate: 48000,
      channels: [new Float32Array([1, 0, 1.5]), new Float32Array([-1, 0, -1.5])],
    };

    const data = Array.from(renderSample(source).subarray(44));

    expect(data).toEqual([
      0xff, 0xff, 0x7f, /* R */ 0x00, 0x00, 0x80, // frame 0: full scale +, full scale -
      0x00, 0x00, 0x00, /* R */ 0x00, 0x00, 0x00, // frame 1: silence
      0xff, 0xff, 0x7f, /* R */ 0x00, 0x00, 0x80, // frame 2: clipped to full scale
    ]);
  });
});
