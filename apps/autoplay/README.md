# autoplay

An X feed as a TV channel of AI-generated video.

Visit the site and CH 01 is already playing: the owner's feed, rendered as
short clips by fal.ai
([`minimax/h3-max/text-to-video`](https://fal.ai/models/minimax/h3-max/text-to-video)
by default — ten to thirty seconds for a 15s 768p clip, so generation runs a
program ahead of what is airing).
Sign in with X and CH 02 becomes your own feed. The UI is a television:
full-bleed video, static between programs, an on-screen display that fades
away.

## Programming rules (src/lib/channel.ts)

1. **Lazy** — a new clip is generated only while someone whose feed it is
   watches: the owner on CH 01, you on CH 02. Anonymous visitors and idle
   hours replay the archive instead of spending money.
2. **Popular first** — programs come from what the owner's corner of X is
   talking about. Personalized trends (cached an hour, cycled one per program
   so consecutive clips aren't all the same story) seed a search filtered on
   `min_likes` server-side, and the best un-aired result airs. Trends need the
   _viewer_ to have X Premium; without it the channel falls back to the home
   timeline, ranked by engagement (retweets/quotes ×3, replies ×2, likes ×1)
   and paginated deeper until something clears `MIN_SCORE`.
3. **Never twice** — every clip is archived by post id and rerun
   forever; a post is paid for at most once. Daily caps and generation
   spacing back this up.

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

The app boots with none of these and shows an OFF AIR screen listing what's missing.

## How it works

- **Auth**: better-auth (`src/lib/auth.ts`) with the X social provider, same
  stack as policingice. Users, sessions, and the X OAuth tokens live in the
  Turso database; `src/lib/x-account.ts` reads the grant back for timeline
  calls and refreshes it when expired. The X handle is mapped onto the user
  at sign-in for the owner check.
- **Channel** (`POST /api/channel`): decides the next program. A viewer who
  may generate (their own feed) has the next clip queued and gets a rerun back
  at once; the clip is harvested and aired by a later request, so generation
  runs a program ahead and nothing waits on fal except a channel's first-ever
  program. Anyone else gets a rerun from the archive, or OFF AIR.
- **Archive** (`src/db/drizzle-schema.ts`): Drizzle + Turso, same stack as
  policingice but a dedicated database. Three tables: `clip` (one row per
  post ever generated), `channel_clip` (which clips air on which channel),
  `pending_job` (each channel's one in-flight generation). The daily cap and
  generation spacing are derived from `clip.generatedAt` — no counters.
  Degrades to in-memory maps when `TURSO_DATABASE_URL` is unset.
- **TV** (`src/components/tv.tsx`): one clip playing, one buffered ahead,
  requested only while the tab is visible — the client's laziness is what
  makes the whole pipeline lazy.
