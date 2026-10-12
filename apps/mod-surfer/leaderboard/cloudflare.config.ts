import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    compatibilityDate: "2026-09-01",
    entrypoint: "src/worker.ts",
    env: {
      DB: bindings.d1({ id: "cd75fc28-7fa0-4320-b2b0-73da89942447", name: "subway-clauders" }),
    },
    name: "subway-clauders",
  },
});
