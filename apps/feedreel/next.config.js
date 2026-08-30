/** @type {import("next").NextConfig} */
const config = {
  /** next dev rewrites AGENTS.md/CLAUDE.md when it detects an agent; we own those files */
  agentRules: false,
};

export default config;
