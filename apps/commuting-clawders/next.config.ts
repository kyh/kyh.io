import type { NextConfig } from "next";

const config: NextConfig = {
  /** next dev rewrites AGENTS.md/CLAUDE.md when it detects an agent; we own those files */
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  /** The demo runs the mod's own world, shipped as TypeScript source. */
  transpilePackages: ["@repo/commuting-clawders-mod"],
};

export default config;
