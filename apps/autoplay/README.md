# autoplay

Your feeds as live TV channels of AI-generated video.

Sign in with X and every source you connect is a channel: your X, your
newsletters (Gmail), a feed URL, your YouTube subscriptions. Tune to one and a
[MiniMax H3 Max Director](https://fal.ai/models/minimax/h3-max/director)
session opens in your browser — continuous video over WebRTC that keeps its
characters and setting while the programming feeds it a new prompt every
program. CH 01 is the owner's X, live while the owner watches; everyone else
gets its replay. `ch−`/`ch+` tune through the lineup. The UI is a television:
full-bleed video, static while it tunes, a status bar with the program on air.

## Channels (src/lib/lineup.ts)

CH 01 is the public channel: the env-configured owner's X. Every other channel
is a `source` row belonging to the signed-in user, in `position` order.
Sources with a grant behind them are created from the grant the next time the
session loads — signing in with X adds your X (unless you are the owner, whose
X is CH 01 already), linking Google with the Gmail scope adds Newsletters,
with the YouTube scope adds YouTube — and a feed URL is added by hand in the
sources dialog.

Each kind has one adapter in `src/lib/sources/` that answers "what airs
next?": X ranks by engagement (personalized trends, then the timeline), Gmail
airs the newest newsletter (mail with `List-Id`/`List-Unsubscribe` headers,
unread first), RSS the newest entry, YouTube the most-viewed upload of the
week from subscribed channels. Adding a kind is a new adapter and a new entry
in `SOURCE_KINDS`.

## Programming rules (src/lib/live.ts, src/lib/prompt.ts)

A session opens on a **world** — one of the channel formats in `FORMATS`
(a 1994 sitcom, a satirical news network, a music-video channel, a pirate TV
network, an anime news network), one per UTC day for every session — and the
model keeps it in memory so characters, sets and running jokes persist.
Every program after that is a **segment** of that world about the next
item. Prompts are paced off the picture: the model reports each chunk with
the prompt it was made under and how far ahead of the screen it is, so the
browser knows when a subject actually appears; it holds it ten seconds
(`HOLD_SECONDS`) and then sends the next, which the model takes up at its
next ten-second chunk — fifteen to twenty seconds a subject.
While the owner watches CH 01, the browser also **records** the session as
one continuous stream (`src/lib/recorder.ts`: a single MediaRecorder, handed
to Vercel Blob ten seconds at a time) and that is the **replay** everyone
else sees — and the owner too, once the day's budget is spent. The newest six
sessions are kept, however old (`src/lib/recordings.ts`), so the channel has
something to show for as long as its owner is away. Which item:

1. **Best first** — the source's adapter picks the un-aired item most worth
   airing. On X: personalized trends (cached an hour, cycled one per program
   so consecutive programs aren't all the same story) seed a search filtered
   on `min_likes` server-side, itself cached an hour; without Premium the
   channel falls back to the home timeline ranked by engagement above
   `MIN_SCORE`.
2. **Never twice** — an item is marked aired the moment it is handed to a
   session, in `aired_item`, and never comes back.
3. **Budgeted** — the session is the meter. Two daily caps are derived from
   `aired_item`: `MAX_PROGRAMS_PER_DAY` (150 programs ≈ 45 min of stream) for
   the station, and `MAX_PROGRAMS_PER_USER_PER_DAY` (50 ≈ 15 min) for each
   signed-in viewer on their own channels. The owner's CH 01 counts against
   the station's only. Both are checked before a session is negotiated.

## What it costs to run

**fal** bills the director session per second of video — $0.08/s at list
price ($0.02/s promotional until Sep 14 2026), with a 60-second minimum per
session. A watching viewer is ~$4.80 a minute at list; the caps above bound a
day at about $144. The client closes a session 30s after the tab is hidden or
the viewer pauses, so channel-surfing and idle tabs don't run the meter, but
every reopen is another 60-second minimum.

**X** bills per post returned. The trend path costs ~$0.06 per program: one
trends call ($0.010, cached an hour) plus one search returning 10 posts at
$0.005 each. The timeline fallback is dearer — 50 posts a page, ~$0.25, held
an hour by `FEED_CACHE_TTL_MS` and up to three pages when the picker has to
paginate. Nothing in code caps X spend, so set a spending limit at
[console.x.com](https://console.x.com); there is no free tier, and a $0
balance returns 402 on the first call, sign-in included.

Gmail and YouTube reads are free within Google's quotas; RSS is free.

## Setup

```sh
cp .env.example .env   # then fill in the keys — each is documented inline
pnpm dev:autoplay      # → http://127.0.0.1:3005
```

1. **X OAuth app** — [console.x.com](https://console.x.com), callback
   `http://127.0.0.1:3005/api/auth/callback/twitter` (X rejects `localhost`).
   Use the **OAuth 2.0** Client ID and Secret from User authentication
   settings, not the OAuth 1.0a keys shown when the app is created. The API is
   pay-per-use with no free tier — buy credits and set a spending cap first.
2. **`OWNER_X_USERNAME`** — the handle whose feed is CH 01.
3. **fal key** — [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys); billed per session second.
4. **Turso** — autoplay's own database (not policingice's): `turso db create autoplay`,
   fill in the URL + token, then `pnpm -F @repo/autoplay db:push` once to create the
   tables. Skippable in local dev: aired items then live in server memory only,
   but sign-in needs the database.
5. **Session secret** — `openssl rand -base64 32`.
6. **Vercel Blob** (optional, for the replay) — a store connected to the
   project puts `BLOB_READ_WRITE_TOKEN` in the environment; without it CH 01
   is live for the owner and off air for everyone else.
7. **Google OAuth app** (optional, for Newsletters and YouTube) —
   [console.cloud.google.com](https://console.cloud.google.com/apis/credentials),
   web application, redirect `http://127.0.0.1:3005/api/auth/callback/google`;
   enable the Gmail API and YouTube Data API v3. `gmail.readonly` is a
   restricted scope: a public app needs Google's verification, a personal
   deploy can stay in Testing mode with the owner as a test user. Without the
   keys the sources dialog says so and the rest works.

The app boots with none of these and shows an OFF AIR screen listing what's missing.

## Testing

`pnpm test` covers the pure parts. The station itself is checked end to end
with [agent-browser](https://github.com/vercel-labs/agent-browser) against a
running deployment — **this opens one real director session as the owner,
about 75 seconds, billed at fal's 60-second minimum**:

```sh
pnpm with-env node e2e/owner-cookie.mjs > /tmp/owner-cookie   # signs the owner's live session
BASE_URL=https://autoplay.kyh.io OWNER_COOKIE=/tmp/owner-cookie zsh e2e/station.sh
```

It checks the guards (the proxy and the live and recording routes refuse
what they should), an anonymous visitor's view before and after, the owner
going live and recording, the sources dialog adding and removing a feed, and
the replay playing from the store. The owner has to have signed in on the
site at least once for a session to sign. Don't copy the owner's X grant into
another database to test with: X rotates the refresh token on every refresh,
and whichever copy refreshes first invalidates the other.

## How it works

- **Auth**: better-auth (`src/lib/auth.ts`) with the X social provider, same
  stack as policingice. Users, sessions, and OAuth tokens live in the Turso
  database; `src/lib/x-account.ts` reads the X grant back for API calls and
  refreshes it when expired, `src/lib/grants.ts` does the same for Google
  through better-auth. Google is never a sign-in, only a grant linked to the
  X-signed-in user (`linkSocial` with the scope a source needs). The X handle
  is mapped onto the user at sign-in for the owner check.
- **Session** (`src/components/live-screen.tsx`): the browser opens the
  director session through `/api/fal/proxy` (`@fal-ai/server-proxy`, which
  holds `FAL_KEY`, admits only signed-in viewers inside their budget, and
  allows only the director endpoint), configures it with the world and the
  first segment, and paces every prompt after that off the picture: ten
  seconds after a subject reaches the screen, the next goes out. The ticker
  changes when the picture does, not when the chunk lands in the buffer.
- **Programming** (`POST /api/live`): resolves the channel for this viewer,
  picks the next item through its adapter, marks it aired, returns the prompt
  (`src/lib/prompt.ts` turns an item into a single continuous shot). `GET
/api/session` returns the viewer's lineup; `/api/sources` adds a feed,
  removes a channel, or reorders them.
- **Replay and the live tail** (`src/components/replay-screen.tsx`):
  `GET /api/replay` lists a channel's recorded sessions, newest first, each as
  its chunks in order; the player appends a session's chunks into one
  MediaSource stream, so what plays is exactly the stream that was on air,
  and moves to the next session when it ends. A session still receiving
  chunks is the owner watching right now: the player joins it near the end
  and keeps appending as chunks land, so everyone watches the one session
  the owner is paying for, twenty seconds or so behind, with the LIVE badge. Needs a browser that plays WebM through MediaSource (Chrome, Edge,
  Firefox). The owner's browser uploads each chunk with a token minted by
  `POST /api/recordings/upload` (owner only, webm only, a chunk's worth of
  bytes) and registers it with `POST /api/recordings`.
- **Database** (`src/db/drizzle-schema.ts`): better-auth tables, `source` (a
  user's connected feeds), `aired_item` (what aired where, by whom, when),
  `recording` (the replay's chunks). Degrades to in-memory maps when
  `TURSO_DATABASE_URL` is unset.
