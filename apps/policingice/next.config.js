/** @type {import('next').NextConfig} */
const config = {
  /** next dev rewrites AGENTS.md/CLAUDE.md when it detects an agent; we own those files */
  agentRules: false,
  cacheComponents: true,
  serverExternalPackages: ["@libsql/client"],
};

export default config;
