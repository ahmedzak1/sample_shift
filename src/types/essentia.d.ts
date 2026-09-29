// essentia.js ships no types for its ES module builds; these cover the parts Sample Shift uses.
declare module "essentia.js/dist/essentia-wasm.es.js" {
  export const EssentiaWASM: unknown;
}

declare module "essentia.js/dist/essentia.js-core.es.js" {
  interface EssentiaVector {
    delete(): void;
  }

  export default class Essentia {
    constructor(wasm: unknown);
    arrayToVector(array: Float32Array): EssentiaVector;
    KeyExtractor(audio: EssentiaVector): { key: string; scale: string; strength: number };
    PercivalBpmEstimator(signal: EssentiaVector): { bpm: number };
  }
}
