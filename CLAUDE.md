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
pnpm test          # run tests (apps/vis-ml, apps/policingice)
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

### kyh (`apps/kyh`)

Main website.

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

## Styling

Apps are migrating from Tailwind to [StyleX](https://stylexjs.com). Migrated so far:
`stonksville`. (`vis-ml` was never on Tailwind and stays plain CSS.)

Rules for a migrated app:

- **StyleX owns what it can express**; hand-written CSS stays CSS. StyleX has no
  descendant selectors by design, so vendor overrides (`react-tweet`, `react-select`)
  and anything targeting DOM we don't render must remain in the stylesheet.
- **Tailwind's preflight is ported verbatim** into the app's stylesheet. Deleting the
  Tailwind import deletes the reset with it, and every browser default comes back.
- **Scale values come from `@repo/stylex-tokens`**, vendored from Tailwind 4.3.3 so
  numbers stay identical. Never inline a magic `0.75rem` where `spacing[3]` exists.
- **No `cn`/`clsx`/`tw-merge`.** `stylex.props(a, b)` merges last-wins by property.
- **Next apps need `.babelrc`, not `babel.config.js`** — Next's Babel loader rejects
  `.cjs`/`.mjs`, and these packages are `type: module`. Because it must be JSON, the
  StyleX options are duplicated into `postcss.config.mjs`; keep the two in sync.
- **Wrap `:hover` in `@media (hover: hover)`** to match what Tailwind emitted, or
  touch devices get sticky hover states.

Known cosmetic drift from Tailwind, both verified harmless: lightningcss evaluates
`calc(1.25/0.875)` to `1.42857` (costs 1/64px of line-height) and renders `color-mix`
as `lab()` rather than `oklab()` (byte-identical sRGB).
