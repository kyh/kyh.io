import { defineConfig } from "vite";

export default defineConfig({
  // the main page needs top-level await (the manifest is fetched before anything draws)
  build: { target: "es2022" },
});
