---
name: release
description: Bump, build, publish, tag, and changelog the publishable npm packages in this monorepo — `kyh` (CLI), `@kyh/skills`, and the lockstep config pair `@kyh/eslint-config` + `@kyh/tsconfig`. Skips packages with no changes since their last release. Use when the user wants to ship npm versions. Args optional: which package(s) and bump type, e.g. "release cli patch", "release skills minor", "release configs patch", "release all".
allowed-tools: Bash(*), Read, Edit, Write
---

# Release

Cut new npm versions of the publishable packages in this repo. Replaces the old changesets flow (`publish:packages`).

## Context

- Repo root: `/Users/kyh/Documents/Projects/kyh/kyh.io`
- Releasable units (path = where commits "count" for change detection; tag prefix = npm name):
  - **cli** → `kyh` → `apps/cli` → tag `kyh@`
  - **skills** → `@kyh/skills` → `packages/skills` → tag `@kyh/skills@`
  - **configs** → `@kyh/eslint-config` (`packages/eslint`) + `@kyh/tsconfig` (`packages/typescript`) — a **fixed/lockstep pair**: they always share one version and release together. `@kyh/eslint-config` devDepends on `@kyh/tsconfig` via `workspace:*`. Tags `@kyh/eslint-config@` and `@kyh/tsconfig@` (same version).
- All four are public (`publishConfig.access: "public"`).
- Only `kyh` and `@kyh/skills` have a `build` script. `@kyh/tsconfig` and `@kyh/eslint-config` are config-only — no build.
- Many internal apps (`@repo/*`) consume `@kyh/tsconfig`/`@kyh/eslint-config` via the workspace catalog. Rolling a new version out to **other repos'** catalogs is a separate concern — see the global `publish-and-sync-packages` skill. This skill is npm-only and does not touch downstream consumers.
- Current branch: !`git -C /Users/kyh/Documents/Projects/kyh/kyh.io rev-parse --abbrev-ref HEAD`
- Working tree: !`git -C /Users/kyh/Documents/Projects/kyh/kyh.io status --short`

## Arguments

Parse from the user message:
- Which unit(s): `cli`, `skills`, `configs`, or `all`. Default `all`.
- Bump type: `patch`, `minor`, `major`. Default `patch`.
- `--force` to release even if no changes since last tag (otherwise unchanged units are skipped).

If ambiguous, ask in one short sentence before proceeding.

## Process

### 1. Preflight

Run in parallel:
- `npm whoami` — must be `kaiyuhsu`. If not, stop and tell the user to `npm login`.
- `git status --porcelain` — if dirty in unrelated files, surface and ask whether to proceed.
- Current published versions for each candidate unit: `npm view kyh version`, `npm view @kyh/skills version`, `npm view @kyh/tsconfig version` (configs version).
- For each candidate unit, find its last tag and changes. Use the unit's path; for **configs** check both package paths:
  ```
  LAST=$(git tag --list '<tag-prefix>*' --sort=-v:refname | head -1)
  git log --oneline ${LAST:+$LAST..}HEAD -- <path> [<path2 for configs>]
  ```
  If the log is empty and `--force` was not passed, **drop that unit** with a note. If every unit drops, stop.

### 2. Bump

For each remaining unit, edit `version` in its `package.json`(s), keeping semver:
- **cli**: `apps/cli/package.json`
- **skills**: `packages/skills/package.json`
- **configs**: bump **both** `packages/eslint/package.json` and `packages/typescript/package.json` to the **same** new version (lockstep — never let them diverge).

If the published `latest` is ahead of a local file (out-of-band publish), use the published version as the floor and bump from there.

### 3. Changelog

For each remaining unit, prepend an entry to `<path>/CHANGELOG.md` (create if missing; for configs write to **both** package dirs). Source bullets from `git log --pretty='- %s' ${LAST:+$LAST..}HEAD -- <path>`, dropping merge commits, prior `release:` commits, and pure dep bumps. Format:

```markdown
# Changelog

## <new-version> — <YYYY-MM-DD>

- <commit subject>
```

Terse bullets — sacrifice grammar for concision. If unsure, show the proposed entry before writing.

### 4. Install + build

- `pnpm install` from repo root — defensive; deps may be unlinked after a pull.
- For units with a `build` script (`cli`, `skills`), force a clean build:
  - `pnpm --filter <name> build`
- `configs` have no build — skip.

### 5. Publish

For each remaining unit, from each package's directory:
```
pnpm publish --access public --no-git-checks
```
- For **configs**, publish `@kyh/tsconfig` first, then `@kyh/eslint-config` (the latter's `workspace:*` dep on tsconfig is rewritten to the exact new version by pnpm at publish — publishing tsconfig first keeps the registry consistent).
- `--no-git-checks` because we commit + tag *after* publish, so we never tag a commit for a publish that failed.

### 6. Verify

`npm view <pkg> dist-tags` for each published package — confirm `latest` matches the new version. Registry can lag; retry once after `sleep 5` before flagging.

### 7. Commit, tag, push

Single commit covering all bumps + changelogs:
```
release: kyh@<v>, @kyh/skills@<v>, @kyh/tsconfig@<v>, @kyh/eslint-config@<v>   (only the units shipped)
```
Stage only the changed `package.json` + `CHANGELOG.md` files. Then one annotated tag per **published package** (configs = two tags, same version), pointing at that commit:
```
git tag -a '<pkg-name>@<version>' -m '<pkg-name>@<version>'
```
git accepts `@` in tag names (e.g. `@kyh/skills@0.2.0`). Then:
```
git push --follow-tags origin <current-branch>
```

### 8. Report

```
Released:
  kyh@X.Y.Z                 (tag: kyh@X.Y.Z)
  @kyh/skills@X.Y.Z         (tag: @kyh/skills@X.Y.Z)
  @kyh/tsconfig@X.Y.Z       (tag: @kyh/tsconfig@X.Y.Z)
  @kyh/eslint-config@X.Y.Z  (tag: @kyh/eslint-config@X.Y.Z)
Skipped (no changes): <unit> (since <last-tag>)
Commit: <sha> (pushed to origin/<branch>)
```
If `@kyh/tsconfig` or `@kyh/eslint-config` shipped, remind the user: run the `publish-and-sync-packages` skill to roll the new version into consumer repos' catalogs.
If anything failed, lead with the failure and the exact state (published? committed? tagged? pushed?).

## Rules

- `@kyh/eslint-config` and `@kyh/tsconfig` are a fixed pair — always the same version, always released together. Never bump or publish one without the other.
- Tags are created **after** successful publish + verify, never before.
- If `npm publish` fails with `EPUBLISHCONFLICT` (version already on registry), bump again rather than overwrite.
- Never `--force` push or amend prior release commits. On a partial publish (some packages shipped), commit + tag + push what shipped, then handle the rest separately.
- Skipping unchanged units is the default. Pass `--force` to override.
- Downstream catalog sync across other repos is out of scope — defer to `publish-and-sync-packages`.
- Bootstrap: if no prior tag exists for a unit (e.g. `@kyh/skills` first release), treat its history as the changes, capping changelog bullets at the last 20 commits.
