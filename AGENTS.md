# AGENTS.md

**kyh.io** is a personal pnpm + Turborepo monorepo of thirteen _independent_ apps — six Next.js, four Vite SPAs, one Ink CLI, two Claude Code mods. There is no shared data layer, no shared UI package, and no cross-app runtime coupling: each app is its own product. This is the tool-agnostic guide for coding agents — it's meant to be run, not just read. Claude also reads `CLAUDE.md`; both point back here.

## Quickstart (headless)

```sh
pnpm install && pnpm bootstrap --yes
pnpm dev:kyh    # → http://localhost:3000
```

That's the whole setup. There is no Docker and no shared database — ten of the thirteen apps run with `pnpm install` alone, and `pnpm bootstrap` sets up the env files and the one local database. Node >= 24, pnpm 12 (`packageManager` pins it); `pnpm dev:commuting-clawders-mod` and `pnpm dev:mod-dev` additionally need the `claude` CLI.

Apps with an `.env.example` read a `.env`, loaded per-app by `dotenv-cli` (a missing file is not an error — the dev server still starts). Each example holds local-dev defaults, with secrets blank or a local-only dummy. `pnpm bootstrap` copies each missing one and pushes commuting-clawders' schema to its local `file:local.db`, and is safe to re-run. kyh gets its project images, commuting-clawders its database, autoplay renders a setup checklist until X + fal keys are filled in, and policingice still needs its production URL (see below).

`pnpm dev` starts _everything_ at once via `turbo watch`. Prefer a single `pnpm dev:<app>` — `dev:kyh` and `dev:policingice` both bind :3000 and cannot run together.

## Databases and credentials

**policingice has no local database.** `TURSO_DATABASE_URL` points at the live production Turso instance, and `src/db/drizzle-client.ts` imports `@libsql/client/web`, which only accepts `libsql:`/`http(s):`/`ws(s):` URLs — a `file:./local.db` fallback is not available. Consequences, in order of how badly they bite:

- `pnpm -F @repo/policingice db:push` and `db:studio` operate on **production**. Never run them.
- Everything in `apps/policingice/scripts/` (`create-admin`, `delete-admin`, `enrich-*`, `embed-incidents`) writes to **production**. Never run them.
- **There is no seeded login and no test account.** Nothing in this repo creates one. Any authenticated policingice flow (`/admin/*`) needs real credentials a human supplies; an agent cannot self-provision one. Verify admin changes with `pnpm verify` and a human check.

`src/lib/auth-tables.test.ts` in policingice and autoplay is the only check that the hand-written Drizzle mirror of better-auth's tables has every model and field the library reads (matched on export key and property name, not column names); typecheck, lint and build never touch a database, so keep it when changing either side.

**autoplay has its own Turso database** (clip archive), separate from policingice's. Its `pnpm -F @repo/autoplay db:push` targets that dedicated database and is safe to run; with no `TURSO_DATABASE_URL` the app falls back to an in-memory archive. No other app has a database. No `.env` is tracked — keep it that way; document new keys in the app's `.env.example`.

## Verify a change end-to-end

Static gate — run before every commit:

```sh
pnpm verify       # typecheck · lint · format · test
```

