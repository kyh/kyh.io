# autoplay

Your feeds as TV channels of AI-generated video.

Visit the site and CH 01 is already playing: the owner's X feed, rendered as
short clips by fal.ai
([`minimax/h3-max/text-to-video`](https://fal.ai/models/minimax/h3-max/text-to-video)
by default — ten to thirty seconds for a 15s 768p clip, so generation runs a
program ahead of what is airing). Sign in with X and every source you connect
is a channel of its own: your X, your newsletters (Gmail), a feed URL, your
YouTube subscriptions. `ch−`/`ch+` tune through the lineup; the guide lines up
any program that has aired to play next. The UI is a television: full-bleed
video, static between programs, an on-screen display that fades away.

## Channels (src/lib/lineup.ts)

CH 01 is the public channel: the env-configured owner's X, playable by anyone.
Every other channel is a `source` row belonging to the signed-in user, in
`position` order. Sources with a grant behind them are created from the grant
the next time the session loads — signing in with X adds your X (unless you
are the owner, whose X is CH 01 already), linking Google with the Gmail scope
adds Newsletters, with the YouTube scope adds YouTube — and a feed URL is added
by hand in the sources dialog. Removing a channel keeps its clips archived.

Each kind has one adapter in `src/lib/sources/` that answers "what airs
next?": X ranks by engagement (trends, then the timeline), Gmail airs the
newest newsletter (mail with `List-Id`/`List-Unsubscribe` headers, unread
first), RSS the newest entry, YouTube the most-viewed upload of the week from
subscribed channels. Adding a kind is a new adapter and a new entry in
`SOURCE_KINDS`.

## Programming rules (src/lib/channel.ts)

1. **Lazy** — a new clip is generated only while someone whose source it is
   watches: the owner on CH 01, you on your own channels. Anonymous visitors
   and idle hours replay the archive instead of spending money. Even then
   generation runs a program ahead: a request queues the next clip and airs a
   rerun meanwhile.
2. **Best first** — the source's adapter picks the un-aired item most worth a
   video. On X that is what the account's corner of X is talking about:
   personalized trends (cached an hour, cycled one per program so consecutive
   clips aren't all the same story) seed a search filtered on `min_likes`
   server-side, and the best un-aired result airs. Trends need the _viewer_ to
   have X Premium; without it the channel falls back to the home timeline,
   ranked by engagement (retweets/quotes ×3, replies ×2, likes ×1) and
   paginated deeper until something clears `MIN_SCORE`.
3. **Never twice** — every clip is archived by item id and rerun forever; an
   item is paid for at most once, even across channels. Daily caps and
   generation spacing back this up.

## What it costs to run

Two meters run at once, and only the fal one has a cap in code.

**X** bills per post returned. The trend path costs ~$0.06 per program: one
trends call ($0.010 per request, cached an hour) plus one search returning 10
posts at $0.005 each. The timeline fallback is dearer — 50 posts a page, so
~$0.25, held an hour by `FEED_CACHE_TTL_MS` and up to three pages when the
scheduler has to paginate. Nothing in code caps X spend, so set a spending
limit at [console.x.com](https://console.x.com); there is no free tier, and a
$0 balance returns 402 on the first call, sign-in included.

**fal** bills per generated video, bounded by `MAX_CLIPS_PER_DAY` (100),
`MIN_MS_BETWEEN_GENERATIONS` (8s), and one generation in flight per channel:
the `pending_job` row is claimed before fal is paid, so overlapping requests
for the same channel submit at most one job between them.

**Locally, a channel stops at `DEV_MAX_PLAYABLE_CLIPS` (5) and reruns from
there**, so working on the UI does not mint a paid clip every fifteen seconds.
It counts clips still in rotation, not everything ever made: archive one in the
guide and the next request fills the slot, which is the loop you want when
tuning prompts. Production is unaffected.

## Setup

```sh
cp .env.example .env   # then fill in the keys — each is documented inline
pnpm dev:autoplay      # → http://localhost:3005
```

1. **X OAuth app** — [console.x.com](https://console.x.com), callback
   `http://127.0.0.1:3005/api/auth/callback/twitter` (X rejects `localhost`).
   Use the **OAuth 2.0** Client ID and Secret from User authentication
   settings, not the OAuth 1.0a keys shown when the app is created. The API is
   pay-per-use with no free tier — buy credits and set a spending cap first.
2. **`OWNER_X_USERNAME`** — the handle whose feed is CH 01.
3. **fal key** — [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys); billed per video.
4. **Turso** — autoplay's own database (not policingice's): `turso db create autoplay`,
   fill in the URL + token, then `pnpm -F @repo/autoplay db:push` once to create the
   tables. Skippable in local dev: the archive then lives in server memory only.
5. **Session secret** — `openssl rand -base64 32`.
6. **Google OAuth app** (optional, for Newsletters and YouTube) —
   [console.cloud.google.com](https://console.cloud.google.com/apis/credentials),
   web application, redirect `http://127.0.0.1:3005/api/auth/callback/google`;
   enable the Gmail API and YouTube Data API v3. `gmail.readonly` is a
   restricted scope: a public app needs Google's verification, a personal
   deploy can stay in Testing mode with the owner as a test user. Without the
   keys the sources dialog says so and the rest works.

The app boots with none of these and shows an OFF AIR screen listing what's missing.

## How it works

- **Auth**: better-auth (`src/lib/auth.ts`) with the X social provider, same
  stack as policingice. Users, sessions, and OAuth tokens live in the Turso
  database; `src/lib/x-account.ts` reads the X grant back for timeline calls
  and refreshes it when expired, `src/lib/grants.ts` does the same for Google
  through better-auth. Google is never a sign-in, only a grant linked to the
  X-signed-in user (`linkSocial` with the scope a source needs). The X handle
  is mapped onto the user at sign-in for the owner check.
- **Channel** (`POST /api/channel` with a `sourceId`): decides the next
  program. A viewer who may generate (their own source) has the next clip
  queued and gets a rerun back at once; the clip is harvested and aired by a
  later request, so generation runs a program ahead and nothing waits on fal
  except a channel's first-ever program. Anyone else gets a rerun from the
  archive, or OFF AIR. `GET /api/session` returns the viewer's lineup;
  `/api/sources` adds a feed, removes a channel, or reorders them.
- **Archive** (`src/db/drizzle-schema.ts`): Drizzle + Turso, same stack as
  policingice but a dedicated database. Four tables: `clip` (one row per item
  ever generated, keyed `{kind}:{id}`), `channel_clip` (which clips air on
  which channel), `pending_job` (each channel's one in-flight generation),
  `source` (a user's connected feeds). The daily cap and generation spacing
  are derived from `clip.generatedAt` — no counters. Degrades to in-memory
  maps when `TURSO_DATABASE_URL` is unset.
- **TV** (`src/components/tv.tsx`): one clip playing, one buffered ahead,
  requested only while the tab is visible — the client's laziness is what
  makes the whole pipeline lazy.
