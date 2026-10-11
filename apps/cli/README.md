# CLI

Personal CLI tool built with [Ink](https://github.com/vadimdemedes/ink) — a sci-fi
terminal dashboard (à la [edex-ui](https://github.com/GitSquared/edex-ui) /
[dex-ui](https://github.com/seenaburns/dex-ui)) that presents projects, work,
and contacts as a HUD of framed panels.

Run `npx kyh` to launch it.

## Layout

- **Header** — identity, live system clock, and an activity spinner.
- **Identity / Status** (left column) — ASCII callsign, bio, and live readouts
  (uptime, location, entry count, link state). Hidden on narrow terminals.
- **Directory** (main) — projects and employment as a navigable, windowed table
  with htop-style row selection.
- **Comms** — press `C` for the contact / uplink channels.
- **Footer** — keybindings and the currently focused target URL.

Keys: `↑↓`/`jk` navigate · `⏎` open · `C` comms · `Q`/`esc` quit.

## Stack

- UI - [Ink](https://github.com/vadimdemedes/ink) + [React](https://react.dev/)
- Build - [esbuild](https://esbuild.github.io/) bundles `src/` into one ESM file

## Development

```bash
pnpm install
pnpm dev:cli
```

`dev` runs `src/` directly under `tsx watch`. It needs a real TTY.

## Distribution

`npx kyh` installs a single pure-JS package that needs Node ≥ 22.
`pnpm build` writes `dist/index.js`, and `ink` and `react` install as ordinary
dependencies. Publishing happens from `apps/cli` via the repo `release` skill.
