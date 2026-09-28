// Copies Rubber Band's .wasm next to the app's static files so the render worker can fetch it.
import { copyFile, mkdir } from "node:fs/promises";

await mkdir("public", { recursive: true });
await copyFile("node_modules/rubberband-wasm/dist/rubberband.wasm", "public/rubberband.wasm");
