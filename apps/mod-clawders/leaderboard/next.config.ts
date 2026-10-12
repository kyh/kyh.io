import type { NextConfig } from "next";

const config: NextConfig = {
  /** next dev rewrites AGENTS.md/CLAUDE.md when it detects an agent; we own those files */
  agentRules: false,
  /** The demo runs the mod's own world, shipped as TypeScript source. */
  transpilePackages: ["@repo/mod-clawders"],
};

export default config;
