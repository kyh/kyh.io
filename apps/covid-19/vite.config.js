import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react({
      include: [/\.jsx?$/, /\.tsx?$/],
    }),
  ],
  resolve: {
    alias: {
      components: path.resolve(__dirname, "src/components"),
      data: path.resolve(__dirname, "src/data"),
      features: path.resolve(__dirname, "src/features"),
      hooks: path.resolve(__dirname, "src/hooks"),
      utils: path.resolve(__dirname, "src/utils"),
    },
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[tj]sx?$/,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
  },
});
