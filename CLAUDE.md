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

Every app uses [StyleX](https://stylexjs.com); Tailwind is gone. (`vis-ml` was never on
it and stays plain CSS.) `packages/tailwind-compat` holds Tailwind's frozen scale plus
the reset, so migrated apps keep rendering identically — see its README.

- **StyleX owns what it can express**; hand-written CSS stays CSS. It has no descendant
  or attribute selectors, so vendor overrides (`react-tweet`, `react-select`), Base UI's
  `data-highlighted`, and anything targeting DOM we don't render stay in the stylesheet.
- **Import `@repo/tailwind-compat/preflight.css`** at the top of an app's stylesheet;
  deleting Tailwind deleted its reset. Add `forms.css` if the app used the forms plugin.
- **Reach for the shared modules before writing a literal**: `leading` for line-height,
  `transitions`/`shadows` for those properties, `media.feature.hover` for hover queries,
  `a11y.srOnly` for visually-hidden. They exist because the raw values are easy to get
  subtly wrong in ways nothing catches.
- **No `cn`/`clsx`/`tw-merge`.** `stylex.props(a, b)` merges last-wins by property.
- **Sibling spacing uses `:last-child`**, not an index or an `isLast` prop —
  `marginBottom: { default: spacing[4], ":last-child": 0 }`.
- **Never stack overlapping `min-width` queries on one property.** StyleX does not order
  media queries by width, so `{ [up.sm]: 6, [up.lg]: 8 }` can resolve to the `sm` value
  on a wide screen. Chain `between.smToLg` then `up.lg`.
- **StyleX resolves imports itself**: named imports only (`import * as m` fails), and it
  ignores tsconfig `paths`, so import local `*.stylex.ts` by relative path.
- **`animation` is dropped silently** — StyleX treats it as a shorthand-of-shorthands.
  Use `animationName`/`animationDuration`/etc. The same applies to any shorthand it
  classifies that way.
- **Some Tailwind utilities map to a different property than they look like**:
  `-translate-x-1/2` sets `translate`, `scale-95` sets `scale`, and `transition-*` sets
  a timing function as well as a property and duration.
- **`spacing` only has Tailwind's named steps** (it jumps 28 → 32). For anything else
  write `` `calc(${spacing.unit} * 30)` ``; `tsc` catches a bad index as TS7053.
- **Class names bound to something other than styling must survive**: react-joyride step
  targets, react-select's `classNamePrefix`, D3 selectors. Merge them with
  ``className={`target ${stylex.props(s).className}`}``.
- **Check `index.html`** — StyleX only compiles what the bundler transforms, so
  utilities on `<body>` or `#root` belong in the stylesheet.
- **Clear `.next`/`dist` after changing StyleX or package wiring.** Stale caches surface
  as bogus "could not resolve the theme file" errors.
