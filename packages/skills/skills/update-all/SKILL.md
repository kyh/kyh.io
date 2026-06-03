---
name: update-all
description: Update all packages to latest across all projects defined in ~/.zshrc pupa(). Handles breaking changes, fixes build failures, and commits per project. Smarter version of the pupa() shell function. Use when you want to bulk-update dependencies.
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep, Agent
---

# Update All

Update all dependencies to their latest versions across every project, fix breakages, and commit.

## Context

- Projects list: !grep -A20 'pupa()' ~/.zshrc | grep -oP '(?<=    )[\w/\-]+'
- Projects root: ~/Documents/Projects

## Process

### Phase 1: Update

For each project (resolve as `~/Documents/Projects/{project}`), in parallel where possible:

1. Run `pnpm up --latest -r` to update all deps to latest major versions
2. Run `pnpm install`

### Phase 2: Build & Fix

For each project, spawn a parallel agent that:

1. Runs `pnpm build`
2. If build fails, reads the error and fixes it:
   - **TS errors**: Fix the actual issue (no `ignoreDeprecations`, no `as any`, no `!` assertions)
   - **Missing exports**: Replace removed APIs with alternatives (e.g., brand icons removed from lucide-react v1)
   - **Config changes**: Update configs for new major versions (e.g., vite 8 rolldown migration)
   - **Auto-generated files**: Fix the source/generator, not the output
3. Rebuilds after each fix
4. Loops until build passes or gives up after 5 attempts

Report any project that couldn't be fixed.

### Phase 3: Lint

Run `pnpm lint` per project. Should pass with 0 errors (warnings OK).

### Phase 4: Commit

For each project that has changes:

```
git add -A && git commit -m "chore: update packages"
```

Do NOT push unless the user explicitly asks.

### Phase 5: Summary

```
Update Complete
---------------
Projects updated: N/N
Build fixes needed:
  - project: description of fix
  - ...
Failed (needs manual intervention):
  - project: error summary
```

## Rules

- Use `pnpm up --latest -r` not `taze` — taze misses major version bumps
- Fix root causes, not symptoms. No `ignoreDeprecations`, no type assertions to silence errors.
- For auto-generated files (content-data.ts, etc.), fix the generator input, then regenerate.
- If a build was already broken BEFORE the update (check with `git stash && pnpm build && git stash pop`), skip that failure — it's not our problem.
- Commit per project, not one big commit.
- Do NOT push unless asked.
