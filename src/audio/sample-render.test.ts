import { describe, expect, it } from "vitest";
import { encodeWav, renderSample } from "./sample-render";

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/** Reads a mono 24-bit WAV's data back as floats in [-1, 1]. */
function monoValues(wav: Uint8Array): number[] {
  const values: number[] = [];
  for (let i = 44; i + 2 < wav.length; i += 3) {
    let int = wav[i] | (wav[i + 1] << 8) | (wav[i + 2] << 16);
    if (int & 0x800000) int -= 0x1000000;
    values.push(int < 0 ? int / 0x800000 : int / 0x7fffff);
  }
  return values;
}

describe("encodeWav", () => {
  it("encodes audio as a 24-bit PCM WAV at its own sample rate", () => {
    const frames = 100;
    const audio = {
      sampleRate: 44100,
      channels: [new Float32Array(frames), new Float32Array(frames)],
    };

    const wav = encodeWav(audio);
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

  it("writes values interleaved as 24-bit little-endian, clipping out-of-range values", () => {
    const audio = {
      sampleRate: 48000,
      channels: [new Float32Array([1, 0, 1.5]), new Float32Array([-1, 0, -1.5])],
    };

    const data = Array.from(encodeWav(audio).subarray(44));

    expect(data).toEqual([
      0xff, 0xff, 0x7f, /* R */ 0x00, 0x00, 0x80, // frame 0: full scale +, full scale -
      0x00, 0x00, 0x00, /* R */ 0x00, 0x00, 0x00, // frame 1: silence
      0xff, 0xff, 0x7f, /* R */ 0x00, 0x00, 0x80, // frame 2: clipped to full scale
    ]);
  });
});

describe("renderSample", () => {
  // 2 s at 8 kHz whose value is its position: frame f holds f / 16000.
  const rate = 8000;
  const ramp = new Float32Array(2 * rate).map((_, f) => f / 16000);
  const source = { sampleRate: rate, channels: [ramp] };

  it("exports only the Region", () => {
    const values = monoValues(renderSample(source, { start: 0.5, end: 1.25 }));

    expect(values).toHaveLength(6000); // 0.75 s at 8 kHz
    expect(values[3000]).toBeCloseTo(0.4375, 5); // source frame 7000 = 0.875 s
  });

  it("fades the Sample in and out over about 5 ms so its edges don't click", () => {
    const values = monoValues(renderSample(source, { start: 0.5, end: 1.25 }));

    expect(values[0]).toBe(0);
    expect(values.at(-1)).toBe(0);
    expect(values[20]).toBeGreaterThan(0); // part-way through the fade in
    expect(values[20]).toBeLessThan(4020 / 16000);
    expect(values[40]).toBeCloseTo(4040 / 16000, 5); // 5 ms in: full level
    expect(values[5959]).toBeCloseTo(9959 / 16000, 5); // 5 ms before the end: full level
  });
});
