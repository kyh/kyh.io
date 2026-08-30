# kyh.io Monorepo

Personal monorepo. Uses pnpm workspaces + turborepo.

## Commands

```bash
pnpm dev:<app>     # dev server for specific app
pnpm build         # build all
pnpm verify        # typecheck · lint · format · test — run before committing
pnpm verify:ci     # verify + the apps/party build CI runs
pnpm lint          # lint all (oxlint)
pnpm typecheck     # typecheck all
pnpm format        # check formatting (oxfmt); format:fix writes
pnpm test          # run tests (apps/vis-ml, apps/policingice, apps/kyh)
```

## Agent-driven development

`AGENTS.md` is the full workflow — read it first. The essentials:

- **Setup**: `pnpm install`, then `pnpm dev:<app>`. No bootstrap script, no Docker. `pnpm dev:kyh` and `pnpm dev:policingice` both bind :3000, so run one at a time.
- **Verify**: `pnpm verify` for the static gate (`verify:ci` adds the apps/party build CI runs); drive a running app with `agent-browser` for runtime checks. `apps/kyh` is the safest browser surface (no DB, no auth, no required keys); `apps/cli` and `apps/party` get `typecheck` + `build` only.
- **`pnpm lint` is a ratchet, not a clean gate** — `--max-warnings 54` pins the current backlog. Lower it when you clear warnings; never raise it.
- **policingice's database is remote production.** No local DB, no seed, no test login. Never run its `db:push`/`db:studio` or anything in `apps/policingice/scripts/`.

## Apps

### kwadrants (`apps/kwadrants`)

2x2 matrix canvas editor using react-konva.

**Stack**: React, Vite, Konva, Tailwind v4, motion

**Features**:

- Draggable tags + images on canvas
- Editable axis labels (click to edit)
- Quadrant color customization
- Grid options (none/squares/dots)
- Layout modes: axis (labels at axis ends) vs edge (labels as headers)
- Floating draggable panel snaps to 4 corners
- Export to PNG/JPEG
- State persisted to localStorage

**Key files**:

- `src/lib/KwadrantContext.tsx` - state management
- `src/components/canvas/` - Konva canvas components
- `src/components/ui/FloatingIsland.tsx` - draggable toolbar

### cli (`apps/cli`)

Personal CLI tool.

### feedreel (`apps/feedreel`)

An X feed as a TV channel of AI-generated video. CH 01 is the owner's feed
(`OWNER_X_USERNAME`), public to any visitor; signing in with X adds CH 02, your
own feed. Clips come from fal.ai (`minimax/h3-max/text-to-video` by default,
~3s per 5s clip). Programming rules: lazy (new clips generate only while the
feed's owner is watching — everyone else gets reruns), popular-first (highest
engagement un-aired post next, paginating deeper when nothing qualifies), and
never-twice (clips archived by post id, daily caps).

**Stack**: Next.js, Tailwind v4, zod, Drizzle + Turso, better-auth (X social
provider) — the policingice stack, on feedreel's own database (its `db:push`
is safe, unlike policingice's; the archive falls back in-memory when
unconfigured, but sign-in needs the DB). Port 3005.

**Key files**:

- `src/lib/channel.ts` - programming: popularity selection, lazy generation, rerun archive
- `src/db/drizzle-schema.ts` - better-auth tables + clip archive (clip · channel_clip · pending_job)
- `src/lib/auth.ts` - better-auth config (X provider, handle mapped onto user)
- `src/lib/x-account.ts` - reads/refreshes the X grant from the account table
- `src/lib/x-api.ts` - timeline client (metrics, pagination, own-posts fallback)
- `src/lib/fal.ts` - fal queue REST client
- `src/components/tv.tsx` - the TV: one clip playing, one buffered, static + OSD
- `.env.example` - every key documented; app boots without them and shows OFF AIR

### kyh (`apps/kyh`)

Main website. Also the agent-facing surface: `src/lib/` holds the pure builders
behind `/markdown`, `/llms.txt`, the JSON-LD graph and the 404 body, each with
unit tests next to it. `src/lib/config.ts` is the single source of truth for the
canonical routes — add a page there and it appears in the sitemap, `llms.txt`,
the homepage site nav and the 404 recovery links at once.

### party (`apps/party`)

Real-time multiplayer server. PartyServer on Cloudflare Workers (Durable Objects).

### policingice (`apps/policingice`)

Crowdsourced ICE incident documentation. Next.js, Drizzle + Turso, better-auth.

### stonksville (`apps/stonksville`)

Realtime trading chart game. Next.js, canvas-based candlestick rendering.

### tc, covid-19, vis-ml

Other project apps.

## Packages

Shared configs and utilities in `packages/`.
