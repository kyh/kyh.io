---
name: update-all
description: Update all packages to latest across all projects defined in ~/.zshrc pupa(). Handles breaking changes, fixes build failures, and commits per project. Smarter version of the pupa() shell function. Use when you want to bulk-update dependencies.
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep, Agent
---

# Update All

Update all dependencies to their latest versions across every project, fix breakages, and commit.

## Context

- Projects list: !grep -A20 'pupa()' ~/.zshrc | grep -oP '(?<= )[\w/\-]+'
- Projects root: ~/Documents/Projects

## Process

### Phase 1: Update

For each project (resolve as `~/Documents/Projects/{project}`), in parallel where possible:

1. Run `pnpm up --latest -r` to update all deps to latest major versions
2. Run `pnpm install`

### Phase 1b: Expo apps — undo what `--latest` should not have touched

Any package.json containing `"expo"` is **SDK-pinned**: Expo dictates the version of
`react`, `react-dom`, `react-native`, and every `react-native-*` native module. `pnpm up
--latest` does not know this and will happily push them past the SDK, which breaks the
app in ways that do not show up in `pnpm build`.

For each Expo app: `cd <expo-app> && npx expo install --check`, then pin every package it
lists back to the expected version. Re-run until it prints `Dependencies are up to date`.

Keep Expo's React out of the shared catalog — it legitimately diverges from web's. Put it
in a named `expo:` catalog (see `init`, `yours-sincerely`) so it is separately bumpable.

### Phase 2: Verify & Fix

For each project, spawn a parallel agent that:

1. Runs the repo's own gate: `pnpm verify` if it exists, else `pnpm typecheck && pnpm lint && pnpm build`.
   **`pnpm build` alone is not enough** — it typically skips tests and does not typecheck
   sibling packages (mobile, shared UI), so real breakage hides behind a green build.
2. If it fails, reads the error and fixes it:
   - **TS errors**: Fix the actual issue (no `ignoreDeprecations`, no `as any`, no `!` assertions)
   - **Missing exports**: Replace removed APIs with alternatives (e.g., brand icons removed from lucide-react v1)
   - **Config changes**: Update configs for new major versions (e.g., vite 8 rolldown migration)
   - **Auto-generated files**: Fix the source/generator, not the output
   - **Fixture drift**: a seeded-random bump (faker et al.) shifts generated data. Update the
     expected values and any docs quoting them — the test is still testing the right thing.
3. Re-runs the gate after each fix
4. Loops until the gate passes or gives up after 5 attempts

Report any project that couldn't be fixed.

### Phase 3: Commit

For each project that has changes:

```
git add -u && git commit -m "chore: update packages"
```

Use `git add -u` (tracked files only) — NOT `-A`. Updates only touch tracked files (package.json, lockfile, fixed source). `-A` would sweep in unrelated WIP (untracked drafts, scratch files, AGENTS.md, etc.) into the chore commit. If a bump genuinely creates a new tracked artifact, stage it explicitly by path.

Do NOT push unless the user explicitly asks.

### Phase 4: Summary

```
Update Complete
---------------
Projects updated: N/N
Fixes needed:
  - project: description of fix
  - ...
Pinned back (follow-up work, not done):
  - project: package, why adapting is a rewrite
Failed (needs manual intervention):
  - project: error summary
```

## Rules

- Use `pnpm up --latest -r` not `taze` — taze misses major version bumps
- Fix root causes, not symptoms. No `ignoreDeprecations`, no type assertions to silence errors.
- **A major that is really a rewrite is not a chore.** If adapting to it means reworking a
  feature (e.g. `@tanstack/react-table` v8→v9 rewrites the table API), pin that package back
  to the previous major, keep every other update, and report it as follow-up work. Do not
  rewrite a feature inside a `chore: update packages` commit, and do not reach for a
  compatibility shim (`/legacy` entrypoints) to dodge the decision.
- For auto-generated files (content-data.ts, etc.), fix the generator input, then regenerate.
- If a build was already broken BEFORE the update (check with `git stash && pnpm build && git stash pop`), skip that failure — it's not our problem.
- Commit per project, not one big commit.
- Do NOT push unless asked.
