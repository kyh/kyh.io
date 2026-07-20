# AGENTS.md

**kyh.io** is a personal pnpm + Turborepo monorepo of nine _independent_ apps — three Next.js, four Vite SPAs, one Bun/OpenTUI CLI, one Cloudflare Worker. There is no shared data layer, no shared UI package, and no cross-app runtime coupling: each app is its own product. This is the tool-agnostic guide for coding agents — it's meant to be run, not just read. Claude also reads `CLAUDE.md`; both point back here.

## Quickstart (headless)

```sh
pnpm install
pnpm dev:kyh    # → http://localhost:3000
```

That's the whole setup. There is no bootstrap script, no Docker, no local database — seven of the nine apps run with `pnpm install` alone. Node >= 24, pnpm 10.33 (`packageManager` pins it); `pnpm dev:cli` additionally needs [Bun](https://bun.sh).

Two apps read a `.env`, loaded per-app by `dotenv-cli` (a missing file is not an error — the dev server still starts):

```sh
cp apps/kyh/.env.example apps/kyh/.env                  # optional: without it, project images fall back to a local placeholder
cp apps/policingice/.env.example apps/policingice/.env  # required: any DB-backed route throws without TURSO_DATABASE_URL
```

`pnpm dev` starts _everything_ at once via `turbo watch`. Prefer a single `pnpm dev:<app>` — `dev:kyh` and `dev:policingice` both bind :3000 and cannot run together.

## Databases and credentials

**policingice has no local database.** `TURSO_DATABASE_URL` points at the live production Turso instance, and `src/db/drizzle-client.ts` imports `@libsql/client/web`, which only accepts `libsql:`/`http(s):`/`ws(s):` URLs — a `file:./local.db` fallback is not available. Consequences, in order of how badly they bite:

- `pnpm -F @repo/policingice db:push` and `db:studio` operate on **production**. Never run them.
- Everything in `apps/policingice/scripts/` (`create-admin`, `delete-admin`, `enrich-*`, `embed-incidents`) writes to **production**. Never run them.
- **There is no seeded login and no test account.** Nothing in this repo creates one. Any authenticated policingice flow (`/admin/*`) needs real credentials a human supplies; an agent cannot self-provision one. Verify admin changes with `pnpm verify` and a human check.

No other app in the repo has a database. No `.env` is tracked — keep it that way; document new keys in the app's `.env.example`.

## Verify a change end-to-end

Static gate — run before every commit:

```sh
pnpm verify       # typecheck · lint · format · test
pnpm verify:ci    # the above, plus the only build CI actually runs (apps/party)
```

`typecheck` runs `tsc --noEmit` per app via turbo, `format` is `oxfmt --check` (use `pnpm format:fix` to write), `test` is `tsx --test` in `apps/vis-ml` — the only app with tests.

**Read the lint caveat before trusting a green run.** `.oxlintrc.json` sets every enabled category to `warn`, so `lint` is `oxlint --report-unused-disable-directives --max-warnings 70` — a ratchet pinned to the current backlog, not a clean gate. It fails on warning 71, so a new correctness regression is caught, but 70 pre-existing warnings still pass. Lower the number whenever you clear some; never raise it.

`verify` does not build. CI (`.github/workflows/deploy.yml`) builds and deploys only `apps/party` on pushes to `main` touching `apps/party/**`, via `wrangler deploy --dry-run` — which catches bundling failures `tsc --noEmit` cannot. Run `pnpm verify:ci` before touching that app. Everything else is local-only.

