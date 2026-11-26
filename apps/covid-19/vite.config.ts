import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      components: path.resolve(root, "src/components"),
      data: path.resolve(root, "src/data"),
      features: path.resolve(root, "src/features"),
      hooks: path.resolve(root, "src/hooks"),
      utils: path.resolve(root, "src/utils"),
    },
  },
});
