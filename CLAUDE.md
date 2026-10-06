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
pnpm test          # run tests (apps/autoplay, apps/vis-ml, apps/policingice, apps/kyh, apps/mod-surfer, apps/mod-dev)
```

## Agent-driven development

`AGENTS.md` is the full workflow — read it first. The essentials:

- **Setup**: `pnpm install`, then `pnpm dev:<app>`. No bootstrap script, no Docker. `pnpm dev:kyh` and `pnpm dev:policingice` both bind :3000, so run one at a time.
- **Verify**: `pnpm verify` for the static gate (`verify:ci` adds the apps/party build CI runs); drive a running app with `agent-browser` for runtime checks. `apps/kyh` is the safest browser surface (no DB, no auth, no required keys); `apps/cli` and `apps/party` get `typecheck` + `build` only.
- **`pnpm lint` is a clean gate.** `oxlint.config.ts` extends the ultracite presets (core, react, next, anti-slop); every rule is an error. Fix the code, don't add config overrides; a `// oxlint-disable-next-line rule -- why` needs a stated reason.
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

- `src/lib/kwadrant-context.tsx` - state management
- `src/components/canvas/` - Konva canvas components
- `src/components/ui/floating-island.tsx` - draggable toolbar

### cli (`apps/cli`)

Personal CLI tool.

### autoplay (`apps/autoplay`)

Your feeds as live TV channels of AI-generated video. CH 01 is the owner's X
(`OWNER_X_USERNAME`): live while the owner watches — and recorded to Vercel
Blob as it plays — which everyone else follows ~20s behind, or replays later.
Sign-up is invite-only: codes are `invite_code` rows, minted with `pnpm -F @repo/autoplay invite`.
Signing in with X gives a lineup of your own channels, one per connected
source: your X (unless you are the owner), Gmail newsletters, a feed URL,
YouTube subscriptions. A channel is a MiniMax H3 Max Director session
(`minimax/h3-max/director`) opened in the viewer's browser over WebRTC via
`/api/fal/proxy`, opened on one of the formats in `src/lib/prompt.ts` (sitcom, satirical news, pirate TV, anime news); the programming sends the next item ten seconds after the previous one reaches the screen.
Rules: best first (each kind's adapter ranks: X by engagement via personalized
trends then the home timeline above `MIN_SCORE`; mail and feeds by recency;
YouTube by views), never twice (`aired_item`), budgeted ($20 a day a viewer,
$50 the station, priced from `live_session` — the sessions and heartbeats the
proxy relays — and checked before a session is negotiated; X reads priced
into `source_read`, $10 a day the station, served between buys from
`source_cache`, which every instance shares).

**Stack**: Next.js, Tailwind v4, zod, Drizzle + Turso, better-auth (X social
provider for sign-in, Google linked for grants), Base UI dialogs,
`@fal-ai/client` realtime + `@fal-ai/server-proxy` — the policingice stack, on
autoplay's own database (its `db:push` is safe, unlike policingice's; sign-in
needs the DB, aired items fall back in-memory). Port 3005.

**Key files**:

- `src/lib/lineup.ts` - a viewer's channels: the public owner channel + their `source` rows; auto-creates sources from grants; resolves live vs replay
- `src/lib/live.ts` - programming: next item via the adapter, never-twice, daily budgets
- `src/lib/reads.ts` - the read cache every instance shares, and the ledger of paid X reads the read budget is counted from
- `src/lib/sources/` - one adapter per kind (`x`, `gmail`, `rss`, `youtube`); `types.ts` is the Item contract
- `src/components/live-screen.tsx` - the director session: opens via the proxy, paces prompts off the picture, closes when idle, records CH 01
- `src/lib/recorder.ts` / `src/lib/recordings.ts` / `src/components/replay-screen.tsx` - one webm per program to Blob; the replay loops the newest
- `src/app/api/fal/proxy/route.ts` - gated fal proxy (signed-in, within budget, director endpoint only); records the sessions and heartbeats it relays as the meter
- `src/db/drizzle-schema.ts` - better-auth tables + `invite_code` + `source` + `aired_item` + `live_session` + `recording` + `recording_file` + `source_cache` + `source_read`
- `src/lib/auth.ts` - better-auth config (X sign-in, Google as a linkable grant with per-source scopes)
- `src/lib/x-account.ts` / `src/lib/grants.ts` - read/refresh the X and Google grants
- `src/components/tv.tsx` - the TV chrome: ch−/ch+, static, status bar, sources dialog
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

