# subway-narrator

A Claude Code mod: while Claude works, a pane plays a self-running Subway
Surfers-style endless runner and an OpenAI voice reads Claude's replies aloud,
captioned underneath.

## Run

```sh
export OPENAI_API_KEY=sk-...          # or set it in /config → subway-narrator
pnpm dev:subway-narrator              # claude --plugin-dir apps/subway-narrator
```

Or load it into any session: `claude --plugin-dir /path/to/apps/subway-narrator`.

- `/subway` opens the pane. It opens by itself only when the terminal is at
  least 144 columns wide.
- `/subway-mute` turns the voice off and keeps the captions.
- `/config` sets the voice (`ash` by default) and the model
  (`gpt-4o-mini-tts`, the only one that follows the narrator style).

## How it speaks

Each reply is stripped of markdown and code, then split into sentences. Each
sentence is one `POST /v1/audio/speech` request, sent through `curl`; the next
two are fetched while the current one plays. Without a key, or when a request
fails, it switches to the system voice (`say` on macOS), and without that to
captions only. A new prompt drops whatever has not been read yet.

Audio plays through `afplay`, so you only hear it on macOS. Elsewhere you get
the captions.

## Check

```sh
pnpm -F @repo/subway-narrator test              # game + narration units
pnpm -F @repo/subway-narrator typecheck         # pure modules and tests
pnpm -F @repo/subway-narrator validate          # what the engine will load
pnpm -F @repo/subway-narrator typecheck:plugin  # hooks, after one load lays .claude-plugin/types
```
