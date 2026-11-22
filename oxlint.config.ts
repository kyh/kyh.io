import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import landmines from "ultracite/oxlint/landmines";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

const nextApps = [
  "apps/autoplay/**",
  "apps/boobounty/**",
  "apps/kyh/**",
  "apps/policingice/**",
  "apps/stonksville/**",
];

export default defineConfig({
  extends: [core, react, antiSlop, landmines],
  jsPlugins: landmines.jsPlugins,
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "dist-electron",
    ".expo",
    ".wxt",
    ".claude",
    ".codex",
    ".conductor",
    ".cursor",
    ".superset",
    "packages/claude-code-types/claude-code.d.ts",
  ],
  overrides: [{ files: nextApps, plugins: next.plugins, rules: next.rules }],
  rules: {
    "anti-slop/require-safety-comment-for-type-assertion": "off",
    "no-await-in-loop": "off",
  },
});
