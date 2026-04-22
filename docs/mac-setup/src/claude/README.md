# Claude Config

Global [Claude.md](./CLAUDE.md)

## Install Skills

```bash
for pkg in \
  vercel-labs/agent-browser@agent-browser \
  vercel/ai-elements@ai-elements \
  vercel/ai@ai-sdk \
  coreyhaines31/marketingskills@copywriting \
  emilkowalski/skill@emil-design-eng \
  vercel-labs/skills@find-skills \
  anthropics/skills@frontend-design \
  mattpocock/skills@grill-me \
  mattpocock/skills@improve-codebase-architecture \
  jakubkrehel/make-interfaces-feel-better@make-interfaces-feel-better \
  vercel-labs/next-skills@next-best-practices \
  vercel-labs/next-skills@next-cache-components \
  remotion-dev/skills@remotion-best-practices \
  mattpocock/skills@request-refactor-plan \
  anthropics/skills@skill-creator \
  supabase/agent-skills@supabase-postgres-best-practices \
  mattpocock/skills@tdd \
  mattpocock/skills@to-issues \
  mattpocock/skills@to-prd \
  vercel-labs/agent-skills@vercel-composition-patterns \
  vercel-labs/agent-skills@vercel-react-best-practices \
  vercel-labs/agent-skills@vercel-react-native-skills \
  vercel-labs/agent-skills@web-design-guidelines
do npx skills add "$pkg" -g -y; done
```

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
