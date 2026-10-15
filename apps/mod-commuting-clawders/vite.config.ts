import { defineConfig } from "vite";

// The world: `vite` serves it on its own; `vite build` writes the page the
// streamer serves to Chrome.
export default defineConfig({
  // three.js is most of the page, and one chunk is what the streamer serves.
  build: { chunkSizeWarningLimit: 1000, emptyOutDir: true, outDir: "../dist/world" },
  root: "world",
  server: { port: 3015 },
});