`typecheck` runs `tsc --noEmit` per app via turbo, `format` is `oxfmt --check` (use `pnpm format:fix` to write), `test` is `tsx --test` in `apps/autoplay`, `apps/vis-ml`, `apps/policingice`, `apps/kyh`, `apps/commuting-clawders` and its `mod` and `apps/mod-dev` — the only apps with tests (the mods' node tests are `test/*.test.mts`; see `CLAUDE.md` → Claude Code mods). The two mods also have `validate` and a `test:mod` that runs their hooks against Claude Code itself (`claude plugin test`), local only. `apps/kyh`'s tests cover `src/lib/`: the markdown/`llms.txt`/404 bodies, the JSON-LD graph and `Accept` negotiation, all of which are pure functions on purpose so they can be asserted without a server.

**Lint is a clean gate.** `oxlint.config.ts` extends the ultracite presets (`ultracite/oxlint/core`, `react`, `next`, `anti-slop`, `landmines`); every rule is an error and `lint` fails on the first one. It is type-aware (`options.typeAware`, run by the `oxlint-tsgolint` devDependency), so every file it reads sits in a tsconfig: a new script or config file goes in its workspace's `include`. No rule is turned off; the config only scopes `next` to the Next apps and lets `node:test`'s `describe`/`it` float. Sequential awaits are a recursive async step or `Promise.all`, never an `await` in a loop; a type assertion is a zod parse or a guard; external JSON is parsed with zod at the boundary. Fix the code rather than disabling a rule; when a rule is genuinely wrong for a line (a JSON-LD body React can only emit through `dangerouslySetInnerHTML`, a third-party player's sandbox), disable that line with a `-- reason` that says why no code fix exists.

Landmines (`@interfere/landmines`) holds the code to: no prose comments (allowed: functional directives, one single-line `// WARNING:` for a dangerous recurring footgun, TSDoc on exported API); no annotated return types (pin a contract with `satisfies` or a typed variable: `const f: (a: A) => T = (a) => …`, which also types a recursive function); no test doubles (no patched globals or stubbed modules: `apps/kyh`'s tests run with Node's real `localStorage` via `--experimental-webstorage`, `apps/autoplay`'s live test serves feeds and X from a local HTTP server, with `X_API_URL` pointing the X client at it); no fixed sleeps, retries or raised timeouts in tests; tests named `*.test.ts` beside their subject or in the package's `test/`. Why something is the way it is goes in the commit or PR, not a comment.

`verify` does not build. CI (`.github/workflows/ci.yml`) runs the same four checks, then rebuilds `apps/commuting-clawders/mod/dist` and fails if it differs from what's committed; Vercel builds the web apps on every PR. CI's `smoke` job builds `apps/kyh`, starts it with `next start` and runs `pnpm smoke` against it: `/` in HTML and Markdown, `/markdown`, `/llms.txt`, `/openapi.json`, `/sitemap.xml`, `/showcase`, and the 404s for an unknown page and API path. Run it locally against `pnpm dev:kyh` or a started build; `SMOKE_URL` points it at a deployment.

Runtime — drive a real app with [agent-browser](https://github.com/vercel-labs/agent-browser) (installed globally; `npm i -g agent-browser` if missing — it finds an installed Chrome or Chromium on its own, so run `agent-browser install` only where there is none). `apps/kyh` is the safest surface: no database, no auth, no required keys — every route renders on a clone with no `.env` (verified by curling `/` and `/showcase` with the file moved aside).

```sh
pnpm dev:kyh &                                  # → :3000, or the next free port — read the log
agent-browser open http://localhost:3000        # prints the page title
agent-browser snapshot -i                       # interactive elements with @eN refs
agent-browser get text body                     # assert the page rendered
agent-browser open http://localhost:3000/showcase
agent-browser screenshot /tmp/after.png
agent-browser close
```

Each session gets its own browser: the SessionStart hook sets `AGENT_BROWSER_SESSION` to the session's id, and the SessionEnd hook closes every browser named after it. The SubagentStart hook tells each subagent a `--session` of its own, named after the session's, so SessionEnd closes those too. Locate by `snapshot -i` refs or `find role … --name`, never `find text`, which can match a hidden duplicate label. A background tab gets no animation frames, so menus won't open: `agent-browser tab keep live` fixes it.

Don't stop at typecheck — exercise the actual page and look at the result.

## Platform matrix

| App                      | Dev command                       | Port                        | Agent-verifiable at runtime?                           |
| ------------------------ | --------------------------------- | --------------------------- | ------------------------------------------------------ |
| `kyh`                    | `pnpm dev:kyh`                    | 3000                        | **Yes** — headless, no config; has tests               |
| `policingice`            | `pnpm dev:policingice`            | 3000 (conflicts with `kyh`) | Public pages yes, `/admin/*` no (see above)            |
| `stonksville`            | `pnpm dev:stonksville`            | 3004                        | **Yes** — headless, no config                          |
| `autoplay`               | `pnpm dev:autoplay`               | 3005                        | OFF AIR screen yes; live TV needs X + fal keys         |
| `boobounty`              | `pnpm dev:boobounty`              | 3006                        | **Yes** — static, no config                            |
| `kwadrants`              | `pnpm dev:kwadrants`              | 5173 (Vite, auto-increment) | **Yes** — canvas app, prefer screenshots               |
| `tc`                     | `pnpm dev:tc`                     | 5173 (Vite, auto-increment) | **Yes**                                                |
| `vis-ml`                 | `pnpm dev:vis-ml`                 | 5173 (Vite, auto-increment) | **Yes** — also has unit tests                          |
| `covid-19`               | `pnpm dev:covid`                  | 5173 (Vite, auto-increment) | **Yes** — plain JS, no `typecheck` task                |
| `commuting-clawders`     | `pnpm dev:commuting-clawders`     | 3016                        | **Yes** — after `pnpm bootstrap` (local file)          |
| `cli`                    | `pnpm dev:cli`                    | —                           | No — Ink terminal UI, needs a real TTY                 |
| `commuting-clawders/mod` | `pnpm dev:commuting-clawders-mod` | — (loads into `claude`)     | Hooks yes, headless: `test:mod`; the pane needs a TTY  |
| `mod-dev`                | `pnpm dev:mod-dev`                | — (loads into `claude`)     | **Yes** — headless: `claude -p --resume <id> "/score"` |

The Vite apps all default to 5173 and auto-increment when it's taken; read the dev log for the port actually chosen rather than assuming.

## Rules that matter

- **oxlint + oxfmt, not ESLint + Prettier.**
- **No `any`, no non-null `!`, no `as` casts in new code.** Kebab-case filenames for TS/TSX. Make illegal states unrepresentable. Pre-existing `!` survive across the apps (mostly bounded index or `.has()`-guarded map reads) — don't add new ones; do delete one when you're already in the file.
- **Dates render through a fixed time zone.** `apps/policingice/src/lib/format.ts` formats in UTC so server and client agree; never inline `toLocaleDateString()` in a server-rendered component. (`apps/kyh`'s PST clock is deliberate and client-only.)
- **Server Actions own their invariants.** A policingice action reads current state from the database and derives the next one — it never trusts client-supplied "current" values. See `toggleIncidentStatus` in `src/lib/admin-action.ts`.
- **Env is parsed, not sprinkled.** `apps/policingice/src/lib/env.ts` is the single boundary; a missing optional key disables its feature instead of crashing boot. Add new keys there _and_ to `apps/policingice/turbo.json`'s `build.env` — turbo's strict env mode strips anything undeclared. Where an app has no env module (`apps/kyh`), the reader guards its own fallback: `src/lib/public-assets.ts` returns a local placeholder rather than interpolating `undefined` into a `next/image` src, which would 500 the page.
- **Every Next app runs `cacheComponents` + `partialPrefetching`.** No `dynamic`/`revalidate` segment exports: cache with `"use cache"` + `cacheLife` (and `cacheTag`, expired by the write that changes it). A `GET` route that reads nothing of the request prerenders at build, so one that must answer per request starts with `await connection()`. A `[param]` page that calls `notFound()` exports `ensureStatic = "navigation"`, or an unknown param answers 200.
- **Plans live in GitHub Issues, never in-repo markdown.** No `plans/`, no `ROADMAP.md`.

## Map

- `apps/{kyh,policingice,stonksville,autoplay,commuting-clawders,boobounty}` — Next.js 16 · `apps/{kwadrants,tc,vis-ml,covid-19}` — Vite SPAs · `apps/cli` — Ink CLI (Node) · `apps/{commuting-clawders/mod,mod-dev}` — Claude Code mods (function hooks plugins)
- `packages/{typescript,skills}` — published npm artifacts (`@kyh/tsconfig`, `@kyh/skills`), not internal libraries
- `packages/skills/skills/` — the in-repo agent skill store; `packages/skills/src/install.ts` (built to `dist/` on pack, run by `kyh-skills install`) copies it (and `external-skills.json`) into `~/.agents` / `~/.claude`
- `docs/mac-setup/` — machine setup notes (not a workspace)
- `apps/policingice/src/lib/` — `auth.ts` (better-auth), `admin-action.ts` / `incident-action.ts` (Server Actions), `incident-query.ts` (`"use cache"` reads), `env.ts`, `format.ts`
- `apps/{policingice,autoplay}/src/db/drizzle-schema.ts` — the two Drizzle schemas in the repo (separate Turso databases)
- `scripts/og-video.ts` — `pnpm og:video <kyh [theme|all]|stonksville|commuting-clawders|autoplay>` records an app's `og:video` (`public/og/*.mp4` + poster), stepped at 30fps in headless Chromium at 2x; needs ffmpeg and Playwright's Chromium (`pnpm exec playwright install chromium`, once). kyh, stonksville and commuting-clawders are the real running app (kyh under `next dev -p 3100`, since `window.city` is dev-only; the others `next start` on 3004 / 3016), each clip's last beat crossfaded over its first so it loops; kyh records the showcase's opening (the town going up from downtown out while the camera pulls back, from its first frame, the theme picked first in the dock's themes menu on the homepage), the logo and "Kaiyu's corner of the internet" coming up over the finished town, once per theme; every page of the site serves the clip for the calendar's theme today as `og:video`, with its `VideoObject` in the layout (`src/lib/todays-video.ts`, cached hourly). Autoplay's is a drawn scene (`scripts/og-video/autoplay.html`), since its real page is OFF AIR without keys. Never part of `verify` or a build; bump the app's `uploadDate`/`duration` beside its metadata when you re-record
- `CLAUDE.md` — per-app notes and conventions · `.claude/skills/release/` — the npm release workflow
