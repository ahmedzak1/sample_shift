// Puts the audio files the browser loads at runtime into public/:
// - Rubber Band's .wasm (fetched by the render worker and the preview worklet)
// - the live-preview AudioWorklet, bundled on its own because worklets run in a separate scope
import { copyFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("public", { recursive: true });
await copyFile("node_modules/rubberband-wasm/dist/rubberband.wasm", "public/rubberband.wasm");
await build({
  entryPoints: ["src/audio/preview.worklet.ts"],
  outfile: "public/preview-worklet.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  logLevel: "warning",
});
