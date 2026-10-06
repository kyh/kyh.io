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
    // cf sends no code_update_strategy, so the API restarts every live room on deploy; this is
    // wrangler's default, which lets a room finish on the old code for up to 5 minutes
    unsafe: { metadata: { code_update_strategy: { max_delay: 300, mode: "deferred" } } },
  },
});