Realtime trading chart game. Next.js, canvas-based candlestick rendering. Replays real S&P 500 daily history, one trading day per 5s grid cell. The CSV lives in Vercel Blob, served by `/api/spx` (seeds itself from Yahoo Finance on first request, reads Yahoo directly without a store) and refreshed by a weekday Vercel Cron hitting `/api/cron/spx`. `src/lib/spx-source.ts` fetches and stores it; `src/lib/price-engine.ts` synthesizes the intraday ticks; `src/lib/game-state.ts` keeps the grid in log-price rows.

### mod-surfer (`apps/mod-surfer`)

Claude Code mod (a plugin of function hooks, not a web app). Opens a pane with a
self-playing Subway Surfers-style runner drawn into a terminal `Raster`, and
reads Claude's replies aloud with OpenAI text-to-speech while a turn runs.
Load it with `pnpm dev:mod-surfer` (`claude --plugin-dir apps/mod-surfer`).

- Narration: `session.append` (main loop, `response` door) → `toSentences` →
  queue; each line is synthesized by `curl` to `/v1/audio/speech` (base64 on
  stdout, since the hooks sandbox reads process output as text) and played
  with `$.audio.play`; the next two lines prefetch. Falls back to the system
  voice (`$.audio.speak`), then captions only. Playback is macOS-only
  (`afplay`).
- Key: the `openaiApiKey` userConfig field (sensitive), else `OPENAI_API_KEY`.
  `voice` and `model` are pickers in `/config`; `mute` keeps captions without
  the voice. No slash commands: the pane opens on session start (drawn from
  144 columns).
- `pnpm typecheck` runs two configs: `tsconfig.json` (pure modules + node
  tests) and `tsconfig.plugin.json` (the hooks against
  `vendor/claude-code.d.ts`, the engine's API types pinned from the Claude Code
  version named on its first line). Refresh that file after a Claude Code
  update from the copy the engine lays in the gitignored
  `.claude-plugin/types/claude-code/index.d.ts` on load.

**Key files**: `hooks/register.tsx` (hooks, speech, frame loop), `hooks/game.ts`
(runner simulation + autopilot + drawing), `hooks/narrate.ts` (markdown → lines,
OpenAI request).

### mod-dev (`apps/mod-dev`)

Claude Code mod. `/score` grades the session's work before it merges:
confidence, idiomatic, simplicity and scope (0–10 each) and risk (low, medium,
high), then a verdict (ready, fix first, not ready) and up to three fixes.
Load it with `pnpm dev:mod-dev` (`claude --plugin-dir apps/mod-dev`).

- Evidence is mechanical: the session's tool calls (subagents' included) make a
  ledger of edits and checks. Bash commands are classified by what they run
  (`pnpm test`, `tsc`, `agent-browser`, `sed -i`, heredoc and inline-script
  writes); a check counts only if it passed after the last edit. The status
  line shows it live: `verified: static ✓ · test stale · e2e –`.
- The grader is one `$.model.complete` call with a fresh context, never the
  session's own reasoning: the person's prompts, Claude's last reply (as
  claims), the ledger, the diff against the default branch's merge base
  (uncommitted and untracked files included, via a copy of the index) and the
  CLAUDE.md, AGENTS.md and REVIEW.md files. It answers in fixed lines.
- Risk sets the bar for confidence (low 7, medium 8, high 9); the other scores
  need 7; any score of 4 or less is not ready. `claude -p --resume <id> "/score"`
  exits 0 only when ready.
- Tests: `test/*.spec.ts` run under node (`pnpm test`, CI); `test/*.test.ts`
  under `claude plugin test` (`test:mod`, local). That runner loads every
  `*.test.ts` in the mod, so the node tests can't share the suffix.

**Key files**: `hooks/register.ts` (hooks: `/score`, the status line),
`hooks/shell.ts` (command lines into commands and words), `hooks/commands.ts`
(what each command means), `hooks/evidence.ts` (the ledger, freshness),
`hooks/grade.ts`
(the rubric, the prompt, parsing the answer, the verdict, the scorecard),
`hooks/git.ts` (the diff script).

### tc, covid-19, vis-ml

Other project apps.

## Packages

Shared configs and utilities in `packages/`.
