---
name: sync-conventions
description: Audit and fix convention drift across all projects defined in ~/.zshrc pupa(). Checks shared config versions, tooling alignment, stale references, and script consistency. Use when you want to ensure all projects follow the same patterns.
allowed-tools: Bash(*), Read, Edit, Write, Glob, Grep, Agent
---

# Sync Conventions

Audit all projects for convention drift and optionally fix issues found.

## Context

- Projects list from zsh: !grep -A20 'pupa()' ~/.zshrc | grep -oP '(?<= )[\w/\-]+'
- Shared tsconfig version: !cat ~/Documents/Projects/kyh/kyh.io/packages/typescript/package.json | grep '"version"'
- Current working directory: !pwd

## Convention Checks

Run each check across ALL projects from the pupa() list (resolve paths as `~/Documents/Projects/{project}`). For each check, report a table of project -> status (pass/drift).

### 1. Shared Config Versions

- `@kyh/tsconfig` catalog version should match latest published version
- Check `pnpm-workspace.yaml` catalog entries

### 2. Tooling Alignment

- All projects must use `oxlint` and `oxfmt` (not eslint/prettier) for lint/format
- Check root `package.json` devDependencies for oxlint, oxfmt
- Flag any eslint, prettier, @kyh/eslint-config, @kyh/prettier-config in deps or catalogs
- Flag any `eslint.config.*` or `.eslintrc.*` or `.prettierrc.*` files

### 3. Script Consistency

Root `package.json` scripts should include:

- `"lint"`: should use `oxlint`
- `"lint:fix"`: should use `oxlint --fix`
- `"format"`: should use `oxfmt`
- `"format:fix"`: should use `oxfmt --write`

### 4. TypeScript Config Health

- No `ignoreDeprecations` in any tsconfig.json
- No `baseUrl` without path aliases (deprecated in TS6)
- `lib` should use ES2023+ (not ES2022 or older)
- tsconfigs extending `@kyh/tsconfig/internal-package.json` should NOT have redundant `rootDir: "./src"`

### 5. Stale References

- No `"prettier": "@kyh/prettier-config"` in any package.json
- No eslint/prettier in pnpm-workspace.yaml catalogs
- No unused `@kyh/eslint-config` or `@kyh/prettier-config` in catalogs or deps

### 6. Package Version Consistency

- `oxlint` version should be the same across all projects
- `oxfmt` version should be the same across all projects
- `typescript` version should be the same across all projects

## Output Format

After running all checks, output a summary table:

```
Project          | Configs | Tooling | Scripts | TSConfig | Stale Refs | Versions
-----------------+---------+---------+---------+----------+------------+---------
kyh.io           |   pass  |  pass   |  pass   |   pass   |    pass    |  pass
dataembed        |   pass  |  drift  |  pass   |   pass   |    pass    |  drift
...
```

Then list each drift issue with the specific file and what needs to change.

## Fixing

After showing the audit results, ask: "Fix all drift issues? (y/n)"

If yes, fix each issue:

1. Update catalog versions
2. Remove stale references
3. Fix scripts
4. Run `pnpm install` per project
5. Verify `pnpm build` passes per project
6. Commit per project with message: `chore: sync conventions`

Use parallel agents per project when possible to speed things up.
