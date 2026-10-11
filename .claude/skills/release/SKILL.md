---
name: release
description: Bump, build, publish, tag, and changelog the publishable npm packages in this monorepo — `kyh` (CLI), `@kyh/skills`, and `@kyh/tsconfig`. Skips packages with no changes since their last release. Use when the user wants to ship npm versions. Args optional: which package(s) and bump type, e.g. "release cli patch", "release skills minor", "release configs patch", "release all".
allowed-tools: Bash(*), Read, Edit, Write
---

# Release

Cut new npm versions of the publishable packages in this repo. Replaces the old changesets flow (`publish:packages`).

## Context

- Repo root: `/Users/kyh/Documents/Projects/kyh/kyh.io`
- Releasable units (path = where commits "count" for change detection; tag prefix = npm name):
  - **cli** → `kyh` → `apps/cli` → tag `kyh@`
  - **skills** → `@kyh/skills` → `packages/skills` → tag `@kyh/skills@`
  - **configs** → `@kyh/tsconfig` → `packages/typescript` → tag `@kyh/tsconfig@`
- All are public (`publishConfig.access: "public"`).
- Only `kyh` (the CLI) has a `build` script. `@kyh/skills` and `@kyh/tsconfig` publish files as-is — no build.
- **cli is special**: `apps/cli/package.json` is `private: true` — it is never published directly. Its build (`bun scripts/build.ts`) bun-compiles standalone binaries and stages **8 publish-ready packages** in `apps/cli/dist/npm/`: seven platform packages (`@kyh/cli-darwin-arm64`, `@kyh/cli-darwin-x64`, `@kyh/cli-linux-arm64`, `@kyh/cli-linux-x64`, `@kyh/cli-linux-arm64-musl`, `@kyh/cli-linux-x64-musl`, `@kyh/cli-win32-x64`) plus the main `kyh` package (a Node launcher shim with exact-pinned `optionalDependencies` on the platform packages). All 8 share the version from `apps/cli/package.json`. Building requires bun and the other platforms' opentui packages in node_modules (`supportedArchitectures` in `pnpm-workspace.yaml` handles this — run `pnpm install` if platform packages are missing); the two musl ones are fetched by the build itself into `apps/cli/.cache/`, so they cost no install.
- Many internal apps (`@repo/*`) consume `@kyh/tsconfig` via the workspace catalog. Rolling a new version out to **other repos'** catalogs is a separate concern — see the global `publish-and-sync-packages` skill. This skill is npm-only and does not touch downstream consumers.
- Current branch: !`git -C /Users/kyh/Documents/Projects/kyh/kyh.io rev-parse --abbrev-ref HEAD`
- Working tree: !`git -C /Users/kyh/Documents/Projects/kyh/kyh.io status --short`

## Arguments

Parse from the user message:

- Which unit(s): `cli`, `skills`, `configs`, or `all`. Default `all`.
- Bump type: `patch`, `minor`, `major`. Default `patch`.
- `--force` to release even if no changes since last tag (otherwise unchanged units are skipped).

If ambiguous, ask in one short sentence before proceeding.

**Sanity-check the bump type against the actual changes** (from the step-1 git log), even when one was passed explicitly. New features, redesigns, new packages, or distribution/install changes → suggest `minor`. Breaking CLI flags/behavior or dropped platform support → suggest `major`. If the requested bump undersells the changes, say so in one sentence and ask before proceeding — a wrong version on the registry can't be unpublished, only superseded.

## Process

### 1. Preflight

Run in parallel:

- `npm whoami` — must be `kaiyuhsu`. If not, stop and tell the user to `npm login`.
- `git status --porcelain` — if dirty in unrelated files, surface and ask whether to proceed.
- Current published versions for each candidate unit: `npm view kyh version`, `npm view @kyh/skills version`, `npm view @kyh/tsconfig version`.
- For each candidate unit, find its last tag and changes. Use the unit's path:
  ```
  LAST=$(git tag --list '<tag-prefix>*' --sort=-v:refname | head -1)
  git log --oneline ${LAST:+$LAST..}HEAD -- <path>
  ```
  If the log is empty and `--force` was not passed, **drop that unit** with a note. If every unit drops, stop.

### 2. Bump

For each remaining unit, edit `version` in its `package.json`(s), keeping semver:

- **cli**: `apps/cli/package.json`
- **skills**: `packages/skills/package.json`
- **configs**: `packages/typescript/package.json`

If the published `latest` is ahead of a local file (out-of-band publish), use the published version as the floor and bump from there.

### 3. Changelog

For each remaining unit, prepend an entry to `<path>/CHANGELOG.md` (create if missing). Source bullets from `git log --pretty='- %s' ${LAST:+$LAST..}HEAD -- <path>`, dropping merge commits, prior `release:` commits, and pure dep bumps. Format:

