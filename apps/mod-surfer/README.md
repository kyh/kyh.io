# mod-surfer

A Claude Code mod. While Claude works, a pane plays a self-running Subway
Surfers-style runner starring Clawd. Each run scores the output tokens Claude
spends before it goes quiet, and goes up on a shared leaderboard: who can keep
Claude going the longest:
<https://clauders.kyh.io>.

The game is a three.js world rendered in a headless Chrome and streamed into
the pane. In kitty or Ghostty it is a real picture; in any other terminal
(the desktop app's panel included) it is drawn in quadrant blocks, two by two
pixels a character, from the same frames.

## Requirements

- **Claude Code** with mod (function hooks plugin) support, at or past the
  version `packages/claude-code-types` pins.
- **Google Chrome** installed. The game renders in it, headless, through
  `playwright-core`; nothing is downloaded.
- **`pnpm install`** in this repo: the streamer runs on `tsx` and Vite from
  `node_modules`.
- **A wide terminal.** Start Claude Code with `CLAUDE_CODE_NO_FLICKER=1` so the
  pane docks on the right; otherwise it waits for room.
- **kitty or Ghostty** for the sharp picture. Elsewhere you get blocks.

## Set up

Loading it is pointing Claude Code at this folder (after `pnpm install`).

### One session

From this repo:

```sh
pnpm dev:mod-surfer
```

That runs `claude --plugin-dir apps/mod-surfer`. From anywhere else:

```sh
claude --plugin-dir /path/to/kyh.io/apps/mod-surfer
```

### Every session

Add the folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of
`~/.claude/settings.json` (an absolute path; `~` works). This is also how the
desktop app loads it, since it takes no flags.

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/code/kyh.io/apps/mod-surfer"
  }
}
```

Separate several folders with `:` (`;` on Windows). Claude Code reads this from
your user settings only, never a project's.

### Remove it

Drop the `--plugin-dir` flag, or the path from `CLAUDE_CODE_PLUGIN_DIRS`.

## Use it

Start Claude Code with the mod loaded and send a prompt. A run starts:

- Clawd runs: dodging trains, jumping barriers, running up ramps onto train
  roofs and hopping roof to roof, collecting coins on the track and on top;
- the run's output tokens show in the pill over the picture, the coins top
  right (in blocks, in the status line under the game);
- gold sparkles burst from each coin, dust kicks up where Clawd runs and lands,
  a crash throws sparks, and wind streaks rush past (pictures only);
- each coin chimes and each jump and crash has its sound, synthesized in code
  (no audio files; macOS only).

Every token Claude generates counts, subagents' included. When Claude finishes,
the status line reads `◐ prompt within 5s to keep the run`: send another
prompt in time and the run carries on. Miss it and the run is over. Clawd
stops, turns round and waves; the run (tokens, coins, how long Claude
worked) goes to the leaderboard, and the status line shows where you stand.
The next prompt starts a fresh game.

Chrome starts when the pane is drawn and stops when it closes, so a closed
pane costs nothing. The streamer also exits by itself if the session stops
asking for frames for 15 seconds.

### Settings

Open `/config` and find **mod-surfer**:

| Setting                      | Default        | Options                                                 |
| ---------------------------- | -------------- | ------------------------------------------------------- |
| Post runs to the leaderboard | on             | off: runs stay local                                    |
| Player name                  | git user.name  | any name, up to 32 characters                           |
| Leaderboard URL              | the shared one | another deployment of `leaderboard/`; empty: no posting |
| Sound effects                | on             | off: the game is silent                                 |

You can also set them in `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "mod-surfer": { "options": { "playerName": "kyh" } }
  }
}
```

## Leaderboard

`leaderboard/` is a Cloudflare Worker on D1, its own workspace package
(`@repo/mod-surfer-leaderboard`), all through the `cf` CLI. `POST /runs` takes
`{ name, tokens, coins, seconds }` and answers the player's `rank`; `GET /`
is the page, each player's best run by tokens; `GET /runs` the same as JSON.

```sh
pnpm dev:leaderboard                                          # cf dev on :8787, local D1
pnpm deploy:leaderboard                                       # cf deploy
pnpm -F @repo/mod-surfer-leaderboard migrate <database-id>    # apply leaderboard/migrations (add --local for dev)
```

Anyone can post, so names are trimmed and every number is bounded; there is
no proof a run happened.

## Troubleshooting

| Symptom                  | Cause and fix                                                               |
| ------------------------ | --------------------------------------------------------------------------- |
| No pane                  | The terminal is too narrow (see Requirements). Widen it.                    |
| Pane says ✗ and a reason | The streamer stopped: usually Chrome missing, or `pnpm install` not run.    |
| Blocky picture           | Your terminal can't show pictures; use kitty or Ghostty for the sharp one.  |
| Nothing happens at all   | Start with `claude --debug` and look for lines starting with `mod-surfer:`. |

## Develop

Claude Code watches a `--plugin-dir` folder in an interactive session: saving a
file in `hooks/` reloads the mod without a restart.

```sh
pnpm -F @repo/mod-surfer world      # the game alone in a browser, on :3015 (?coarse previews blocks mode)
pnpm -F @repo/mod-surfer test       # node: the runner, runs, frames, the streamer protocol
pnpm -F @repo/mod-surfer test:mod   # claude plugin test: the hooks: the pane, runs, the grace, posting
pnpm -F @repo/mod-surfer typecheck  # pure modules + streamer, the world (DOM), then the hooks against the pinned API types
pnpm -F @repo/mod-surfer validate   # what Claude Code will load
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
cp apps/mod-surfer/.claude-plugin/types/claude-code/index.d.ts packages/claude-code-types/claude-code.d.ts
```

| File                         | Role                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `hooks/register.tsx`         | The hooks: pane, runs, posting, starting the streamer and blitting its frames     |
| `hooks/screen.ts`            | The hooks' side of the streamer: socket, URL, parsing a frame                     |
| `hooks/game.ts`              | Runner simulation and autopilot, shared with the world                            |
| `hooks/sfx.ts`               | The sound effects, synthesized into WAVs                                          |
| `hooks/run.ts`               | A run's state: tokens, the 5s grace, its result and status line                   |
| `world/`                     | The three.js game: scene, Clawd, props, toon materials, HUD, particles (`vfx.ts`) |
| `stream/stream.ts`           | Serves the world to headless Chrome, takes its frames, answers the hooks          |
| `stream/frame.ts`            | Frame sizing, flipped RGBA for pictures, quadrant cells for blocks                |
| `types/index.d.ts`           | The `$.state` contract: what the pane shows, the status line                      |
| `.claude-plugin/plugin.json` | Manifest and the `/config` options                                                |
| `leaderboard/`               | The leaderboard Worker: D1 schema, run schema, page                               |
