# @kyh/skills

My Claude Code + Codex setup, distributed as an npm package. One command
installs my skills and global instructions into the right global
directories so they're available across every project.

## Install / update

```bash
npx @kyh/skills@latest install
```

Same command for a fresh machine and for updates. `@latest` stops npx from
reusing a cached older version.

```bash
npx @kyh/skills@latest install --dry-run   # print what would change
npx @kyh/skills@latest check               # drift between installed skills and external-skills.json
```

Developing in this repo: `pnpm -F @kyh/skills install:local` installs from the
working copy instead.

### What gets installed

Same model as [`npx skills`](https://github.com/vercel-labs/skills): a single
canonical store at `~/.agents`, with non-universal agents symlinking into it.

| Source (in this package)  | Target                          | Mechanism             |
| ------------------------- | ------------------------------- | --------------------- |
| `skills/<name>/`          | `~/.agents/skills/<name>`       | copy (canonical)      |
| `~/.agents/skills/<name>` | `~/.claude/skills/<name>`       | symlink               |
| `CLAUDE.md`               | `~/.claude/CLAUDE.md`           | copy                  |
| `mcp.json` → `mcpServers` | `~/.claude.json` → `mcpServers` | merged (JSON sub-key) |

**Universal agents** (codex, amp, opencode, goose, kimi) read `~/.agents`
directly. **Non-universal agents** (claude) get their own dirs symlinked to the
canonical store.

Package files are copied, not symlinked: npx runs the package from a cache dir
that gets pruned, so links into it would break. Edit skills and `CLAUDE.md`
here, then reinstall; edits made to the installed copies are overwritten.

What was copied is recorded in `~/.agents/.kyh-skills.json`, so a skill dropped
from the package is removed on the next install. If `~/.claude/CLAUDE.md` was
edited locally since the last install, it is backed up to `*.bak` first. MCP
servers are only added, never overwritten.

### Env

- `KYH_SKILLS_NO_EXTERNAL=1` — skip external skill repos.
- `KYH_SKILLS_CONCURRENCY=N` — max repos installing at once (default: all).

## External skills

On install, the CLI also installs the exact skills listed per repo in
[`external-skills.json`](./external-skills.json) using the bundled `skills` CLI
(`skills add <repo> -g -s <skill>... -y`; falls back to `npx skills` if
unresolved), then removes any other skill the CLI installed from those repos.
The file is the whole set: every machine that reinstalls converges on it, so
removals sync too.

- Repos install all in parallel by default; throttle with `KYH_SKILLS_CONCURRENCY`.
- Skip the whole step: `KYH_SKILLS_NO_EXTERNAL=1`.
- These install into the same canonical `~/.agents/skills`, so universal agents
  pick them up directly and Claude gets symlinks.
- `unmanaged` lists hand-installed skills with no repo. `check` tolerates
  them, but a fresh install won't recreate them.

Add a skill: list it under its repo, then reinstall. `check` flags anything
installed but unlisted, or listed but missing.

### Not installable from a repo

- **`motion`** — the [Motion AI Kit](https://motion.dev/docs/ai-kit). Proprietary (Motion+), not a GitHub/npm skill. Install it manually from motion.dev; `external-skills.json` can't reproduce it.
  Its MCP server ships in `mcp.json` and reads the Motion+ token from `MOTION_TOKEN` — export it on each machine (kept in an untracked file such as `~/.secrets.zsh`); without it the server connects but its tools fail.

## Custom skills

| Skill              | What it does                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| `pr`               | Commit, push, open PR, then fix bot reviews and failing checks until clean |
| `sync-conventions` | Audit convention drift across all projects                                 |
| `update-all`       | Bulk update all projects to latest, fix breakages, commit                  |
