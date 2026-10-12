import { defineConfig } from "vite";

// The streamer, bundled to one file Node runs: an installed mod has no
// node_modules.
export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "dist",
    rolldownOptions: { output: { entryFileNames: "stream.mjs" } },
    ssr: "stream/stream.ts",
    target: "node20",
  },
});
