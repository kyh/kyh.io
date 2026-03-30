---
name: publish-and-sync-packages
description: Bump, publish a shared package (e.g., @kyh/tsconfig), then update all downstream consumers across projects. Handles version bumps, npm publish, catalog updates, installs, builds, and commits. Use when you've changed a shared package and want to roll it out everywhere.
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep, Agent
---

# Publish Package

Publish a shared package and update all downstream consumers.

## Context

- Current directory: !pwd
- Git status: !git status --short
- Projects list: !grep -A20 'pupa()' ~/.zshrc | grep -oP '(?<=    )[\w/\-]+'
- Projects root: ~/Documents/Projects

## Arguments

The user should specify which package to publish. If not specified, infer from the current directory or ask.

## Process

### Phase 1: Identify

1. Read the package's `package.json` to get the current version and package name
2. Show current version and ask what bump type: patch, minor, or major
   - If the user already specified (e.g., "publish-package patch"), use that

### Phase 2: Bump & Publish

1. Bump the version in `package.json`
2. If there's a CHANGELOG.md, note that it may need updating (don't auto-generate)
3. Commit: `chore: release {package-name}@{version}`
4. Run `npm publish` (respects publishConfig in package.json)
5. Verify publish succeeded

### Phase 3: Find Consumers

Search all projects from pupa() for references to the package:
- `pnpm-workspace.yaml` catalog entries
- `package.json` dependencies/devDependencies
- Skip `node_modules`

List all consumers found.

### Phase 4: Update Consumers

For each consuming project, in parallel:

1. Update the version in `pnpm-workspace.yaml` catalog (or package.json if not using catalog)
2. Run `pnpm install`
3. Check if any redundant overrides can be removed now that the shared package includes them
   - e.g., if `@kyh/tsconfig` now includes `rootDir`, remove local `rootDir` overrides in tsconfigs that extend it
4. Run `pnpm build --force` to verify
5. If build fails, fix the issue (the new package version may have breaking changes the consumer needs to adapt to)
6. Commit: `chore: update {package-name} to {version}`

Do NOT push unless asked.

### Phase 5: Summary

```
Published {package-name}@{version}
------------------------------------
Consumers updated: N/N
Redundant overrides removed:
  - project/file: removed X
Failed:
  - project: error
```

## Rules

- Always verify `npm publish` succeeded before updating consumers.
- When removing redundant overrides, verify the build still passes after removal.
- Commit separately: one commit for the publish, one commit per consumer.
- Do NOT push unless asked.