```markdown
# Changelog

## <new-version> — <YYYY-MM-DD>

- <commit subject>
```

Terse bullets — sacrifice grammar for concision. If unsure, show the proposed entry before writing.

### 4. Install + build

- `pnpm install` from repo root — defensive; deps may be unlinked after a pull.
- Only `cli` has a `build` script — force a clean build:
  - `pnpm --filter <name> build`
- `skills` and `configs` have no build — skip.

### 5. Publish

For each remaining unit, from each package's directory:

```
pnpm publish --access public --no-git-checks
```

- For **cli**, publish from the staged dirs instead (never from `apps/cli` itself — it's private). Platform packages first, main `kyh` last, so `kyh`'s optionalDependencies never point at unpublished versions:
  ```
  for d in apps/cli/dist/npm/cli-*; do (cd "$d" && npm publish --access public); done
  (cd apps/cli/dist/npm/kyh && npm publish --access public)
  ```
  If any platform package is **brand-new to the registry** (first publish of that name), wait until `npm view <pkg> dist-tags` succeeds for all of them **before** publishing `kyh` — new-package creation can take minutes to propagate to npm's read endpoints, and during that window installs of the new `kyh` fail resolving its optionalDependencies. Re-publishes of existing packages propagate in seconds; no wait needed.
- `--no-git-checks` because we commit + tag _after_ publish, so we never tag a commit for a publish that failed.

### 6. Verify

`npm view <pkg> dist-tags` for each published package — confirm `latest` matches the new version. For **cli**, check `kyh` plus spot-check one platform package (`npm view @kyh/cli-darwin-arm64 dist-tags`). Registry can lag; retry once after `sleep 5` before flagging.

### 7. Commit, tag, push

Single commit covering all bumps + changelogs:

```
release: kyh@<v>, @kyh/skills@<v>, @kyh/tsconfig@<v>   (only the units shipped)
```

**`cd` back to the repo root first.** Step 5 publishes from inside package directories and the shell's cwd persists across calls — staging with repo-relative paths from `packages/skills` silently matches nothing.

Stage only the changed `package.json` + `CHANGELOG.md` files, then tag once per **published package**. **Chain every step with `&&`** so a failed commit cannot be followed by a tag:

```
cd <repo-root> &&
git add <path>/package.json <path>/CHANGELOG.md &&
git commit -m 'release: ...' &&
git tag -a '<pkg-name>@<version>' -m '<pkg-name>@<version>'
```

A bare newline-separated sequence is **not** acceptable here: `git commit` exits non-zero when nothing is staged, but the next line still runs and tags whatever `HEAD` happens to be — producing a release tag on an unrelated commit.

Then confirm the tag landed where you think before pushing:

```
git rev-list -n1 '<pkg-name>@<version>'   # must equal the release commit
git status --porcelain                    # must be empty
```

If the tag is on the wrong commit and has **not** been pushed, `git tag -d` it, fix the commit, and re-tag. Once pushed, don't rewrite — cut the next patch instead.

git accepts `@` in tag names (e.g. `@kyh/skills@0.2.0`). **cli gets a single `kyh@<version>` tag** — the `@kyh/cli-*` platform packages are build artifacts of the same release, never tagged individually. Then:

```
git push --follow-tags origin <current-branch>
```

### 8. Report

```
Released:
  kyh@X.Y.Z                 (tag: kyh@X.Y.Z)
  @kyh/skills@X.Y.Z         (tag: @kyh/skills@X.Y.Z)
  @kyh/tsconfig@X.Y.Z       (tag: @kyh/tsconfig@X.Y.Z)
Skipped (no changes): <unit> (since <last-tag>)
Commit: <sha> (pushed to origin/<branch>)
```

If `@kyh/tsconfig` shipped, remind the user: run the `publish-and-sync-packages` skill to roll the new version into consumer repos' catalogs.
If anything failed, lead with the failure and the exact state (published? committed? tagged? pushed?).

## Rules

- Tags are created **after** successful publish + verify, never before, and only in an `&&` chain behind a successful commit — never as a standalone follow-up line.
- If `npm publish` fails with `EPUBLISHCONFLICT` (version already on registry), bump again rather than overwrite.
- Never `--force` push or amend prior release commits. On a partial publish (some packages shipped), commit + tag + push what shipped, then handle the rest separately.
- Skipping unchanged units is the default. Pass `--force` to override.
- Downstream catalog sync across other repos is out of scope — defer to `publish-and-sync-packages`.
- Bootstrap: if no prior tag exists for a unit (e.g. `@kyh/skills` first release), treat its history as the changes, capping changelog bullets at the last 20 commits.
