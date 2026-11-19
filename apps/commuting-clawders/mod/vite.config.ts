import { defineConfig } from "vite";

export default defineConfig({
  build: { chunkSizeWarningLimit: 1000, emptyOutDir: true, outDir: "../dist/world" },
  root: "world",
  server: { port: 3015 },
});
