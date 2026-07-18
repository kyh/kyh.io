---
name: sync-conventions
description: Audit and fix convention drift across all projects defined in ~/.zshrc pupa(). Checks tooling choice (oxlint/oxfmt vs eslint/prettier), oxlint type-safety rules, script consistency, tsconfig, stale config references, database tooling (drizzle push scripts + .env.production.local convention, no stale migration dirs), secret hygiene (no tracked .env), and shared-UI/config drift (ui source glob, typed next.config). Package versions are out of scope — use update-all for those. Use when you want to ensure all projects follow the same patterns.
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

### 5. oxlint Rule Config
The type-safety guardrails must be enforced in `.oxlintrc.json` (mirrors the CLAUDE.md "never compromise type safety" standard — it's the tool *config*, not a version):
- `typescript/no-explicit-any`: error
- `typescript/no-non-null-assertion`: error
- `typescript/consistent-type-assertions`: `["error", { "assertionStyle": "never" }]`
- `jsx-a11y` present in `plugins` (for repos with a web/JSX app)

### 6. Database Tooling Convention
For any repo with a database (drizzle + Turso / Postgres / D1). The db scripts live in the db-owning package — `packages/db` normally, or the DB-owning app (e.g. `apps/cloud`) for D1-bound-to-a-worker setups. **Both use the SAME convention**; the only difference is a `db:` script prefix when the scripts share a multi-purpose app's package.json.

Canonical scripts (relative `../../.env*` paths resolve to repo root):
- `with-env`: `dotenv -e ../../.env --`
- `push` (or `db:push`): `pnpm with-env drizzle-kit push`
- `push:remote` (or `db:push:remote`): `dotenv -e ../../.env.production.local -- drizzle-kit push` — **never a bare `drizzle-kit push` relying on loose shell env**
- `studio` (or `db:studio`): `pnpm with-env drizzle-kit studio`
- D1 repos also keep `push:local` (or `db:push:local`): `drizzle-kit push --config drizzle.config.local.ts --force`

Env files:
- Every repo with a **remote** DB must have `.env.production.local` (gitignored) so `push:remote` works. Flag if missing.
- Turso split: `.env` = local dev DB, `.env.production.local` = prod. D1: both hold the same `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_DATABASE_ID` / `CLOUDFLARE_D1_TOKEN` (single CF account across projects — only `DATABASE_ID` differs).

Schema is source of truth, **push-based, no migration files**:
- Flag any committed `packages/db/drizzle/` (or `migrations/`) dir — it drifts from the push-managed live DB. Delete it and any wrangler D1 `"migrations_dir"` that points at it. (Durable-Object `"migrations"` blocks in wrangler.jsonc are unrelated class migrations — leave them.)

### 7. Secret Hygiene
- No real env file is git-tracked. `git ls-files | grep -iE '(^|/)\.env(\.|$)|\.dev\.vars$'` must return nothing but `.example`/`.sample`/`.template`.
- `.env`, `.env.local`, `.env.production.local`, `.dev.vars` must all be gitignored (`git check-ignore`).

### 8. Shared UI + Config Drift
- `packages/ui/src/styles/globals.css` must NOT contain `@source "../../../../apps/**/*.{ts,tsx}"` (or a `components/**` cross-scan). Each app auto-detects its own Tailwind sources; the cross-app glob makes every app ship every other app's classes. Keep only the local `@source "../**/*.{ts,tsx}"`.
- `next.config` is typed `.ts` (not `.js`) and has no `typescript: { ignoreBuildErrors: true }`.
- `turbo.json` build/typecheck edges use `^topo` (not `^build`) and drop `dist/**` outputs when no package actually emits a dist (ties into the internal-package rule in check 3).

## Output Format

After running all checks, output a summary table (columns map to checks 1–8; `-` = N/A, e.g. no DB or no web app):

```
Project     | Tool | Scripts | TSConfig | Stale | oxlint | DB | Secrets | UI/Cfg
------------+------+---------+----------+-------+--------+----+---------+-------
kyh.io      | pass |  pass   |   pass   | pass  |  pass  | -  |  pass   | pass
dataembed   | pass |  pass   |   pass   | pass  |  pass  |dft |  pass   | pass
...
```

Then list each drift issue with the specific file and what needs to change.

## Fixing

After showing the audit results, ask: "Fix all drift issues? (y/n)"

If yes, fix each issue:
1. Remove stale references (eslint/prettier configs, dead catalog entries)
2. Fix scripts to the canonical oxlint/oxfmt form
3. Fix tsconfig settings
4. Add missing oxlint type-safety rules (check 5) — then **fix every violation the new rules surface**; adding a rule that leaves lint red is not a fix. Repo-wide violation counts can be large; if you can't get to error-level cleanly, ratchet (error in shared packages, `warn` elsewhere via `overrides`) and `log()` what was deferred.
5. Align DB scripts to the canonical form (check 6); create any missing `.env.production.local` (gitignored) from the repo's own prod creds — **never commit it, and never copy a token between repos** (the harness blocks cross-repo cred movement; hand that step to the user). Delete stale `drizzle/` migration dirs + their wrangler `migrations_dir` refs.
6. Fix ui source-glob / next.config / turbo edges (check 8).
7. Run `pnpm install` per project (only if deps/catalogs changed)
8. Verify `pnpm typecheck` + `pnpm lint` pass per project (run a real `next build` too when you touched next.config or app render code — typecheck alone misses prerender/client-boundary breaks).
9. Commit per project with message: `chore: sync conventions`

Use parallel agents per project when possible to speed things up.

**Out of scope — do NOT do these here:**
- **Running `push:remote` against a live DB.** Convention-syncing the DB means the *scripts, env files, and migration-dir cleanup* — not applying schema to prod. A live push can hit drift (drizzle tries to recreate tables) and is a data operation. If a live DB has drifted from `schema.ts`, note it and leave it for a deliberate, separately-confirmed reconciliation (throwaway data → drop-all + fresh push; real data → verify the push is additive-only first).
- **Secret remediation is urgent, not optional:** if check 7 finds a *tracked* real env file, that's a leaked secret — `git rm --cached` it, confirm it's gitignored, and tell the user to rotate the exposed credentials. Don't bury it in the convention summary.

## Rules

- Never bump or align package *versions* here — that's `update-all`'s job. If a project is on an old oxlint/typescript version, that's not drift for this skill; flag it only if the tool is missing or the wrong tool entirely.
