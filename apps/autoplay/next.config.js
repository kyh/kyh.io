/** @type {import("next").NextConfig} */
const config = {
  /** next dev rewrites AGENTS.md/CLAUDE.md when it detects an agent; we own those files */
  agentRules: false,
  /** X rejects "localhost" callbacks, so dev is browsed at 127.0.0.1 — which
      the dev server treats as cross-origin and blocks without this. */
  allowedDevOrigins: ["127.0.0.1"],
};

export default config;
