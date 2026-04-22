# Claude Config

Global [Claude.md](./CLAUDE.md)

## Install Skills

Installs every skill from each repo globally.

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

To cherry-pick a single skill instead: `npx skills add <repo>@<skill-name> -g -y`.

## Custom Skills

| Skill                       | What it does                                                          |
| --------------------------- | --------------------------------------------------------------------- |
| `architect`                 | Deep technical analysis, architecture decisions, code review          |
| `librarian`                 | Multi-repo codebase exploration, find patterns across GitHub/npm/PyPI |
| `package-updater`           | Update deps using taze                                                |
| `pr-lifecycle`              | Monitor PR for bot reviews, address feedback, push fixes              |
| `publish-and-sync-packages` | Bump + publish shared package, update all downstream consumers        |
| `push`                      | Commit and push; creates PR if on branch                              |
| `simplify-lifecycle`        | Full architecture sweep, loops until nothing left to simplify         |
| `sync-conventions`          | Audit convention drift across all projects                            |
| `update-all`                | Bulk update all projects to latest, fix breakages, commit             |

## Custom Agents

| Agent       | What it does                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend`  | Frontend dev agent with consolidated best practices (React, Next.js, design engineering, a11y). Uses browser automation to verify visual changes. |
| `librarian` | Explore remote repos, find code patterns, understand library internals                                                                            |
| `architect` | Deep technical analysis with extended thinking. Read-only.                                                                                        |
| `review`    | Code review agent                                                                                                                                 |
