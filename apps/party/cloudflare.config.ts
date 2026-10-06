import { bindings, defineConfig, exports } from "cf/config";

export default defineConfig({
  worker: {
    compatibilityDate: "2024-07-25",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "src/server.ts",
    env: {
      KyhServer: bindings.durableObject({ exportName: "KyhServer", worker: "kyh-party" }),
    },
    // Replaces wrangler's `migrations` (v1: new_classes KyhServer): the live
    // namespace keeps its key-value storage.
    exports: {
      KyhServer: exports.durableObject({ storage: "legacy-kv" }),
    },
    name: "kyh-party",
  },
});
