---
"@kyh/skills": minor
---

Add `@kyh/skills`: distribute personal Claude Code + Codex skills, agents, MCP servers, and global instructions as an npm package. `postinstall` links everything the way `npx skills` does — a canonical store at `~/.agents` (read directly by universal agents like Codex), with Claude's dirs symlinked into it — plus `CLAUDE.md` into `~/.claude` and MCP servers merged into `~/.claude.json`. Falls back to copying when symlinks aren't permitted.