Runtime — drive a real app with [agent-browser](https://github.com/vercel-labs/agent-browser) (installed globally; `npm i -g agent-browser && agent-browser install` if missing). `apps/kyh` is the safest surface: no database, no auth, no required keys — every route renders on a clone with no `.env` (verified by curling `/` and `/showcase` with the file moved aside).

```sh
pnpm dev:kyh &                                  # → :3000, or the next free port — read the log
agent-browser open http://localhost:3000        # prints the page title
agent-browser snapshot -i                       # interactive elements with @eN refs
agent-browser get text body                     # assert the page rendered
agent-browser open http://localhost:3000/showcase
agent-browser screenshot /tmp/after.png
agent-browser close
```

Set `AGENT_BROWSER_SESSION=<name>` to get an isolated browser rather than sharing the default one with whatever else is running.

Don't stop at typecheck — exercise the actual page and look at the result.

## Platform matrix

| App           | Dev command            | Port                        | Agent-verifiable at runtime?                 |
| ------------- | ---------------------- | --------------------------- | -------------------------------------------- |
| `kyh`         | `pnpm dev:kyh`         | 3000                        | **Yes** — headless, no config                |
| `policingice` | `pnpm dev:policingice` | 3000 (conflicts with `kyh`) | Public pages yes, `/admin/*` no (see above)  |
| `stonksville` | `pnpm dev:stonksville` | 3004                        | **Yes** — headless, no config                |
| `kwadrants`   | `pnpm dev:kwadrants`   | 5173 (Vite, auto-increment) | **Yes** — canvas app, prefer screenshots     |
| `tc`          | `pnpm dev:tc`          | 5173 (Vite, auto-increment) | **Yes**                                      |
| `vis-ml`      | `pnpm dev:vis-ml`      | 5173 (Vite, auto-increment) | **Yes** — also the only app with unit tests  |
| `covid-19`    | `pnpm dev:covid`       | 5173 (Vite, auto-increment) | **Yes** — plain JS, no `typecheck` task      |
| `party`       | `pnpm dev:party`       | 8787 (`wrangler dev`)       | No — WebSocket server; `typecheck` + `build` |
| `cli`         | `pnpm dev:cli`         | —                           | No — Bun terminal UI, needs a real TTY       |

The Vite apps all default to 5173 and auto-increment when it's taken; read the dev log for the port actually chosen rather than assuming.

## Rules that matter

- **oxlint + oxfmt, not ESLint + Prettier.** `packages/eslint` is a _published_ artifact (`@kyh/eslint-config`) that nothing in this repo consumes — don't "fix" the repo to use it.
- **No `any`, no non-null `!`, no `as` casts in new code.** Kebab-case filenames for TS/TSX. Make illegal states unrepresentable. Seven pre-existing `!` survive — `apps/policingice/src/lib/incident-action.ts` (2, commented), `apps/cli/src/app.tsx` (2), `apps/cli/src/lib/ascii.ts` (1), `apps/stonksville/src/lib/price-engine.ts` (2); all are bounded index or `.has()`-guarded map reads. Don't add more; do delete one when you're already in the file.
- **Dates render through a fixed time zone.** `apps/policingice/src/lib/format.ts` formats in UTC so server and client agree; never inline `toLocaleDateString()` in a server-rendered component. (`apps/kyh`'s PST clock is deliberate and client-only.)
- **Server Actions own their invariants.** A policingice action reads current state from the database and derives the next one — it never trusts client-supplied "current" values. See `toggleIncidentStatus` in `src/lib/admin-action.ts`.
- **Env is parsed, not sprinkled.** `apps/policingice/src/lib/env.ts` is the single boundary; a missing optional key disables its feature instead of crashing boot. Add new keys there _and_ to `apps/policingice/turbo.json`'s `build.env` — turbo's strict env mode strips anything undeclared. Where an app has no env module (`apps/kyh`), the reader guards its own fallback: `src/lib/public-assets.ts` returns a local placeholder rather than interpolating `undefined` into a `next/image` src, which would 500 the page.
- **Plans live in GitHub Issues, never in-repo markdown.** No `plans/`, no `ROADMAP.md`.

## Map

- `apps/{kyh,policingice,stonksville}` — Next.js 16 · `apps/{kwadrants,tc,vis-ml,covid-19}` — Vite SPAs · `apps/party` — Cloudflare Worker (PartyServer + Durable Objects) · `apps/cli` — Bun + OpenTUI
- `packages/{typescript,eslint,skills}` — published npm artifacts (`@kyh/tsconfig`, `@kyh/eslint-config`, `@kyh/skills`), not internal libraries
- `packages/skills/skills/` — the in-repo agent skill store; `packages/skills/scripts/link.mjs` links it (and `external-skills.json`) into `~/.agents` / `~/.claude` on a **global** install only
- `docs/mac-setup/` — machine setup notes (not a workspace)
- `apps/policingice/src/lib/` — `auth.ts` (better-auth), `admin-action.ts` / `incident-action.ts` (Server Actions), `incident-query.ts` (`"use cache"` reads), `env.ts`, `format.ts`
- `apps/policingice/src/db/drizzle-schema.ts` — the only schema in the repo
- `CLAUDE.md` — per-app notes and conventions · `.claude/skills/release/` — the npm release workflow
