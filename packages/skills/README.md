# @kyh/skills

My Claude Code + Codex setup, distributed as an npm package. Installing it
symlinks my skills, agents, and global instructions into the right global
directories so they're available across every project.

## Install

```bash
npm i -g @kyh/skills
```

The `postinstall` script links everything into place. To redo it manually:

```bash
node "$(npm root -g)/@kyh/skills/scripts/link.mjs"
```

> **pnpm note:** pnpm blocks dependency build scripts by default, so
> `postinstall` won't run unless you approve it (`pnpm approve-builds -g`) or
> run the link script manually with the command above.

### What gets linked

Same model as [`npx skills`](https://github.com/vercel-labs/skills): a single
canonical store at `~/.agents`, with non-universal agents symlinking into it.

| Source (in this package) | Target | Mechanism |
| --- | --- | --- |
| `skills/<name>/` | `~/.agents/skills/<name>` | symlink (canonical) |
| `agents/<name>.md` | `~/.agents/agents/<name>.md` | symlink (canonical) |
| `~/.agents/skills/<name>` | `~/.claude/skills/<name>` | symlink |
| `~/.agents/agents/<name>.md` | `~/.claude/agents/<name>.md` | symlink |
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | symlink |
| `mcp.json` → `mcpServers` | `~/.claude.json` → `mcpServers` | merged (JSON sub-key) |

**Universal agents** (codex, amp, opencode, goose, kimi) read `~/.agents`
directly — nothing else to do. **Non-universal agents** (claude, cursor) get
their own dirs symlinked to the canonical store.

Symlinks mean edits to the installed source show up everywhere immediately. If
symlinks aren't permitted (e.g. Windows without developer mode), it falls back to
copying. MCP servers are **merged** rather than symlinked (they live under a key
inside `~/.claude.json`).

Existing real files are never deleted: a clashing target is renamed to `*.bak`
before linking.

### Flags / env

- `--dry-run` (or `KYH_SKILLS_DRY_RUN=1`) — print what would change, write nothing.
- `KYH_SKILLS_NO_LINK=1` — skip linking entirely.
- `KYH_SKILLS_FORCE=1` — link even when it's not a global install (a working copy, or yarn/pnpm global).
- During postinstall, linking only runs for a global install (`npm i -g`); local/hoisted deps and CI are skipped.

## External skills

On install, the postinstall also pulls every skill from a curated list of repos
into the global space using the bundled `skills` CLI (`skills add <repo> -g -s '*'
-y`; falls back to `npx skills` if unresolved). The list lives in
[`external-skills.json`](./external-skills.json) — edit it to curate.

- Repos install all in parallel by default; throttle with `KYH_SKILLS_CONCURRENCY`.
- Skip the whole step: `KYH_SKILLS_NO_EXTERNAL=1`.
- These install into the same canonical `~/.agents/skills`, so universal agents
  pick them up directly and Claude gets symlinks.

Cherry-pick a single skill manually: `npx skills add <repo>@<skill-name> -g -y`.

## Custom skills

| Skill                       | What it does                                                          |
| --------------------------- | --------------------------------------------------------------------- |
| `architect`                 | Deep technical analysis, architecture decisions, code review          |
| `librarian`                 | Multi-repo codebase exploration, find patterns across GitHub/npm/PyPI |
| `pr-lifecycle`              | Monitor PR for bot reviews, address feedback, push fixes              |
| `push`                      | Commit and push; creates PR if on branch                              |
| `simplify-lifecycle`        | Full architecture sweep, loops until nothing left to simplify         |
| `sync-conventions`          | Audit convention drift across all projects                            |
| `update-all`                | Bulk update all projects to latest, fix breakages, commit             |

## Custom agents

| Agent       | What it does                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend`  | Frontend dev agent with consolidated best practices (React, Next.js, design engineering, a11y). Uses browser automation to verify visual changes. |
| `librarian` | Explore remote repos, find code patterns, understand library internals                                                                            |
| `architect` | Deep technical analysis with extended thinking. Read-only.                                                                                        |
| `review`    | Code review agent                                                                                                                                 |
