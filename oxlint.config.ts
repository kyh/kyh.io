import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

const nextApps = ["apps/autoplay/**", "apps/kyh/**", "apps/policingice/**", "apps/stonksville/**"];

export default defineConfig({
  extends: [core, react, antiSlop],
  ignorePatterns: [
    ...core.ignorePatterns,
    "dist-electron",
    ".expo",
    ".wxt",
    ".claude",
    ".codex",
    ".conductor",
    ".cursor",
    ".superset",
  ],
  overrides: [{ files: nextApps, plugins: next.plugins, rules: next.rules }],
  rules: {
    // Sequential awaits in loops are deliberate here (rate-limited source reads, ordered writes).
    "no-await-in-loop": "off",
  },
});
