# Claude Config

Global [Claude.md](./CLAUDE.md)

## Install Skills

```bash
npx skills add vercel-labs/agent-browser@agent-browser -g
npx skills add vercel/ai@ai-sdk -g
npx skills add coreyhaines31/marketingskills@copywriting -g
npx skills add emilkowalski/design-engineering-skill@design-engineering -g
npx skills add vercel-labs/skills@find-skills -g
npx skills add anthropics/skills@frontend-design -g
npx skills add anthropics/skills@grill-me -g
npx skills add anthropics/skills@improve-codebase-architecture -g
npx skills add vercel-labs/next-skills@next-best-practices -g
npx skills add vercel-labs/next-skills@next-cache-components -g
npx skills add anthropics/skills@prd-to-issues -g
npx skills add anthropics/skills@prd-to-plan -g
npx skills add remotion-dev/remotion@remotion-best-practices -g
npx skills add anthropics/skills@request-refactor-plan -g
npx skills add anthropics/skills@skill-creator -g
npx skills add supabase/agent-skills@supabase-postgres-best-practices -g
npx skills add anthropics/skills@tdd -g
npx skills add vercel-labs/agent-skills@vercel-composition-patterns -g
npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g
npx skills add vercel-labs/agent-skills@vercel-react-native-skills -g
npx skills add vercel-labs/agent-skills@web-design-guidelines -g
npx skills add anthropics/skills@write-a-prd -g
```

## Custom Skills

| Skill                       | What it does                                                          |
| --------------------------- | --------------------------------------------------------------------- |
| `librarian`                 | Multi-repo codebase exploration, find patterns across GitHub/npm/PyPI |
| `oracle`                    | Senior engineering advisor, code review, architecture decisions       |
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
