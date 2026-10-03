# subway-narrator

A Claude Code mod. While Claude works, a pane plays a self-running Subway
Surfers-style runner, and an OpenAI voice reads Claude's replies aloud with
captions underneath.

## Requirements

- **Claude Code** with mod (function hooks plugin) support. Built and
  type-checked against 2.1.287.
- **macOS** to hear the OpenAI voice. Clips play through `afplay`. On Linux
  or Windows you get the system voice where one exists, otherwise captions
  only.
- **An OpenAI API key** for the OpenAI voice. Without one, the system voice
  (`say` on macOS) reads instead.
- **`curl`** on your `PATH`. It ships with macOS.
- **A terminal at least 144 columns wide** for the pane to open on its own
  (110 once you've opened it with `/subway` before). Narrower, open it with
  `/subway`.

The mod has no npm dependencies at runtime, so you don't need to run
`pnpm install` just to use it.

## Install

### Try it for one session

From this repo:

```sh
export OPENAI_API_KEY=sk-...
pnpm dev:subway-narrator
```

That runs `claude --plugin-dir apps/subway-narrator`. From anywhere else, point
at the folder directly:

```sh
claude --plugin-dir /path/to/kyh.io/apps/subway-narrator
```

### Load it in every session

Add the folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of
`~/.claude/settings.json`. Use an absolute path; `~` works.

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/code/kyh.io/apps/subway-narrator",
    "OPENAI_API_KEY": "sk-..."
  }
}
```

To load several folders, separate them with `:` (`;` on Windows). Claude Code
reads this from your user settings only, never from a project's settings.

### Uninstall

Drop the `--plugin-dir` flag, or remove the path from
`CLAUDE_CODE_PLUGIN_DIRS`.

## Set your API key

The mod looks for a key in this order:

1. The plugin's `openaiApiKey` option. It's marked sensitive, so Claude Code
   keeps it in secure storage and doesn't list it in `/config`.
2. The `OPENAI_API_KEY` environment variable, from your shell or the `env`
   block above.

With neither, or on a machine that can't play clips, it uses the system voice
and shows a toast saying why.

## Use it

Start Claude Code with the mod loaded and send a prompt. While Claude works:

- the runner moves, dodging trains, jumping barriers and collecting coins;
- each sentence of the reply is read aloud and shown as a caption under the
  game;
- the status line under the game shows `● LIVE` or `○ idle`, and which voice
  is reading.

When the turn ends, the game freezes on "waiting for Claude…" once the
narration finishes.

### Commands

| Command        | What it does                                                               |
| -------------- | -------------------------------------------------------------------------- |
| `/subway`      | Opens the pane at any terminal width.                                      |
| `/subway-mute` | Turns the voice off or back on. Captions stay. Remembered across sessions. |

### Settings

Open `/config` and find **subway-narrator**:

| Setting        | Default           | Options                                                                                        |
| -------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| Narrator voice | `ash`             | `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`, `verse` |
| Speech model   | `gpt-4o-mini-tts` | `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`                                                         |

Only `gpt-4o-mini-tts` follows the upbeat narrator style. The other two read
in a flat voice.

You can also set them in `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "subway-narrator": { "options": { "voice": "nova" } }
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
OpenAI per input character at the model's rate. Long replies cost more. Mute
with `/subway-mute` to stop paying while keeping captions.

## Troubleshooting

| Symptom                                   | Cause and fix                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| No pane                                   | The terminal is too narrow (see Requirements). Widen it or run `/subway`.                     |
| Toast: "OpenAI voice plays on macOS only" | You're not on macOS. The system voice or captions take over.                                  |
| Toast: "OpenAI speech failed"             | The request failed. Check the key, your OpenAI quota, and network access to `api.openai.com`. |
| Toast: "no speech synthesizer here"       | No system voice either. You get captions only.                                                |
| Nothing happens at all                    | Start with `claude --debug` and look for lines starting with `subway-narrator:`.              |

## Develop

Claude Code watches a `--plugin-dir` folder in an interactive session, so
saving a file in `hooks/` reloads the mod without restarting.

```sh
pnpm -F @repo/subway-narrator test       # runner and narration unit tests
pnpm -F @repo/subway-narrator typecheck  # pure modules + tests, then the hooks against vendor/claude-code.d.ts
pnpm -F @repo/subway-narrator validate   # what Claude Code will load
```

`vendor/claude-code.d.ts` is a copy of Claude Code's generated API types.
After a Claude Code update, replace it with the copy Claude Code writes to
`.claude-plugin/types/claude-code/index.d.ts` when it loads the mod.

| File                         | Role                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `hooks/register.tsx`         | The hooks: pane, commands, narration queue, speech, frame loop |
| `hooks/game.ts`              | Runner simulation, autopilot and drawing                       |
| `hooks/narrate.ts`           | Markdown to sentences, and the OpenAI request                  |
| `.claude-plugin/plugin.json` | Manifest and the `/config` options                             |
