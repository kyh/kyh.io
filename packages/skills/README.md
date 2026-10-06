# @kyh/skills

My Claude Code + Codex setup, distributed as an npm package. Installing it
symlinks my skills and global instructions into the right global
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

| Source (in this package)     | Target                          | Mechanism             |
| ---------------------------- | ------------------------------- | --------------------- |
| `skills/<name>/`             | `~/.agents/skills/<name>`       | symlink (canonical)   |
| `~/.agents/skills/<name>`    | `~/.claude/skills/<name>`       | symlink               |
| `~/.agents/agents/<name>.md` | `~/.claude/agents/<name>.md`    | symlink               |
| `CLAUDE.md`                  | `~/.claude/CLAUDE.md`           | symlink               |
| `mcp.json` → `mcpServers`    | `~/.claude.json` → `mcpServers` | merged (JSON sub-key) |

**Universal agents** (codex, amp, opencode, goose, kimi) read `~/.agents`
directly — nothing else to do. **Non-universal agents** (claude) get
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

On install, the postinstall also installs the exact skills listed per repo in
[`external-skills.json`](./external-skills.json) using the bundled `skills` CLI
(`skills add <repo> -g -s <skill>... -y`; falls back to `npx skills` if
unresolved), then removes any other skill the CLI installed from those repos.
The file is the whole set: every machine that reinstalls converges on it, so
removals sync too.

- Repos install all in parallel by default; throttle with `KYH_SKILLS_CONCURRENCY`.
- Skip the whole step: `KYH_SKILLS_NO_EXTERNAL=1`.
- These install into the same canonical `~/.agents/skills`, so universal agents
  pick them up directly and Claude gets symlinks.
- `unmanaged` lists hand-installed skills with no repo. `check:external` tolerates
  them, but a fresh install won't recreate them.

Add a skill: list it under its repo, then rerun the link script (or
`npx skills add <repo> -s <skill> -g -y` and list it). `pnpm check:external`
flags anything installed but unlisted, or listed but missing.

### Not installable from a repo

- **`motion`** — the [Motion AI Kit](https://motion.dev/docs/ai-kit). Proprietary (Motion+), not a GitHub/npm skill. Install it manually from motion.dev; `external-skills.json` can't reproduce it.

## Custom skills

| Skill                | What it does                                                               |
| -------------------- | -------------------------------------------------------------------------- |
| `pr`                 | Commit, push, open PR, then fix bot reviews and failing checks until clean |
| `simplify-lifecycle` | Full architecture sweep, loops until nothing left to simplify              |
| `sync-conventions`   | Audit convention drift across all projects                                 |
| `update-all`         | Bulk update all projects to latest, fix breakages, commit                  |
