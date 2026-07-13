---
name: sync-conventions
description: Audit and fix convention drift across all projects defined in ~/.zshrc pupa(). Checks tooling choice (oxlint/oxfmt vs eslint/prettier), script consistency, tsconfig settings, and stale config references. Package versions are out of scope — use update-all for those. Use when you want to ensure all projects follow the same patterns.
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep, Agent
---

# Sync Conventions

Audit all projects for convention drift and optionally fix issues found.

This skill is about **patterns**, not versions. Which tools are used, how scripts are named, what tsconfig settings are set, whether stale eslint/prettier config lingers. It does **not** touch package versions — bumping or aligning dependency versions belongs to `update-all`.

## Context

- Projects list from zsh: !`grep -A20 'pupa()' ~/.zshrc | grep -oP '(?<=    )[\w/\-]+'`
- Current working directory: !`pwd`

## Convention Checks

Run each check across ALL projects from the pupa() list (resolve paths as `~/Documents/Projects/{project}`). For each check, report a table of project -> status (pass/drift).

### 1. Tooling Alignment
- All projects must use `oxlint` and `oxfmt` (not eslint/prettier) for lint/format
- Check root `package.json` devDependencies for oxlint, oxfmt
- Flag any eslint, prettier, @kyh/eslint-config, @kyh/prettier-config in deps or catalogs
- Flag any `eslint.config.*` or `.eslintrc.*` or `.prettierrc.*` files
- This is about tool *choice*, not tool version (versions → `update-all`)

### 2. Script Consistency
Root `package.json` scripts should include:
- `"lint"`: should use `oxlint`
- `"lint:fix"`: should use `oxlint --fix`
- `"format"`: should use `oxfmt`
- `"format:fix"`: should use `oxfmt --write`

### 3. TypeScript Config Health
- No `ignoreDeprecations` in any tsconfig.json
- No `baseUrl` without path aliases (deprecated in TS6)
- `lib` should use ES2023+ (not ES2022 or older)
- Internal workspace packages (`exports` → `./src/*.ts`, not published) must extend
  `@kyh/tsconfig/base.json` and have NO `build` script and no `dev: tsc`. Their `typecheck` is
  plain `tsc --noEmit`. Emitting `.d.ts` for them is dead work — `exports` points at source, so
  nothing ever resolves the `dist`, and `turbo`'s `^build` makes every app build wait on it.
- Packages published to npm (`exports`/`publishConfig` → `./dist/*.d.ts`) inline their own
  tsconfig — no `extends`, no `@kyh/tsconfig` devDependency — so they build standalone. They are
  the only packages that keep a `build` script.
- `@kyh/tsconfig` ships `base.json` only. Any reference to `internal-package.json` is stale.

### 4. Stale References
- No `"prettier": "@kyh/prettier-config"` in any package.json
- No eslint/prettier in pnpm-workspace.yaml catalogs
- No unused `@kyh/eslint-config` or `@kyh/prettier-config` in catalogs or deps

## Output Format

After running all checks, output a summary table:

```
Project          | Tooling | Scripts | TSConfig | Stale Refs
-----------------+---------+---------+----------+-----------
kyh.io           |  pass   |  pass   |   pass   |    pass
dataembed        |  drift  |  pass   |   pass   |    pass
...
```

Then list each drift issue with the specific file and what needs to change.

## Fixing

After showing the audit results, ask: "Fix all drift issues? (y/n)"

If yes, fix each issue:
1. Remove stale references (eslint/prettier configs, dead catalog entries)
2. Fix scripts to the canonical oxlint/oxfmt form
3. Fix tsconfig settings
4. Run `pnpm install` per project (only if deps/catalogs changed)
5. Verify `pnpm build` passes per project
6. Commit per project with message: `chore: sync conventions`

Use parallel agents per project when possible to speed things up.

## Rules

- Never bump or align package *versions* here — that's `update-all`'s job. If a project is on an old oxlint/typescript version, that's not drift for this skill; flag it only if the tool is missing or the wrong tool entirely.
