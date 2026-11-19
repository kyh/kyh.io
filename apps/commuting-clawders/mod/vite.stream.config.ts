import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "dist",
    rolldownOptions: { output: { entryFileNames: "stream.mjs" } },
    ssr: "stream/stream.ts",
    target: "node20",
  },
});
