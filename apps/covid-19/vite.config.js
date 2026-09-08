import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = import.meta.dirname;

export default defineConfig({
  esbuild: {
    include: /src\/.*\.[tj]sx?$/u,
    loader: "jsx",
  },
  plugins: [
    react({
      include: [/\.jsx?$/u, /\.tsx?$/u],
    }),
  ],
  resolve: {
    alias: {
      components: path.resolve(root, "src/components"),
      data: path.resolve(root, "src/data"),
      features: path.resolve(root, "src/features"),
      hooks: path.resolve(root, "src/hooks"),
      utils: path.resolve(root, "src/utils"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setup-tests.js",
  },
});
