# CLI

Personal CLI tool built with [OpenTUI](https://git.new/create-tui) — a sci-fi
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

- UI - [OpenTUI](https://git.new/create-tui) + [React](https://react.dev/)
- Build - [Bun](https://bun.sh/) (`bun build --compile`)

## Development

Requires [Bun](https://bun.sh/) (OpenTUI's FFI only runs under the Bun runtime).

```bash
pnpm install
pnpm dev:cli
```

## Distribution

`npx kyh` needs Node only — the published `kyh` package is a thin Node
launcher with platform-specific optional dependencies (`@kyh/cli-<os>-<arch>`),
each containing a standalone bun-compiled binary with the Bun runtime and
OpenTUI's native library embedded. Targets: darwin arm64/x64, linux
arm64/x64 (glibc), win32 x64.

`pnpm build` (`scripts/build.ts`) cross-compiles all targets and stages the
six publish-ready packages in `dist/npm/`. Publishing happens from there via
the repo `release` skill — `apps/cli` itself is private.
