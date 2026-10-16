import type { NextConfig } from "next";

const config: NextConfig = {
  /** next dev rewrites AGENTS.md/CLAUDE.md when it detects an agent; we own those files */
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
};

export default config;
