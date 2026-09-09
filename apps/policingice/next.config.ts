import type { NextConfig } from "next";

const config: NextConfig = {
  /** next dev rewrites AGENTS.md/CLAUDE.md when it detects an agent; we own those files */
  agentRules: false,
  cacheComponents: true,
  serverExternalPackages: ["@libsql/client"],
};

export default config;
