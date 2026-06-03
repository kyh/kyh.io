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

| Source (in this package) | Target | Mechanism |
| --- | --- | --- |
| `skills/<name>/` | `~/.claude/skills/<name>` | symlink |
| `agents/<name>.md` | `~/.claude/agents/<name>.md` | symlink |
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | symlink |
| `agents/<name>.md` | `~/.codex/agents/<name>.toml` | generated (Codex needs TOML) |
| `mcp.json` → `mcpServers` | `~/.claude.json` → `mcpServers` | merged (JSON sub-key) |

Symlinks mean edits to the installed source show up everywhere immediately.
Codex agents are **generated** (Codex agents are TOML, not markdown) and MCP
servers are **merged** (they live under a key inside `~/.claude.json`) — neither
can be a symlink.

Existing real files are never deleted: a clashing `~/.claude/CLAUDE.md` (or
skill/agent) is renamed to `*.bak` before linking. Hand-written Codex agent
TOMLs are left untouched.

### Flags / env

- `--dry-run` (or `KYH_SKILLS_DRY_RUN=1`) — print what would change, write nothing.
- `KYH_SKILLS_NO_LINK=1` — skip linking entirely.
- Linking is auto-skipped when `CI` is set.

## Adding skills from other repos

Pulls every skill from each repo into the global space via the `skills` CLI:

```bash
for repo in \
  vercel-labs/agent-browser \
  vercel/ai-elements \
  vercel/ai \
  emilkowalski/skill \
  vercel-labs/skills \
  anthropics/skills \
  mattpocock/skills \
  jakubkrehel/make-interfaces-feel-better \
  vercel-labs/next-skills \
  remotion-dev/skills \
  supabase/agent-skills \
  vercel-labs/agent-skills
do npx skills add "$repo" -g -s '*' -y; done
```

Cherry-pick a single skill: `npx skills add <repo>@<skill-name> -g -y`.

## Custom skills

| Skill                       | What it does                                                          |
| --------------------------- | --------------------------------------------------------------------- |
| `architect`                 | Deep technical analysis, architecture decisions, code review          |
| `librarian`                 | Multi-repo codebase exploration, find patterns across GitHub/npm/PyPI |
| `pr-lifecycle`              | Monitor PR for bot reviews, address feedback, push fixes              |
| `publish-and-sync-packages` | Bump + publish shared package, update all downstream consumers        |
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
