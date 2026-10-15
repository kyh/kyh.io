# Commuting Clawders

A Claude Code mod. While Claude works, a pane plays Commuting Clawders, a self-running
endless runner starring Clawd. Each run scores the output tokens Claude
spends before it goes quiet, and goes up on a shared leaderboard: who can keep
Claude going the longest, at <https://clawders.kyh.io>.

The game is a three.js world rendered in a headless Chrome and streamed into
the pane. In kitty or Ghostty it is a real picture; in any other terminal
(the desktop app's panel included) it is drawn in quadrant blocks, two by two
pixels a character, from the same frames.

## Requirements

- **macOS or Linux.** Windows is not supported: the pane says so and stays
  empty.
- **Claude Code** with mod (function hooks plugin) support, at or past the
  version `packages/claude-code-types` pins.
- **Google Chrome** installed. The game renders in it, headless; nothing is
  downloaded. Set `CHROME_PATH` if it lives somewhere unusual.
- **Node.js** on your `PATH`: it runs the streamer (`dist/stream.mjs`). No
  packages to install; the mod ships built.
- **A wide terminal.** Start Claude Code with `CLAUDE_CODE_NO_FLICKER=1` so the
  pane docks on the right; otherwise it waits for room.
- **kitty or Ghostty** for the sharp picture. Elsewhere you get blocks.

## Install

In Claude Code:

```
/plugin install commuting-clawders --marketplace kyh/kyh.io
```

Or from a shell:

```sh
claude plugin marketplace add kyh/kyh.io
claude plugin install commuting-clawders@kyh
```

`/plugin` disables or removes it. Installed it as `mod-clawders`? Remove that one
and install this; the old name gets no more updates. The marketplace is `.claude-plugin/marketplace.json`
at the repo root.

### From a checkout

From this repo, `pnpm dev:commuting-clawders-mod` builds it and runs
`claude --plugin-dir apps/commuting-clawders/mod`. To load the checkout in every session
(the desktop app included, which takes no flags), add the folder to
`CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`; run
`pnpm -F @repo/commuting-clawders-mod build` after changing `world/` or `stream/`.

## Use it

Start Claude Code with the mod loaded and send a prompt. A run starts:

- Clawd runs: dodging trains, jumping barriers, running up ramps onto train
  roofs and hopping roof to roof, collecting coins on the track and on top;
- the run's output tokens show in the pill over the picture, the coins top
  right (in blocks, in the status line under the game);
- gold sparkles burst from each coin, dust kicks up where Clawd runs and lands,
  a crash throws sparks, and wind streaks rush past (pictures only).

Every token Claude generates counts, subagents' included. When Claude finishes,
the status line reads `◐ prompt within 5s to keep the run`: send another
prompt in time and the run carries on. Miss it and the run is over. Clawd
stops, turns round and waves; the run (tokens, coins, how long Claude
worked) goes to the leaderboard, and the status line shows where you stand.
The next prompt starts a fresh game.

Chrome starts when the pane is drawn and stops when it closes, so a closed
pane costs nothing. The streamer also exits by itself if the session stops
asking for frames for 15 seconds.

### Your runs are public

Each finished run goes to the public leaderboard at <https://clawders.kyh.io>
under your **Player name**, which defaults to your git `user.name`. The status
line under the game says where runs go whenever the game is idle, e.g.
`○ idle · posting as kai to clawders.kyh.io`. Set a different name, or turn
**Post runs to the leaderboard** off, in `/config`.

### Settings

Open `/config` and find **commuting-clawders**:

| Setting                      | Default        | Options                                           |
| ---------------------------- | -------------- | ------------------------------------------------- |
| Post runs to the leaderboard | on             | off: runs stay local                              |
| Player name                  | git user.name  | any name, up to 32 characters                     |
| Leaderboard URL              | the shared one | another deployment of the site; empty: no posting |

You can also set them in `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "commuting-clawders": { "options": { "playerName": "kyh" } }
  }
}
```

## Leaderboard

The leaderboard is the folder around this one, `apps/commuting-clawders`
(`@repo/commuting-clawders`): a Next.js app on Vercel with its own Turso
database. `POST /runs`
takes `{ name, tokens, coins, seconds }` and answers the player's `rank`;
`GET /` is the page, each player's best run by tokens; `GET /runs` the same as
JSON.

```sh
cp apps/commuting-clawders/.env.example apps/commuting-clawders/.env
pnpm -F @repo/commuting-clawders db:push   # the local file database
pnpm dev:commuting-clawders                           # :3016
```

Anyone can post, so names are trimmed and every number is bounded; there is
no proof a run happened.

## Troubleshooting

| Symptom                  | Cause and fix                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| No pane                  | The terminal is too narrow (see Requirements). Widen it.                                   |
| Pane says ✗ and a reason | The streamer stopped: usually Chrome not found (set `CHROME_PATH`) or no `node` on `PATH`. |
| Blocky picture           | Your terminal can't show pictures; use kitty or Ghostty for the sharp one.                 |
| Nothing happens at all   | Start with `claude --debug` and look for lines starting with `commuting-clawders:`.        |

## Release

Installed copies update only when `version` in `.claude-plugin/plugin.json`
changes. To ship: rebuild (`pnpm -F @repo/commuting-clawders-mod build`), commit
`dist/`, bump the version, push to `main`. CI fails if `dist/` doesn't match
the source.

## Develop

Claude Code watches a `--plugin-dir` folder in an interactive session: saving a
file in `hooks/` reloads the mod without a restart.

```sh
pnpm -F @repo/commuting-clawders-mod build      # dist/: the world for Chrome and the bundled streamer (commit it)
pnpm -F @repo/commuting-clawders-mod world      # the game alone in a browser, on :3015 (?coarse previews blocks mode)
pnpm -F @repo/commuting-clawders-mod test       # node: the runner, runs, frames, the streamer protocol
pnpm -F @repo/commuting-clawders-mod test:mod   # claude plugin test: the hooks: the pane, runs, the grace, posting
pnpm -F @repo/commuting-clawders-mod typecheck  # pure modules + streamer, the world (DOM), then the hooks against the pinned API types
pnpm -F @repo/commuting-clawders-mod validate   # what Claude Code will load
```

Tests come in two kinds, split by suffix. `test/*.spec.ts` cover the pure
modules under node and run in `pnpm test` and CI. `test/*.test.ts` run the
hooks inside Claude Code's own test kit, with the engine beneath mocked
(`claude-code/testing`); they need the `claude` CLI, so they're local only.
`claude plugin test` loads every `*.test.ts` in the folder, which is why the
node tests can't share the suffix.

The hooks type-check against `packages/claude-code-types`, the plugin API's
declarations pinned from the Claude Code version on that file's first line.
After a Claude Code update, refresh it from the copy the engine writes beside
a mod each time it loads one:

```sh
cp apps/commuting-clawders/mod/.claude-plugin/types/claude-code/index.d.ts packages/claude-code-types/claude-code.d.ts
```

| File                         | Role                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `hooks/register.tsx`         | The hooks: pane, runs, posting, starting the streamer and blitting its frames       |
| `hooks/screen.ts`            | The hooks' side of the streamer: socket, URL, parsing a frame                       |
| `hooks/game.ts`              | Runner simulation and autopilot, shared with the world                              |
| `hooks/run.ts`               | A run's state: tokens, the 5s grace, its result and status line                     |
| `world/`                     | The three.js game: scene, Clawd, props, toon materials, HUD, particles (`vfx.ts`)   |
| `stream/stream.ts`           | Serves the world to headless Chrome, takes its frames, answers the hooks            |
| `stream/chrome.ts`           | Where Chrome is, and how it runs: headless, throwaway profile, tied to the streamer |
| `stream/files.ts`            | The built world, served as files                                                    |
| `stream/frame.ts`            | Frame sizing, flipped RGBA for pictures, quadrant cells for blocks                  |
| `dist/`                      | Built and committed: the world page and `stream.mjs`, so installs need no packages  |
| `types/index.d.ts`           | The `$.state` contract: what the pane shows, the status line                        |
| `.claude-plugin/plugin.json` | Manifest and the `/config` options                                                  |
| `../`                        | The leaderboard: Next.js app, Turso schema, run schema, standings, page             |
