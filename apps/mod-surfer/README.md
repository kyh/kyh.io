# mod-surfer

A Claude Code mod. While Claude works, a pane plays a self-running Subway
Surfers-style runner, and an OpenAI voice reads Claude's replies aloud with
captions underneath.

## Requirements

- **Claude Code** with mod (function hooks plugin) support, at or past the
  version `packages/claude-code-types` pins.
- **macOS** to hear the OpenAI voice. Clips play through `afplay`. On Linux
  or Windows you get the system voice where one exists, otherwise captions
  only.
- **An OpenAI API key** for the OpenAI voice. Without one, the system voice
  (`say` on macOS) reads instead.
- **`curl`** on your `PATH`. It ships with macOS.
- **A terminal at least 144 columns wide.** Narrower, the pane waits and
  appears once you widen it.

## Set up

The mod has no npm dependencies at runtime: loading it is pointing Claude Code
at this folder.

### One session

From this repo:

```sh
export OPENAI_API_KEY=sk-...
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
    "CLAUDE_CODE_PLUGIN_DIRS": "~/code/kyh.io/apps/mod-surfer",
    "OPENAI_API_KEY": "sk-..."
  }
}
```

Separate several folders with `:` (`;` on Windows). Claude Code reads this from
your user settings only, never a project's.

### Remove it

Drop the `--plugin-dir` flag, or the path from `CLAUDE_CODE_PLUGIN_DIRS`.

## Set your API key

The mod looks for a key in this order:

1. The plugin's `openaiApiKey` option. It's marked sensitive, so Claude Code
   keeps it in secure storage and doesn't list it in `/config`.
2. The `OPENAI_API_KEY` environment variable, from your shell or the `env`
   block under Set up.

With neither, it uses the system voice; the status line under the game reads
"system voice" instead of "openai ash". With a key on a machine that can't
play clips, it does the same and also shows a toast saying why.

## Use it

Start Claude Code with the mod loaded and send a prompt. While Claude works:

- the runner moves, dodging trains, jumping barriers and collecting coins;
- each sentence of the reply is read aloud and shown as a caption under the
  game;
- the status line under the game shows `● LIVE` or `○ idle`, and which voice
  is reading.

When the turn ends, the game freezes on "waiting for Claude…" once the
narration finishes.

### Settings

Open `/config` and find **mod-surfer**:

| Setting        | Default           | Options                                                                                        |
| -------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| Narrator voice | `ash`             | `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`, `verse` |
| Speech model   | `gpt-4o-mini-tts` | `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`                                                         |
| Mute narrator  | off               | on: captions only, no voice and no OpenAI requests                                             |

Only `gpt-4o-mini-tts` follows the upbeat narrator style. The other two read
in a flat voice.

You can also set them in `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "mod-surfer": { "options": { "voice": "nova" } }
  }
}
```

## What gets read

- Only Claude's own replies in the main conversation. Subagents and tool
  output aren't read.
- Markdown is stripped. Code blocks become "(code omitted.)", links read as
  their text, and bare URLs read as "a link".
- Each sentence is one OpenAI request. The next two are fetched while the
  current one plays, to keep gaps short.
- A long reply is read from its start, up to 30 sentences. The rest is
  dropped.
- Sending a new prompt drops anything not yet read. A sentence that has
  already started finishes.

## Cost

Each sentence is a separate call to OpenAI's speech endpoint, billed by
OpenAI per input character at the model's rate. Long replies cost more. Turn on
**Mute narrator** to stop paying while keeping captions.

## Troubleshooting

| Symptom                                   | Cause and fix                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| No pane                                   | The terminal is too narrow (see Requirements). Widen it.                                      |
| Toast: "OpenAI voice plays on macOS only" | You're not on macOS. The system voice or captions take over.                                  |
| Toast: "OpenAI speech failed"             | The request failed. Check the key, your OpenAI quota, and network access to `api.openai.com`. |
| Toast: "no speech synthesizer here"       | No system voice either. You get captions only.                                                |
| Nothing happens at all                    | Start with `claude --debug` and look for lines starting with `mod-surfer:`.                   |

## Develop

Claude Code watches a `--plugin-dir` folder in an interactive session: saving a
file in `hooks/` reloads the mod without a restart.

```sh
pnpm -F @repo/mod-surfer test       # node: the runner and the narration lines
pnpm -F @repo/mod-surfer test:mod   # claude plugin test: the hooks: the pane, the voice fallbacks, mute
pnpm -F @repo/mod-surfer typecheck  # pure modules + node tests, then the hooks against the pinned API types
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

| File                         | Role                                                     |
| ---------------------------- | -------------------------------------------------------- |
| `hooks/register.tsx`         | The hooks: pane, narration queue, speech, frame loop     |
| `hooks/game.ts`              | Runner simulation, autopilot and drawing                 |
| `hooks/narrate.ts`           | Markdown to sentences, and the OpenAI request            |
| `types/index.d.ts`           | The `$.state` contract: the caption, whether a turn runs |
| `.claude-plugin/plugin.json` | Manifest and the `/config` options                       |
